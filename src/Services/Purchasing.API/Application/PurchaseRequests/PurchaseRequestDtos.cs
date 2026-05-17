namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public sealed record CreatePurchaseRequest(
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    IReadOnlyCollection<CreatePurchaseRequestItem> Items);

public sealed record CreatePurchaseRequestItem(
    Guid? MaterialRequirementId,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    Guid? ProductionOrderId,
    string? SpkNumber,
    string? ProjectName,
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? Notes);

public sealed record ReviewPurchaseRequest(Guid ReviewedByUserId, string Decision, string? RejectionReason);

public sealed record UpdatePurchaseItemInfoRequest(
    string? SupplierName,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string? PurchaseStatus,
    string? PurchaseNotes);

public sealed record PurchaseRequestDto(
    Guid Id,
    string PrNumber,
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    string Status,
    Guid? ReviewedByUserId,
    DateTime? ReviewedAtUtc,
    string? RejectionReason,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PurchaseRequestItemDto> Items);

public sealed record PurchaseRequestItemDto(
    Guid Id,
    Guid? MaterialRequirementId,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    Guid? ProductionOrderId,
    string? SpkNumber,
    string? ProjectName,
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? SupplierName,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string PurchaseStatus,
    string? PurchaseNotes,
    string? Notes);

public sealed record MaterialRequirementDto(
    Guid Id,
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid ProductionOrderId,
    string SpkNumber,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    string? MaterialSpec,
    int RequiredQty,
    string ProjectName,
    string Status,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<LinkedPurchaseItemDto> PurchaseItems);

public sealed record LinkedPurchaseItemDto(
    Guid PurchaseRequestId,
    string PrNumber,
    Guid PurchaseRequestItemId,
    string PurchaseRequestStatus,
    string PurchaseStatus,
    string? SupplierName,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string? PurchaseNotes);

public sealed record SalesOrderMaterialTrackingDto(
    Guid SalesOrderId,
    string SalesOrderNumber,
    int TotalRequirements,
    int RequiredRequirements,
    int RequestedRequirements,
    int ApprovedRequirements,
    int OrderedRequirements,
    int ReceivedRequirements,
    decimal ReceivedPercent,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<MaterialRequirementDto> Requirements);
