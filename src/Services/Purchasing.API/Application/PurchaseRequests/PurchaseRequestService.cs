using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public sealed class PurchaseRequestService(PurchasingContext db, IEventPublisher eventPublisher) : IPurchaseRequestService
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
        var purchaseRequest = new PurchaseRequest
        {
            PrNumber = await GenerateNumberAsync(cancellationToken),
            RequestDate = request.RequestDate,
            RequestedByUserId = request.RequestedByUserId,
            RequesterName = request.RequesterName.Trim(),
            SalesOrderId = request.SalesOrderId ?? firstRequirement?.SalesOrderId,
            SalesOrderNumber = NormalizeOptional(request.SalesOrderNumber) ?? firstRequirement?.SalesOrderNumber,
            ProjectName = NormalizeOptional(request.ProjectName) ?? firstRequirement?.ProjectName,
            Status = PurchaseRequestStatuses.Submitted,
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
                    PurchaseCategory = NormalizePurchaseCategory(item.PurchaseCategory, item.MaterialRequirementId, item.SalesOrderId ?? request.SalesOrderId),
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
        purchaseRequest.Status = PurchaseRequestStatuses.Submitted;
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
            purchaseItem.PurchaseCategory = NormalizePurchaseCategory(item.PurchaseCategory, item.MaterialRequirementId, item.SalesOrderId ?? request.SalesOrderId);
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

        if (IsRejectedRequest(purchaseRequest.Status))
        {
            throw new InvalidOperationException("Rejected purchase requests cannot receive purchase information.");
        }

        EnsurePurchaseRequestAcceptedForPurchasing(purchaseRequest, "receive purchase information");

        var purchaseItem = purchaseRequest.Items.FirstOrDefault(item => item.Id == itemId)
            ?? throw new InvalidOperationException("Purchase request item was not found.");
        var purchaseStatus = string.IsNullOrWhiteSpace(request.PurchaseStatus)
            && !request.PurchaseDate.HasValue
            && !request.ReceivedDate.HasValue
                ? purchaseItem.PurchaseStatus
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

        purchaseItem.SupplierName = requestedSupplier ?? purchaseItem.SupplierName;
        purchaseItem.PoNumber = request.PoNumber is null ? purchaseItem.PoNumber : NormalizeOptional(request.PoNumber);
        purchaseItem.EstimatedPrice = request.EstimatedPrice ?? purchaseItem.EstimatedPrice;
        purchaseItem.TotalPrice = requestedTotalPrice ?? purchaseItem.TotalPrice;
        purchaseItem.PurchaseCategory = request.PurchaseCategory is null
            ? purchaseItem.PurchaseCategory
            : NormalizePurchaseCategory(request.PurchaseCategory, purchaseItem.MaterialRequirementId, purchaseItem.SalesOrderId);
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
            : NormalizePurchaseCategory(request.PurchaseCategory, purchaseItem.MaterialRequirementId, purchaseItem.SalesOrderId);
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
        purchaseItem.ReceivedDate = request.ReceivedDate;
        purchaseItem.PurchaseStatus = PurchaseItemStatuses.Received;
        purchaseItem.PurchaseNotes = NormalizeOptional(request.PurchaseNotes) ?? purchaseItem.PurchaseNotes;
        purchaseItem.RejectionReason = null;
        purchaseItem.UpdatedAtUtc = now;
        purchaseRequest.UpdatedAtUtc = now;
        RefreshPurchaseRequestStatus(purchaseRequest);
        UpdateMaterialRequirementStatus(purchaseItem, MaterialRequirementStatuses.Received, now);

        await eventPublisher.PublishAsync(
            new PurchaseItemReceivedEvent(
                purchaseRequest.Id,
                purchaseRequest.PrNumber,
                purchaseItem.Id,
                purchaseItem.ItemName,
                purchaseItem.Qty,
                request.ReceivedDate),
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

    private static void ValidateCreateRequest(CreatePurchaseRequest request)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Purchase request must contain at least one item.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Purchase request item quantity must be greater than zero.");
        }

        if (request.Items.Any(item => !item.MaterialRequirementId.HasValue && string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Item name is required when the item is not linked to a material requirement.");
        }
    }

    private static void ValidateUpdateRequest(UpdatePurchaseRequest request)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Purchase request must contain at least one item.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Purchase request item quantity must be greater than zero.");
        }

        if (request.Items.Any(item => !item.MaterialRequirementId.HasValue && string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Item name is required when the item is not linked to a material requirement.");
        }
    }

    private static IQueryable<PurchaseRequest> IncludeItems(IQueryable<PurchaseRequest> query)
    {
        return query
            .Include(request => request.Items)
            .ThenInclude(item => item.MaterialRequirement);
    }

    private static IQueryable<MaterialRequirement> IncludePurchaseItems(IQueryable<MaterialRequirement> query)
    {
        return query
            .Include(requirement => requirement.PurchaseRequestItems)
            .ThenInclude(item => item.PurchaseRequest);
    }

    private static PurchaseRequestDto ToDto(PurchaseRequest request)
    {
        return new PurchaseRequestDto(
            request.Id,
            request.PrNumber,
            request.RequestDate,
            request.RequestedByUserId,
            request.RequesterName,
            request.SalesOrderId,
            request.SalesOrderNumber,
            request.ProjectName,
            request.Status,
            request.ReviewedByUserId,
            request.ReviewedAtUtc,
            request.RejectionReason,
            request.SupervisorReviewedByUserId,
            request.SupervisorReviewedAtUtc,
            request.SupervisorRejectionReason,
            request.FinanceReviewedByUserId,
            request.FinanceReviewedAtUtc,
            request.FinanceRejectionReason,
            request.UpdatedAtUtc,
            request.Items
                .OrderBy(item => item.ItemName)
                .Select(ToDto)
                .ToArray());
    }

    private static PurchaseRequestItemDto ToDto(PurchaseRequestItem item)
    {
        return new PurchaseRequestItemDto(
            item.Id,
            item.MaterialRequirementId,
            item.SalesOrderId,
            item.SalesOrderNumber,
            item.ProjectName,
            item.ItemName,
            item.Size,
            item.Qty,
            item.Urgency,
            item.PurchaseCategory,
            item.SuggestedSupplier,
            item.SupplierName,
            item.PoNumber,
            item.EstimatedPrice,
            item.TotalPrice,
            CalculateUnitPrice(item),
            item.PurchaseDate,
            item.ExpectedArrivalDate,
            item.ReceivedDate,
            item.PurchaseStatus,
            item.PurchaseNotes,
            item.RejectionReason,
            item.Notes);
    }

    private static MaterialRequirementDto ToDto(MaterialRequirement requirement)
    {
        return new MaterialRequirementDto(
            requirement.Id,
            requirement.SalesOrderId,
            requirement.SalesOrderNumber,
            requirement.SalesOrderItemId,
            requirement.ProductId,
            requirement.ProductPartNumber,
            requirement.ProductDescription,
            requirement.MaterialSpec,
            requirement.RequiredQty,
            requirement.StockOnHand,
            requirement.StockOnHand - requirement.RequiredQty,
            requirement.StockOnHand < requirement.RequiredQty,
            requirement.StockNotes,
            requirement.StockUpdatedAtUtc,
            requirement.ProjectName,
            requirement.Status,
            requirement.UpdatedAtUtc,
            requirement.PurchaseRequestItems
                .Where(item => item.PurchaseRequest is not null)
                .OrderByDescending(item => item.CreatedAtUtc)
                .Select(item => new LinkedPurchaseItemDto(
                    item.PurchaseRequestId,
                    item.PurchaseRequest!.PrNumber,
                    item.Id,
                    item.PurchaseRequest.Status,
                    item.PurchaseStatus,
                    item.PurchaseCategory,
                    item.SupplierName,
                    item.PoNumber,
                    item.EstimatedPrice,
                    item.TotalPrice,
                    CalculateUnitPrice(item),
                    item.PurchaseDate,
                    item.ExpectedArrivalDate,
                    item.ReceivedDate,
                    item.PurchaseNotes,
                    item.RejectionReason))
                .ToArray());
    }

    private static string ResolveItemName(CreatePurchaseRequestItem item, MaterialRequirement? requirement)
    {
        if (!string.IsNullOrWhiteSpace(item.ItemName))
        {
            return item.ItemName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(requirement?.MaterialSpec))
        {
            return requirement.MaterialSpec;
        }

        return requirement?.ProductDescription ?? "";
    }

    private static string ResolveItemName(UpdatePurchaseRequestItem item, MaterialRequirement? requirement)
    {
        if (!string.IsNullOrWhiteSpace(item.ItemName))
        {
            return item.ItemName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(requirement?.MaterialSpec))
        {
            return requirement.MaterialSpec;
        }

        return requirement?.ProductDescription ?? "";
    }

    private static void ApplySupervisorReview(
        PurchaseRequest purchaseRequest,
        ReviewPurchaseRequest request,
        string decision,
        DateTime now)
    {
        if (purchaseRequest.Status != PurchaseRequestStatuses.Submitted)
        {
            throw new InvalidOperationException("Only submitted purchase requests can receive supervisor approval.");
        }

        purchaseRequest.SupervisorReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.SupervisorReviewedAtUtc = now;
        purchaseRequest.SupervisorRejectionReason = decision == PurchaseRequestStatuses.Rejected
            ? NormalizeOptional(request.RejectionReason)
            : null;
        purchaseRequest.FinanceReviewedByUserId = null;
        purchaseRequest.FinanceReviewedAtUtc = null;
        purchaseRequest.FinanceRejectionReason = null;
        purchaseRequest.RejectionReason = purchaseRequest.SupervisorRejectionReason;
        purchaseRequest.Status = decision == PurchaseRequestStatuses.Approved
            ? PurchaseRequestStatuses.SupervisorApproved
            : PurchaseRequestStatuses.SupervisorRejected;

        if (decision == PurchaseRequestStatuses.Approved)
        {
            return;
        }

        foreach (var item in purchaseRequest.Items)
        {
            item.PurchaseStatus = PurchaseItemStatuses.Rejected;
            item.RejectionReason = purchaseRequest.SupervisorRejectionReason;
            item.UpdatedAtUtc = now;
            UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseRejected, now);
        }
    }

    private static void ApplyFinanceReview(
        PurchaseRequest purchaseRequest,
        ReviewPurchaseRequest request,
        string decision,
        DateTime now)
    {
        if (purchaseRequest.Status is not PurchaseRequestStatuses.SupervisorApproved
            and not PurchaseRequestStatuses.Processing)
        {
            throw new InvalidOperationException("Purchase request must be approved by Engineering Supervisor and priced by Purchasing before Finance review.");
        }

        var activeItems = purchaseRequest.Items
            .Where(item => item.PurchaseStatus != PurchaseItemStatuses.Rejected)
            .ToArray();
        var hasUnpricedItems = activeItems.Length == 0 || activeItems.Any(item =>
            string.IsNullOrWhiteSpace(item.SupplierName)
            || (!item.TotalPrice.HasValue || item.TotalPrice.Value <= 0)
                && (!item.EstimatedPrice.HasValue || item.EstimatedPrice.Value <= 0));

        if (hasUnpricedItems)
        {
            throw new InvalidOperationException("Purchasing must input supplier and pricing for every active item before Finance review.");
        }

        var alreadyProcessedByPurchasing = purchaseRequest.Status == PurchaseRequestStatuses.Processing
            || purchaseRequest.Items.Any(item => item.PurchaseStatus is PurchaseItemStatuses.Ordered
                or PurchaseItemStatuses.Received);

        purchaseRequest.FinanceReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.FinanceReviewedAtUtc = now;
        purchaseRequest.FinanceRejectionReason = decision == PurchaseRequestStatuses.Rejected
            ? NormalizeOptional(request.RejectionReason)
            : null;
        purchaseRequest.RejectionReason = purchaseRequest.FinanceRejectionReason;
        purchaseRequest.Status = decision == PurchaseRequestStatuses.Approved
            ? PurchaseRequestStatuses.FinanceApproved
            : PurchaseRequestStatuses.FinanceRejected;

        foreach (var item in purchaseRequest.Items)
        {
            if (decision == PurchaseRequestStatuses.Approved && !alreadyProcessedByPurchasing)
            {
                item.PurchaseStatus = PurchaseItemStatuses.Approved;
                UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseApproved, now);
            }
            else if (decision == PurchaseRequestStatuses.Rejected)
            {
                item.PurchaseStatus = PurchaseItemStatuses.Rejected;
                UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseRejected, now);
            }

            item.RejectionReason = purchaseRequest.FinanceRejectionReason;
            item.UpdatedAtUtc = now;
        }
    }

    private static string NormalizeReviewStage(string? reviewStage)
    {
        if (string.IsNullOrWhiteSpace(reviewStage))
        {
            return PurchaseRequestReviewStages.Finance;
        }

        return reviewStage.Trim() switch
        {
            var value when value.Equals(PurchaseRequestReviewStages.Supervisor, StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Supervisor,
            var value when value.Equals("EngineeringSupervisor", StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Supervisor,
            var value when value.Equals(PurchaseRequestReviewStages.Finance, StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Finance,
            _ => throw new InvalidOperationException("Review stage must be Supervisor or Finance.")
        };
    }

    private static string NormalizeReviewDecision(string decision)
    {
        if (decision.Equals("Accept", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Accepted", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Approved, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Approved;
        }

        if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Rejected;
        }

        throw new InvalidOperationException("Review decision must be Accept or Reject.");
    }

    private static string NormalizeUrgency(string? urgency)
    {
        if (string.IsNullOrWhiteSpace(urgency))
        {
            return PurchaseItemUrgencies.Normal;
        }

        return urgency.Trim() switch
        {
            var value when value.Equals(PurchaseItemUrgencies.Normal, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Normal,
            var value when value.Equals(PurchaseItemUrgencies.Urgent, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Urgent,
            var value when value.Equals(PurchaseItemUrgencies.Critical, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Critical,
            _ => throw new InvalidOperationException("Purchase urgency must be Normal, Urgent, or Critical.")
        };
    }

    private static string NormalizePurchaseStatus(string? status, DateOnly? purchaseDate, DateOnly? receivedDate)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            if (receivedDate.HasValue)
            {
                return PurchaseItemStatuses.Received;
            }

            return purchaseDate.HasValue ? PurchaseItemStatuses.Ordered : PurchaseItemStatuses.Requested;
        }

        return status.Trim() switch
        {
            var value when value.Equals(PurchaseItemStatuses.Requested, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Requested,
            var value when value.Equals(PurchaseItemStatuses.Approved, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Approved,
            var value when value.Equals(PurchaseItemStatuses.Rejected, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Rejected,
            var value when value.Equals(PurchaseItemStatuses.Ordered, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Ordered,
            var value when value.Equals(PurchaseItemStatuses.Received, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Received,
            _ => throw new InvalidOperationException("Purchase status must be Requested, Approved, Rejected, Ordered, or Received.")
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static void ValidateEstimatedPrice(decimal? estimatedPrice)
    {
        if (estimatedPrice.HasValue && estimatedPrice.Value < 0)
        {
            throw new InvalidOperationException("Estimated price cannot be negative.");
        }
    }

    private static decimal? NormalizePrice(decimal? price, string label)
    {
        if (!price.HasValue)
        {
            return null;
        }

        if (price.Value < 0)
        {
            throw new InvalidOperationException($"{label} cannot be negative.");
        }

        return price.Value;
    }

    private static decimal? CalculateUnitPrice(PurchaseRequestItem item)
    {
        var totalPrice = item.TotalPrice ?? item.EstimatedPrice;
        if (!totalPrice.HasValue || item.Qty <= 0)
        {
            return null;
        }

        return decimal.Round(totalPrice.Value / item.Qty, 2);
    }

    private static string NormalizePurchaseCategory(
        string? category,
        Guid? materialRequirementId,
        Guid? salesOrderId)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return materialRequirementId.HasValue || salesOrderId.HasValue
                ? PurchaseItemCategories.Project
                : PurchaseItemCategories.Consumable;
        }

        return category.Trim() switch
        {
            var value when value.Equals(PurchaseItemCategories.Asset, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Asset,
            var value when value.Equals(PurchaseItemCategories.Consumable, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Consumable,
            var value when value.Equals(PurchaseItemCategories.Tools, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Tools,
            var value when value.Equals(PurchaseItemCategories.Project, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Project,
            var value when value.Equals(PurchaseItemCategories.Maintenance, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Maintenance,
            _ => throw new InvalidOperationException("Purchase category must be Asset, Consumable, Tools, Project, or Maintenance.")
        };
    }

    private static PurchaseRequestItem FindPurchaseItem(PurchaseRequest purchaseRequest, Guid itemId)
    {
        return purchaseRequest.Items.FirstOrDefault(item => item.Id == itemId)
            ?? throw new InvalidOperationException("Purchase request item was not found.");
    }

    private static void UpdateMaterialRequirementStatus(
        PurchaseRequestItem purchaseItem,
        string status,
        DateTime timestampUtc)
    {
        if (purchaseItem.MaterialRequirement is null)
        {
            return;
        }

        purchaseItem.MaterialRequirement.Status = status;
        purchaseItem.MaterialRequirement.UpdatedAtUtc = timestampUtc;
    }

    private static void EnsurePurchaseRequestAcceptedForPurchasing(PurchaseRequest purchaseRequest, string action)
    {
        if (purchaseRequest.Status is PurchaseRequestStatuses.SupervisorApproved
            or PurchaseRequestStatuses.FinanceApproved
            or PurchaseRequestStatuses.Approved
            or PurchaseRequestStatuses.Processing
            or PurchaseRequestStatuses.Completed)
        {
            return;
        }

        throw new InvalidOperationException($"Purchase request must be approved by Engineering Supervisor before it can {action}.");
    }

    private static void EnsurePurchaseRequestFinanceApprovedForReceiving(PurchaseRequest purchaseRequest)
    {
        if (purchaseRequest.Status is PurchaseRequestStatuses.FinanceApproved
            or PurchaseRequestStatuses.Approved
            or PurchaseRequestStatuses.Completed)
        {
            return;
        }

        if (purchaseRequest.Status == PurchaseRequestStatuses.Processing
            && purchaseRequest.FinanceReviewedAtUtc.HasValue
            && purchaseRequest.FinanceRejectionReason is null)
        {
            return;
        }

        throw new InvalidOperationException("Purchase request must be approved by Finance before material can be received.");
    }

    private static bool IsRejectedRequest(string status)
    {
        return status is PurchaseRequestStatuses.SupervisorRejected
            or PurchaseRequestStatuses.FinanceRejected
            or PurchaseRequestStatuses.Rejected;
    }

    private static void RefreshPurchaseRequestStatus(PurchaseRequest purchaseRequest)
    {
        if (purchaseRequest.Items.All(item => item.PurchaseStatus == PurchaseItemStatuses.Rejected))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Rejected;
            purchaseRequest.RejectionReason = string.Join(
                "; ",
                purchaseRequest.Items
                    .Select(item => item.RejectionReason)
                    .Where(reason => !string.IsNullOrWhiteSpace(reason)));
            purchaseRequest.RejectionReason = string.IsNullOrWhiteSpace(purchaseRequest.RejectionReason)
                ? null
                : purchaseRequest.RejectionReason;
            return;
        }
        var activeItems = purchaseRequest.Items
            .Where(item => item.PurchaseStatus != PurchaseItemStatuses.Rejected)
            .ToArray();

        if (activeItems.Length > 0 && activeItems.All(item => item.PurchaseStatus == PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Completed;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (activeItems.Any(item => item.PurchaseStatus is PurchaseItemStatuses.Ordered
                or PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Processing;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (activeItems.Any(item => item.PurchaseStatus == PurchaseItemStatuses.Approved))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.FinanceApproved;
            purchaseRequest.RejectionReason = null;
            return;
        }

        purchaseRequest.Status = purchaseRequest.SupervisorReviewedAtUtc.HasValue
            ? PurchaseRequestStatuses.SupervisorApproved
            : PurchaseRequestStatuses.Submitted;
        purchaseRequest.RejectionReason = null;
    }

    private async Task<string> GenerateNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"MR-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.PurchaseRequests
            .AsNoTracking()
            .Where(request => request.PrNumber.StartsWith(prefix))
            .Select(request => request.PrNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):000}";
    }

    private static int NextSequence(IEnumerable<string> existingNumbers, string prefix)
    {
        var max = 0;
        foreach (var number in existingNumbers)
        {
            if (number.Length <= prefix.Length)
            {
                continue;
            }

            if (int.TryParse(number[prefix.Length..], out var value) && value > max)
            {
                max = value;
            }
        }

        return max + 1;
    }
}
