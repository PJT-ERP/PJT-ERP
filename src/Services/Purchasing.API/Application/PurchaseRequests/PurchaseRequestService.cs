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
                    ProductionOrderId = item.ProductionOrderId ?? requirement?.ProductionOrderId,
                    SpkNumber = NormalizeOptional(item.SpkNumber) ?? requirement?.SpkNumber,
                    ProjectName = NormalizeOptional(item.ProjectName) ?? requirement?.ProjectName ?? NormalizeOptional(request.ProjectName),
                    ItemName = ResolveItemName(item, requirement),
                    Size = NormalizeOptional(item.Size) ?? requirement?.MaterialSpec,
                    Qty = item.Qty,
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

        var decision = NormalizeReviewDecision(request.Decision);
        if (decision == PurchaseRequestStatuses.Rejected && string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            throw new InvalidOperationException("Rejection reason is required when rejecting a purchase request.");
        }

        purchaseRequest.Status = decision;
        purchaseRequest.ReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.ReviewedAtUtc = DateTime.UtcNow;
        purchaseRequest.RejectionReason = purchaseRequest.Status == PurchaseRequestStatuses.Rejected ? request.RejectionReason?.Trim() : null;
        purchaseRequest.UpdatedAtUtc = DateTime.UtcNow;

        foreach (var item in purchaseRequest.Items)
        {
            item.PurchaseStatus = decision == PurchaseRequestStatuses.Approved
                ? PurchaseItemStatuses.Approved
                : PurchaseItemStatuses.Rejected;
            item.UpdatedAtUtc = purchaseRequest.UpdatedAtUtc;

            if (item.MaterialRequirement is not null)
            {
                item.MaterialRequirement.Status = decision == PurchaseRequestStatuses.Approved
                    ? MaterialRequirementStatuses.PurchaseApproved
                    : MaterialRequirementStatuses.PurchaseRejected;
                item.MaterialRequirement.UpdatedAtUtc = purchaseRequest.UpdatedAtUtc;
            }
        }

        await eventPublisher.PublishAsync(
            new PurchaseRequestReviewedEvent(purchaseRequest.Id, purchaseRequest.PrNumber, purchaseRequest.Status, purchaseRequest.ReviewedAtUtc.Value),
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

        var purchaseItem = purchaseRequest.Items.FirstOrDefault(item => item.Id == itemId)
            ?? throw new InvalidOperationException("Purchase request item was not found.");
        var purchaseStatus = NormalizePurchaseStatus(request.PurchaseStatus, request.PurchaseDate, request.ReceivedDate);

        if (purchaseStatus is PurchaseItemStatuses.Ordered or PurchaseItemStatuses.Received)
        {
            if (string.IsNullOrWhiteSpace(request.SupplierName))
            {
                throw new InvalidOperationException("Supplier name is required when recording ordered or received material.");
            }

            if (!request.PurchaseDate.HasValue)
            {
                throw new InvalidOperationException("Purchase date is required when recording ordered or received material.");
            }
        }

        purchaseItem.SupplierName = NormalizeOptional(request.SupplierName);
        purchaseItem.PurchaseDate = request.PurchaseDate;
        purchaseItem.ExpectedArrivalDate = request.ExpectedArrivalDate;
        purchaseItem.ReceivedDate = request.ReceivedDate;
        purchaseItem.PurchaseStatus = purchaseStatus;
        purchaseItem.PurchaseNotes = NormalizeOptional(request.PurchaseNotes);
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

    public async Task<SalesOrderMaterialTrackingDto?> GetSalesOrderMaterialTrackingAsync(
        Guid salesOrderId,
        CancellationToken cancellationToken)
    {
        var snapshot = await db.SalesOrderSnapshots
            .AsNoTracking()
            .FirstOrDefaultAsync(order => order.SalesOrderId == salesOrderId, cancellationToken);

        var requirements = await IncludePurchaseItems(db.MaterialRequirements.AsNoTracking())
            .Where(requirement => requirement.SalesOrderId == salesOrderId)
            .OrderBy(requirement => requirement.SpkNumber)
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
            item.ProductionOrderId,
            item.SpkNumber,
            item.ProjectName,
            item.ItemName,
            item.Size,
            item.Qty,
            item.SuggestedSupplier,
            item.SupplierName,
            item.PurchaseDate,
            item.ExpectedArrivalDate,
            item.ReceivedDate,
            item.PurchaseStatus,
            item.PurchaseNotes,
            item.Notes);
    }

    private static MaterialRequirementDto ToDto(MaterialRequirement requirement)
    {
        return new MaterialRequirementDto(
            requirement.Id,
            requirement.SalesOrderId,
            requirement.SalesOrderNumber,
            requirement.ProductionOrderId,
            requirement.SpkNumber,
            requirement.ProductId,
            requirement.ProductPartNumber,
            requirement.ProductDescription,
            requirement.MaterialSpec,
            requirement.RequiredQty,
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
                    item.PurchaseDate,
                    item.ExpectedArrivalDate,
                    item.ReceivedDate,
                    item.PurchaseNotes))
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
        if (decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Approved, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Approved;
        }

        if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Rejected;
        }

        throw new InvalidOperationException("Review decision must be Approve or Reject.");
    }

    private static string NormalizePurchaseStatus(string? status, DateOnly? purchaseDate, DateOnly? receivedDate)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            if (receivedDate.HasValue)
            {
                return PurchaseItemStatuses.Received;
            }

            return purchaseDate.HasValue ? PurchaseItemStatuses.Ordered : PurchaseItemStatuses.Approved;
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

    private static string GenerateNumber()
    {
        return $"PR-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..27].ToUpperInvariant();
    }
}
