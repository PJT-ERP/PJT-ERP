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
            PrNumber = GenerateNumber(),
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

    public async Task<PurchaseRequestDto?> ReviewAsync(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (purchaseRequest.Status != PurchaseRequestStatuses.Submitted)
        {
            throw new InvalidOperationException("Only submitted purchase requests can be reviewed by Finance.");
        }

        var decision = NormalizeReviewDecision(request.Decision);
        if (decision == PurchaseRequestStatuses.Rejected && string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            throw new InvalidOperationException("Rejection reason is required when rejecting a purchase request.");
        }

        var now = DateTime.UtcNow;
        purchaseRequest.Status = decision;
        purchaseRequest.ReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.ReviewedAtUtc = now;
        purchaseRequest.RejectionReason = decision == PurchaseRequestStatuses.Rejected
            ? NormalizeOptional(request.RejectionReason)
            : null;
        purchaseRequest.UpdatedAtUtc = now;

        foreach (var item in purchaseRequest.Items)
        {
            item.PurchaseStatus = decision == PurchaseRequestStatuses.Approved
                ? PurchaseItemStatuses.Approved
                : PurchaseItemStatuses.Rejected;
            item.RejectionReason = purchaseRequest.RejectionReason;
            item.UpdatedAtUtc = now;

            UpdateMaterialRequirementStatus(
                item,
                decision == PurchaseRequestStatuses.Approved
                    ? MaterialRequirementStatuses.PurchaseApproved
                    : MaterialRequirementStatuses.PurchaseRejected,
                now);
        }

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

        if (purchaseRequest.Status == PurchaseRequestStatuses.Rejected)
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

        purchaseItem.SupplierName = requestedSupplier ?? purchaseItem.SupplierName;
        purchaseItem.PoNumber = request.PoNumber is null ? purchaseItem.PoNumber : NormalizeOptional(request.PoNumber);
        purchaseItem.EstimatedPrice = request.EstimatedPrice ?? purchaseItem.EstimatedPrice;
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

        var purchaseRequest = await IncludeItems(db.PurchaseRequests)
            .FirstOrDefaultAsync(item => item.Id == purchaseRequestId, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        if (purchaseRequest.Status == PurchaseRequestStatuses.Rejected)
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

        if (purchaseRequest.Status == PurchaseRequestStatuses.Rejected
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

        if (purchaseRequest.Status == PurchaseRequestStatuses.Rejected)
        {
            throw new InvalidOperationException("Rejected purchase requests cannot receive material.");
        }

        EnsurePurchaseRequestAcceptedForPurchasing(purchaseRequest, "receive material");

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
            item.SuggestedSupplier,
            item.SupplierName,
            item.PoNumber,
            item.EstimatedPrice,
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
                    item.SupplierName,
                    item.PoNumber,
                    item.EstimatedPrice,
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

        throw new InvalidOperationException("Finance decision must be Accept or Reject.");
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
        if (purchaseRequest.Status is PurchaseRequestStatuses.Approved
            or PurchaseRequestStatuses.Processing
            or PurchaseRequestStatuses.Completed)
        {
            return;
        }

        throw new InvalidOperationException($"Purchase request must be accepted by Finance before it can {action}.");
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

        if (purchaseRequest.Items.All(item => item.PurchaseStatus == PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Completed;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (purchaseRequest.Items.Any(item => item.PurchaseStatus is PurchaseItemStatuses.Ordered
                or PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Processing;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (purchaseRequest.Items.Any(item => item.PurchaseStatus == PurchaseItemStatuses.Approved))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Approved;
            purchaseRequest.RejectionReason = null;
            return;
        }

        purchaseRequest.Status = PurchaseRequestStatuses.Submitted;
        purchaseRequest.RejectionReason = null;
    }

    private static string GenerateNumber()
    {
        return $"PR-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..27].ToUpperInvariant();
    }
}
