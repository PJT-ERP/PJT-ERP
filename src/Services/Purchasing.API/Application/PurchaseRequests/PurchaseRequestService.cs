using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public sealed partial class PurchaseRequestService(PurchasingContext db, IEventPublisher eventPublisher) : IPurchaseRequestService
{
    public async Task<IReadOnlyCollection<PurchaseRequestDto>> ListAsync(
        Guid? salesOrderId,
        string? status,
        CancellationToken cancellationToken)
    {
        var query = IncludeItems(db.PurchaseRequests.AsNoTracking());
        if (salesOrderId.HasValue)
        {
            query = query.Where(request =>
                request.SalesOrderId == salesOrderId.Value
                || request.Items.Any(item => item.SalesOrderId == salesOrderId.Value));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(request => request.Status == status.Trim());
        }

        var requests = await query
            .OrderByDescending(request => request.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return requests.Select(ToDto).ToArray();
    }

    public async Task<PurchaseRequestDto?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var request = await IncludeItems(db.PurchaseRequests.AsNoTracking())
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return request is null ? null : ToDto(request);
    }

    public async Task<PurchaseRequestDto> CreateAsync(CreatePurchaseRequest request, CancellationToken cancellationToken)
    {
        ValidateCreateRequest(request);

        var materialRequirementIds = request.Items
            .Where(item => item.MaterialRequirementId.HasValue)
            .Select(item => item.MaterialRequirementId!.Value)
            .Distinct()
            .ToArray();

        var materialRequirements = materialRequirementIds.Length == 0
            ? new Dictionary<Guid, MaterialRequirement>()
            : await db.MaterialRequirements
                .Where(requirement => materialRequirementIds.Contains(requirement.Id))
                .ToDictionaryAsync(requirement => requirement.Id, cancellationToken);

        if (materialRequirements.Count != materialRequirementIds.Length)
        {
            throw new InvalidOperationException("One or more material requirements were not found.");
        }

        var firstRequirement = materialRequirements.Values.FirstOrDefault();
        var resolvedSalesOrderId = request.SalesOrderId ?? firstRequirement?.SalesOrderId;
        var resolvedSalesOrderNumber = NormalizeOptional(request.SalesOrderNumber) ?? firstRequirement?.SalesOrderNumber;
        
        var purchaseRequest = new PurchaseRequest
        {
            PrNumber = await GenerateNumberAsync(cancellationToken),
            RequestDate = request.RequestDate,
            RequestedByUserId = request.RequestedByUserId,
            RequesterName = request.RequesterName.Trim(),
            SalesOrderId = resolvedSalesOrderId,
            SalesOrderNumber = resolvedSalesOrderNumber,
            ProjectName = NormalizeOptional(request.ProjectName) ?? firstRequirement?.ProjectName,
            Status = request.RequireSupervisorApproval
                ? PurchaseRequestStatuses.Submitted
                : (resolvedSalesOrderId == null && string.IsNullOrWhiteSpace(resolvedSalesOrderNumber)
                    ? PurchaseRequestStatuses.SupervisorApproved
                    : PurchaseRequestStatuses.Submitted),
            Items = request.Items.Select(item =>
            {
                materialRequirements.TryGetValue(item.MaterialRequirementId ?? Guid.Empty, out var requirement);
                var purchaseItem = new PurchaseRequestItem
                {
                    MaterialRequirementId = item.MaterialRequirementId,
                    SalesOrderId = item.SalesOrderId ?? requirement?.SalesOrderId ?? request.SalesOrderId,
                    SalesOrderNumber = NormalizeOptional(item.SalesOrderNumber) ?? requirement?.SalesOrderNumber ?? NormalizeOptional(request.SalesOrderNumber),
                    ProductionOrderId = requirement?.ProductionOrderId,
                    SpkNumber = requirement?.SpkNumber,
                    ProjectName = NormalizeOptional(item.ProjectName) ?? requirement?.ProjectName ?? NormalizeOptional(request.ProjectName),
                    ItemName = ResolveItemName(item, requirement),
                    Size = NormalizeOptional(item.Size) ?? requirement?.MaterialSpec,
                    Qty = item.Qty,
                    Urgency = NormalizeUrgency(item.Urgency),
                    PurchaseCategory = NormalizePurchaseCategory(item.PurchaseCategory, item.MaterialRequirementId, item.SalesOrderId ?? request.SalesOrderId, item.ItemName),
                    TotalPrice = NormalizePrice(item.TotalPrice, "Total price"),
                    SuggestedSupplier = NormalizeOptional(item.SuggestedSupplier),
                    Notes = NormalizeOptional(item.Notes),
                    PurchaseStatus = PurchaseItemStatuses.Requested
                };

                if (requirement is not null)
                {
                    requirement.Status = MaterialRequirementStatuses.PurchaseRequested;
                    requirement.UpdatedAtUtc = DateTime.UtcNow;
                }

                return purchaseItem;
            }).ToList()
        };

        await db.PurchaseRequests.AddAsync(purchaseRequest, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> UpdateAsync(
        Guid id,
        UpdatePurchaseRequest request,
        CancellationToken cancellationToken)
    {
        ValidateUpdateRequest(request);

        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (purchaseRequest.Status is not PurchaseRequestStatuses.Submitted
            and not PurchaseRequestStatuses.SupervisorRejected)
        {
            if (purchaseRequest.Status is not PurchaseRequestStatuses.FinanceRejected
                and not PurchaseRequestStatuses.Rejected)
            {
                throw new InvalidOperationException("Only submitted or rejected purchase requests can be edited.");
            }
        }

        var materialRequirementIds = request.Items
            .Where(item => item.MaterialRequirementId.HasValue)
            .Select(item => item.MaterialRequirementId!.Value)
            .Distinct()
            .ToArray();

        var materialRequirements = materialRequirementIds.Length == 0
            ? new Dictionary<Guid, MaterialRequirement>()
            : await db.MaterialRequirements
                .Where(requirement => materialRequirementIds.Contains(requirement.Id))
                .ToDictionaryAsync(requirement => requirement.Id, cancellationToken);

        if (materialRequirements.Count != materialRequirementIds.Length)
        {
            throw new InvalidOperationException("One or more material requirements were not found.");
        }

        var firstRequirement = materialRequirements.Values.FirstOrDefault();
        var now = DateTime.UtcNow;

        var oldItems = purchaseRequest.Items
            .OrderBy(item => item.CreatedAtUtc)
            .ThenBy(item => item.Id)
            .ToList();

        foreach (var oldItem in oldItems)
        {
            if (oldItem.MaterialRequirement is not null)
            {
                oldItem.MaterialRequirement.Status = MaterialRequirementStatuses.Required;
                oldItem.MaterialRequirement.UpdatedAtUtc = now;
            }
        }

        purchaseRequest.RequestDate = request.RequestDate;
        purchaseRequest.RequestedByUserId = request.RequestedByUserId;
        purchaseRequest.RequesterName = request.RequesterName.Trim();
        purchaseRequest.SalesOrderId = request.SalesOrderId ?? firstRequirement?.SalesOrderId;
        purchaseRequest.SalesOrderNumber = NormalizeOptional(request.SalesOrderNumber) ?? firstRequirement?.SalesOrderNumber;
        purchaseRequest.ProjectName = NormalizeOptional(request.ProjectName) ?? firstRequirement?.ProjectName;
        purchaseRequest.Status = purchaseRequest.SalesOrderId == null && string.IsNullOrWhiteSpace(purchaseRequest.SalesOrderNumber)
            ? PurchaseRequestStatuses.SupervisorApproved
            : PurchaseRequestStatuses.Submitted;
        purchaseRequest.ReviewedByUserId = null;
        purchaseRequest.ReviewedAtUtc = null;
        purchaseRequest.RejectionReason = null;
        purchaseRequest.SupervisorReviewedByUserId = null;
        purchaseRequest.SupervisorReviewedAtUtc = null;
        purchaseRequest.SupervisorRejectionReason = null;
        purchaseRequest.FinanceReviewedByUserId = null;
        purchaseRequest.FinanceReviewedAtUtc = null;
        purchaseRequest.FinanceRejectionReason = null;
        purchaseRequest.UpdatedAtUtc = now;

        var requestedItems = request.Items.ToArray();
        for (var index = 0; index < requestedItems.Length; index++)
        {
            var item = requestedItems[index];
            materialRequirements.TryGetValue(item.MaterialRequirementId ?? Guid.Empty, out var requirement);
            var purchaseItem = index < oldItems.Count
                ? oldItems[index]
                : new PurchaseRequestItem
                {
                    PurchaseRequestId = purchaseRequest.Id,
                    CreatedAtUtc = now
                };

            purchaseItem.MaterialRequirementId = item.MaterialRequirementId;
            purchaseItem.SalesOrderId = item.SalesOrderId ?? requirement?.SalesOrderId ?? request.SalesOrderId;
            purchaseItem.SalesOrderNumber = NormalizeOptional(item.SalesOrderNumber) ?? requirement?.SalesOrderNumber ?? NormalizeOptional(request.SalesOrderNumber);
            purchaseItem.ProductionOrderId = requirement?.ProductionOrderId;
            purchaseItem.SpkNumber = requirement?.SpkNumber;
            purchaseItem.ProjectName = NormalizeOptional(item.ProjectName) ?? requirement?.ProjectName ?? NormalizeOptional(request.ProjectName);
            purchaseItem.ItemName = ResolveItemName(item, requirement);
            purchaseItem.Size = NormalizeOptional(item.Size) ?? requirement?.MaterialSpec;
            purchaseItem.Qty = item.Qty;
            purchaseItem.Urgency = NormalizeUrgency(item.Urgency);
            purchaseItem.PurchaseCategory = NormalizePurchaseCategory(item.PurchaseCategory, item.MaterialRequirementId, item.SalesOrderId ?? request.SalesOrderId, item.ItemName);
            purchaseItem.SuggestedSupplier = NormalizeOptional(item.SuggestedSupplier);
            purchaseItem.SupplierName = null;
            purchaseItem.PoNumber = null;
            purchaseItem.EstimatedPrice = null;
            purchaseItem.TotalPrice = NormalizePrice(item.TotalPrice, "Total price");
            purchaseItem.PurchaseDate = null;
            purchaseItem.ExpectedArrivalDate = null;
            purchaseItem.ReceivedDate = null;
            purchaseItem.PurchaseStatus = PurchaseItemStatuses.Requested;
            purchaseItem.PurchaseNotes = null;
            purchaseItem.RejectionReason = null;
            purchaseItem.Notes = NormalizeOptional(item.Notes);
            purchaseItem.UpdatedAtUtc = now;

            if (requirement is not null)
            {
                requirement.Status = MaterialRequirementStatuses.PurchaseRequested;
                requirement.UpdatedAtUtc = now;
            }

            if (index >= oldItems.Count)
            {
                purchaseRequest.Items.Add(purchaseItem);
            }
        }

        if (oldItems.Count > requestedItems.Length)
        {
            db.PurchaseRequestItems.RemoveRange(oldItems.Skip(requestedItems.Length));
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> ReviewAsync(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        var reviewStage = NormalizeReviewStage(request.ReviewStage);
        var decision = NormalizeReviewDecision(request.Decision);
        if (decision == PurchaseRequestStatuses.Rejected
            && string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            throw new InvalidOperationException("Rejection reason is required when rejecting a purchase request.");
        }

        var now = DateTime.UtcNow;
        if (reviewStage == PurchaseRequestReviewStages.Supervisor)
        {
            ApplySupervisorReview(purchaseRequest, request, decision, now);
        }
        else
        {
            ApplyFinanceReview(purchaseRequest, request, decision, now);
        }

        purchaseRequest.ReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.ReviewedAtUtc = now;
        purchaseRequest.UpdatedAtUtc = now;

        await eventPublisher.PublishAsync(
            new PurchaseRequestReviewedEvent(purchaseRequest.Id, purchaseRequest.PrNumber, purchaseRequest.Status, now),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> UpdatePurchaseItemInfoAsync(
        Guid purchaseRequestId,
        Guid itemId,
        UpdatePurchaseItemInfoRequest request,
        CancellationToken cancellationToken)
    {
        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == purchaseRequestId, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        var purchaseItem = purchaseRequest.Items.FirstOrDefault(item => item.Id == itemId)
            ?? throw new InvalidOperationException("Purchase request item was not found.");
        var purchaseStatus = string.IsNullOrWhiteSpace(request.PurchaseStatus)
            && !request.PurchaseDate.HasValue
            && !request.ReceivedDate.HasValue
                ? (purchaseItem.PurchaseStatus == PurchaseItemStatuses.Rejected ? PurchaseItemStatuses.Requested : purchaseItem.PurchaseStatus)
                : NormalizePurchaseStatus(request.PurchaseStatus, request.PurchaseDate, request.ReceivedDate);
        ValidateEstimatedPrice(request.EstimatedPrice);
        var requestedTotalPrice = NormalizePrice(request.TotalPrice ?? request.EstimatedPrice, "Total price");
        var requestedSupplier = NormalizeOptional(request.SupplierName);
        var effectiveSupplier = requestedSupplier ?? purchaseItem.SupplierName;
        var effectivePurchaseDate = request.PurchaseDate ?? purchaseItem.PurchaseDate;

        if (purchaseStatus is PurchaseItemStatuses.Ordered or PurchaseItemStatuses.Received)
        {
            if (string.IsNullOrWhiteSpace(effectiveSupplier))
            {
                throw new InvalidOperationException("Supplier name is required when recording ordered or received material.");
            }

            if (!effectivePurchaseDate.HasValue)
            {
                throw new InvalidOperationException("Purchase date is required when recording ordered or received material.");
            }
        }

        if (purchaseStatus == PurchaseItemStatuses.Received)
        {
            EnsurePurchaseRequestFinanceApprovedForReceiving(purchaseRequest);
        }

        if (request.Qty.HasValue && request.Qty.Value > 0)
        {
            purchaseItem.Qty = request.Qty.Value;
        }
        if (!string.IsNullOrWhiteSpace(request.ItemName))
        {
            purchaseItem.ItemName = request.ItemName.Trim();
        }

        purchaseItem.SupplierName = requestedSupplier ?? purchaseItem.SupplierName;
        purchaseItem.PoNumber = request.PoNumber is null ? purchaseItem.PoNumber : NormalizeOptional(request.PoNumber);
        purchaseItem.EstimatedPrice = request.EstimatedPrice ?? purchaseItem.EstimatedPrice;
        purchaseItem.TotalPrice = requestedTotalPrice ?? purchaseItem.TotalPrice;
        purchaseItem.PurchaseCategory = request.PurchaseCategory is null
            ? purchaseItem.PurchaseCategory
            : NormalizePurchaseCategory(request.PurchaseCategory, purchaseItem.MaterialRequirementId, purchaseItem.SalesOrderId, purchaseItem.ItemName);
        purchaseItem.PurchaseDate = effectivePurchaseDate;
        purchaseItem.ExpectedArrivalDate = request.ExpectedArrivalDate ?? purchaseItem.ExpectedArrivalDate;
        purchaseItem.ReceivedDate = request.ReceivedDate ?? purchaseItem.ReceivedDate;
        purchaseItem.PurchaseStatus = purchaseStatus;
        purchaseItem.PurchaseNotes = request.PurchaseNotes is null ? purchaseItem.PurchaseNotes : NormalizeOptional(request.PurchaseNotes);
        purchaseItem.RejectionReason = purchaseStatus == PurchaseItemStatuses.Rejected
            ? purchaseItem.PurchaseNotes
            : null;
        purchaseItem.UpdatedAtUtc = DateTime.UtcNow;
        purchaseRequest.UpdatedAtUtc = purchaseItem.UpdatedAtUtc;

        if (purchaseItem.MaterialRequirement is not null)
        {
            purchaseItem.MaterialRequirement.Status = purchaseStatus switch
            {
                PurchaseItemStatuses.Received => MaterialRequirementStatuses.Received,
                PurchaseItemStatuses.Ordered => MaterialRequirementStatuses.Ordered,
                PurchaseItemStatuses.Approved => MaterialRequirementStatuses.PurchaseApproved,
                PurchaseItemStatuses.Rejected => MaterialRequirementStatuses.PurchaseRejected,
                _ => MaterialRequirementStatuses.PurchaseRequested
            };
            purchaseItem.MaterialRequirement.UpdatedAtUtc = purchaseItem.UpdatedAtUtc;
        }

        if (purchaseRequest.Status is PurchaseRequestStatuses.Rejected
            or PurchaseRequestStatuses.FinanceRejected
            or PurchaseRequestStatuses.SupervisorRejected)
        {
            if (purchaseRequest.Status == PurchaseRequestStatuses.FinanceRejected)
            {
                purchaseRequest.FinanceReviewedAtUtc = null;
                purchaseRequest.FinanceReviewedByUserId = null;
                purchaseRequest.FinanceRejectionReason = null;
                purchaseRequest.RejectionReason = null;
                purchaseRequest.Status = PurchaseRequestStatuses.SupervisorApproved;
            }
            else
            {
                purchaseRequest.SupervisorReviewedAtUtc = null;
                purchaseRequest.SupervisorReviewedByUserId = null;
                purchaseRequest.FinanceReviewedAtUtc = null;
                purchaseRequest.FinanceReviewedByUserId = null;
            }
        }

        RefreshPurchaseRequestStatus(purchaseRequest);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> ProcessPurchaseItemAsync(
        Guid purchaseRequestId,
        Guid itemId,
        ProcessPurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SupplierName))
        {
            throw new InvalidOperationException("Supplier name is required when processing a purchase request item.");
        }

        ValidateEstimatedPrice(request.EstimatedPrice);
        var totalPrice = NormalizePrice(request.TotalPrice ?? request.EstimatedPrice, "Total price");

        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == purchaseRequestId, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (IsRejectedRequest(purchaseRequest.Status))
        {
            throw new InvalidOperationException("Rejected purchase requests cannot be processed.");
        }

        EnsurePurchaseRequestAcceptedForPurchasing(purchaseRequest, "be processed");

        var purchaseItem = FindPurchaseItem(purchaseRequest, itemId);
        if (purchaseItem.PurchaseStatus == PurchaseItemStatuses.Received)
        {
            throw new InvalidOperationException("Received purchase request items cannot be processed again.");
        }

        if (purchaseItem.PurchaseStatus == PurchaseItemStatuses.Rejected)
        {
            throw new InvalidOperationException("Rejected purchase request items cannot be processed.");
        }

        var now = DateTime.UtcNow;
        purchaseItem.SupplierName = request.SupplierName.Trim();
        purchaseItem.PoNumber = NormalizeOptional(request.PoNumber);
        purchaseItem.EstimatedPrice = request.EstimatedPrice;
        purchaseItem.TotalPrice = totalPrice;
        purchaseItem.PurchaseCategory = request.PurchaseCategory is null
            ? purchaseItem.PurchaseCategory
            : NormalizePurchaseCategory(request.PurchaseCategory, purchaseItem.MaterialRequirementId, purchaseItem.SalesOrderId, purchaseItem.ItemName);
        purchaseItem.PurchaseDate = DateOnly.FromDateTime(now);
        purchaseItem.ExpectedArrivalDate = request.ExpectedArrivalDate;
        purchaseItem.ReceivedDate = null;
        purchaseItem.PurchaseStatus = PurchaseItemStatuses.Ordered;
        purchaseItem.PurchaseNotes = NormalizeOptional(request.PurchaseNotes);
        purchaseItem.RejectionReason = null;
        purchaseItem.UpdatedAtUtc = now;
        purchaseRequest.UpdatedAtUtc = now;
        RefreshPurchaseRequestStatus(purchaseRequest);
        UpdateMaterialRequirementStatus(purchaseItem, MaterialRequirementStatuses.Ordered, now);

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> RejectPurchaseItemAsync(
        Guid purchaseRequestId,
        Guid itemId,
        RejectPurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == purchaseRequestId, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (IsRejectedRequest(purchaseRequest.Status)
            && purchaseRequest.Items.All(item => item.PurchaseStatus == PurchaseItemStatuses.Rejected))
        {
            throw new InvalidOperationException("Rejected purchase requests cannot be changed.");
        }

        EnsurePurchaseRequestAcceptedForPurchasing(purchaseRequest, "have items rejected by Purchasing");

        var purchaseItem = FindPurchaseItem(purchaseRequest, itemId);
        if (purchaseItem.PurchaseStatus == PurchaseItemStatuses.Received)
        {
            throw new InvalidOperationException("Received purchase request items cannot be rejected.");
        }

        var now = DateTime.UtcNow;
        purchaseItem.PurchaseStatus = PurchaseItemStatuses.Rejected;
        purchaseItem.RejectionReason = NormalizeOptional(request.RejectionReason);
        purchaseItem.PurchaseNotes = purchaseItem.RejectionReason ?? purchaseItem.PurchaseNotes;
        purchaseItem.UpdatedAtUtc = now;
        purchaseRequest.UpdatedAtUtc = now;
        RefreshPurchaseRequestStatus(purchaseRequest);
        UpdateMaterialRequirementStatus(purchaseItem, MaterialRequirementStatuses.PurchaseRejected, now);

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> ReceivePurchaseItemAsync(
        Guid purchaseRequestId,
        Guid itemId,
        ReceivePurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == purchaseRequestId, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (IsRejectedRequest(purchaseRequest.Status))
        {
            throw new InvalidOperationException("Rejected purchase requests cannot receive material.");
        }

        EnsurePurchaseRequestAcceptedForPurchasing(purchaseRequest, "receive material");
        EnsurePurchaseRequestFinanceApprovedForReceiving(purchaseRequest);

        var purchaseItem = FindPurchaseItem(purchaseRequest, itemId);
        if (purchaseItem.PurchaseStatus == PurchaseItemStatuses.Rejected)
        {
            throw new InvalidOperationException("Rejected purchase request items cannot receive material.");
        }

        if (string.IsNullOrWhiteSpace(purchaseItem.SupplierName) || !purchaseItem.PurchaseDate.HasValue)
        {
            throw new InvalidOperationException("Purchase request item must be processed before it can be received.");
        }

        var now = DateTime.UtcNow;
        var newNotes = NormalizeOptional(request.PurchaseNotes) ?? purchaseItem.PurchaseNotes;
        
        var totalParsedFromNotes = newNotes?
            .Split('|', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => p.StartsWith("RCV:"))
            .Sum(p => int.TryParse(p.Replace("RCV:", "").Trim(), out var rcv) ? rcv : 0) ?? 0;

        var totalReceived = Math.Max(totalParsedFromNotes, request.ReceivedQty ?? 0);

        purchaseItem.ReceivedDate = request.ReceivedDate;
        purchaseItem.PurchaseNotes = newNotes;
        purchaseItem.RejectionReason = null;
        purchaseItem.UpdatedAtUtc = now;
        
        if (totalReceived >= purchaseItem.Qty || ((request.ReceivedQty ?? 0) >= purchaseItem.Qty && string.IsNullOrWhiteSpace(newNotes)))
        {
            purchaseItem.PurchaseStatus = PurchaseItemStatuses.Received;
            UpdateMaterialRequirementStatus(purchaseItem, MaterialRequirementStatuses.Received, now);
        }
        else
        {
            purchaseItem.PurchaseStatus = PurchaseItemStatuses.Ordered;
            UpdateMaterialRequirementStatus(purchaseItem, MaterialRequirementStatuses.Ordered, now);
        }

        purchaseRequest.UpdatedAtUtc = now;
        RefreshPurchaseRequestStatus(purchaseRequest);

        await eventPublisher.PublishAsync(
            new PurchaseItemReceivedEvent(
                purchaseRequest.Id,
                purchaseRequest.PrNumber,
                purchaseItem.Id,
                purchaseItem.ItemName,
                request.ReceivedQty ?? purchaseItem.Qty,
                request.ReceivedDate,
                purchaseItem.PurchaseCategory),
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<IReadOnlyCollection<MaterialRequirementDto>> ListMaterialRequirementsAsync(
        Guid? salesOrderId,
        string? status,
        CancellationToken cancellationToken)
    {
        var query = IncludePurchaseItems(db.MaterialRequirements.AsNoTracking());
        if (salesOrderId.HasValue)
        {
            query = query.Where(requirement => requirement.SalesOrderId == salesOrderId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(requirement => requirement.Status == status.Trim());
        }

        var requirements = await query
            .OrderByDescending(requirement => requirement.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return requirements.Select(ToDto).ToArray();
    }

    public async Task<MaterialRequirementDto?> UpdateMaterialRequirementStockAsync(
        Guid materialRequirementId,
        UpdateMaterialStockInfoRequest request,
        CancellationToken cancellationToken)
    {
        if (request.StockOnHand < 0)
        {
            throw new InvalidOperationException("Stock on hand cannot be negative.");
        }

        var requirement = await IncludePurchaseItems(db.MaterialRequirements)
            .FirstOrDefaultAsync(item => item.Id == materialRequirementId, cancellationToken);

        if (requirement is null)
        {
            return null;
        }

        requirement.StockOnHand = request.StockOnHand;
        requirement.StockNotes = NormalizeOptional(request.StockNotes);
        requirement.StockUpdatedAtUtc = DateTime.UtcNow;
        requirement.UpdatedAtUtc = requirement.StockUpdatedAtUtc.Value;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(requirement);
    }

    public async Task<SalesOrderMaterialTrackingDto?> GetSalesOrderMaterialTrackingAsync(
        Guid salesOrderId,
        CancellationToken cancellationToken)
    {
        var snapshot = await db.SalesOrderSnapshots
            .AsNoTracking()
            .FirstOrDefaultAsync(order => order.SalesOrderId == salesOrderId, cancellationToken);

        var requirements = await IncludePurchaseItems(db.MaterialRequirements.AsNoTracking())
            .Where(requirement => requirement.SalesOrderId == salesOrderId)
            .OrderBy(requirement => requirement.ProductPartNumber)
            .ToListAsync(cancellationToken);

        if (snapshot is null && requirements.Count == 0)
        {
            return null;
        }

        var salesOrderNumber = snapshot?.SalesOrderNumber
            ?? requirements.FirstOrDefault()?.SalesOrderNumber
            ?? "";
        var updatedAtUtc = requirements.Count == 0
            ? snapshot?.UpdatedAtUtc ?? DateTime.UtcNow
            : requirements.Max(requirement => requirement.UpdatedAtUtc);
        var received = requirements.Count(requirement => requirement.Status == MaterialRequirementStatuses.Received);
        var receivedPercent = requirements.Count == 0
            ? 0
            : decimal.Round((decimal)received / requirements.Count * 100, 2);

        return new SalesOrderMaterialTrackingDto(
            salesOrderId,
            salesOrderNumber,
            requirements.Count,
            requirements.Count(requirement => requirement.Status == MaterialRequirementStatuses.Required),
            requirements.Count(requirement => requirement.Status == MaterialRequirementStatuses.PurchaseRequested),
            requirements.Count(requirement => requirement.Status == MaterialRequirementStatuses.PurchaseApproved),
            requirements.Count(requirement => requirement.Status == MaterialRequirementStatuses.Ordered),
            received,
            receivedPercent,
            updatedAtUtc,
            requirements.Select(ToDto).ToArray());
    }

    public async Task<string> PreviewNextPoNumberAsync(CancellationToken cancellationToken)
    {
        var existing = await db.PurchaseRequestItems
            .Where(item => item.PoNumber != null && item.PoNumber!.StartsWith("PO-"))
            .Select(item => item.PoNumber!)
            .ToListAsync(cancellationToken);
        return $"PO-{NextSequence(existing, "PO-"):000}";
    }
}
