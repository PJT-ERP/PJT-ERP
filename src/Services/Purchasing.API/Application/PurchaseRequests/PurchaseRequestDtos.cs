namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public sealed record CreatePurchaseRequest(
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    IReadOnlyCollection<CreatePurchaseRequestItem> Items,
    bool RequireSupervisorApproval = false);

public sealed record CreatePurchaseRequestItem(
    Guid? MaterialRequirementId,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? Notes,
    string? Urgency = null,
    string? PurchaseCategory = null,
    decimal? TotalPrice = null);

public sealed record UpdatePurchaseRequest(
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    IReadOnlyCollection<UpdatePurchaseRequestItem> Items);

public sealed record UpdatePurchaseRequestItem(
    Guid? MaterialRequirementId,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? Notes,
    string? Urgency = null,
    string? PurchaseCategory = null,
    decimal? TotalPrice = null);

public sealed record ReviewPurchaseRequest(
    Guid ReviewedByUserId,
    string Decision,
    string? RejectionReason,
    string? ReviewStage = null);

public sealed record UpdatePurchaseItemInfoRequest(
    string? SupplierName,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string? PurchaseStatus,
    string? PurchaseNotes,
    string? PoNumber = null,
    decimal? EstimatedPrice = null,
    decimal? TotalPrice = null,
    string? PurchaseCategory = null,
    int? Qty = null,
    string? ItemName = null);

public sealed record ProcessPurchaseItemRequest(
    string SupplierName,
    DateOnly ExpectedArrivalDate,
    string? PoNumber,
    decimal? EstimatedPrice,
    string? PurchaseNotes,
    decimal? TotalPrice = null,
    string? PurchaseCategory = null);

public sealed record RejectPurchaseItemRequest(string? RejectionReason);

public sealed record ReceivePurchaseItemRequest(DateOnly ReceivedDate, string? PurchaseNotes, int? ReceivedQty = null);

public sealed record UpdateMaterialStockInfoRequest(int StockOnHand, string? StockNotes);

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
    Guid? SupervisorReviewedByUserId,
    DateTime? SupervisorReviewedAtUtc,
    string? SupervisorRejectionReason,
    Guid? FinanceReviewedByUserId,
    DateTime? FinanceReviewedAtUtc,
    string? FinanceRejectionReason,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PurchaseRequestItemDto> Items);

public sealed record PurchaseRequestItemDto(
    Guid Id,
    Guid? MaterialRequirementId,
    Guid? SalesOrderId,
    string? SalesOrderNumber,
    string? ProjectName,
    string ItemName,
    string? Size,
    int Qty,
    string Urgency,
    string PurchaseCategory,
    string? SuggestedSupplier,
    string? SupplierName,
    string? PoNumber,
    decimal? EstimatedPrice,
    decimal? TotalPrice,
    decimal? UnitPrice,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string PurchaseStatus,
    string? PurchaseNotes,
    string? RejectionReason,
    string? Notes);

public sealed record MaterialRequirementDto(
    Guid Id,
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid? SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    string? MaterialSpec,
    int RequiredQty,
    int StockOnHand,
    int StockBalanceAfterRequirement,
    bool RequiresPurchase,
    string? StockNotes,
    DateTime? StockUpdatedAtUtc,
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
    string PurchaseCategory,
    string? SupplierName,
    string? PoNumber,
    decimal? EstimatedPrice,
    decimal? TotalPrice,
    decimal? UnitPrice,
    DateOnly? PurchaseDate,
    DateOnly? ExpectedArrivalDate,
    DateOnly? ReceivedDate,
    string? PurchaseNotes,
    string? RejectionReason);

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
