namespace PJT_ERP.Production.Api.Application.Production;

public sealed record CreateSalesOrderRequest(
    Guid CustomerId,
    DateOnly SoDate,
    DateOnly? TargetDate,
    IReadOnlyCollection<CreateSalesOrderItemRequest> Items);

public sealed record CreateSalesOrderItemRequest(Guid ProductId, int Qty, string? Notes);

public sealed record ConfirmSalesOrderRequest(Guid ApprovedByUserId);

public sealed record SalesOrderDto(
    Guid Id,
    string SoNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    DateOnly SoDate,
    DateOnly? TargetDate,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<SalesOrderItemDto> Items);

public sealed record SalesOrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    string? Notes);

public sealed record SalesOrderProductionProgressDto(
    Guid SalesOrderId,
    string SoNumber,
    string CustomerCode,
    string CustomerName,
    string Status,
    int TotalItems,
    int TotalQuantity,
    int ProductionOrderCount,
    int WaitingOrders,
    int InProgressOrders,
    int FinishedOrders,
    int ClosedOrders,
    decimal ProgressPercent,
    IReadOnlyCollection<SalesOrderProductionProgressItemDto> Items);

public sealed record SalesOrderProductionProgressItemDto(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    IReadOnlyCollection<ProductionOrderDto> ProductionOrders);

public sealed record PublicProductionTrackingDto(
    string SoNumber,
    string CustomerName,
    string Status,
    int TotalItems,
    int TotalQuantity,
    int ProductionOrderCount,
    int WaitingOrders,
    int InProgressOrders,
    int FinishedOrders,
    int ClosedOrders,
    decimal ProgressPercent,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PublicProductionTrackingItemDto> Items);

public sealed record PublicProductionTrackingItemDto(
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    IReadOnlyCollection<PublicProductionOrderTrackingDto> ProductionOrders);

public sealed record PublicProductionOrderTrackingDto(
    string PoNumber,
    string ProductPartNumber,
    string ProductDescription,
    int OrderQty,
    string Status,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    long? DurationSeconds,
    DateTime UpdatedAtUtc);

public sealed record ProductionOrderDto(
    Guid Id,
    string PoNumber,
    Guid SalesOrderItemId,
    Guid? SalesOrderId,
    string? SoNumber,
    string? CustomerCode,
    string? CustomerName,
    Guid? ProductId,
    string? ProductPartNumber,
    string? ProductDescription,
    string? DrawingRef,
    string? DrawingFileUrl,
    Guid? DrawingUploadedByUserId,
    string? DrawingUploaderName,
    DateTime? DrawingUploadedAtUtc,
    string BarcodeUid,
    int OrderQty,
    string Status,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    long? DurationSeconds,
    string? QcDecision,
    DateTime UpdatedAtUtc);

public sealed record ScanProductionOrderRequest(string BarcodeUid, string Action);

public sealed record LookupProductionOrderRequest(string BarcodeUid);

public sealed record UploadEngineeringDrawingRequest(
    string DrawingFileUrl,
    Guid UploadedByUserId,
    string UploaderName,
    string? DrawingRef);

public sealed record ExecutiveDashboardDto(
    int WaitingOrders,
    int InProgressOrders,
    int FinishedOrders,
    int ClosedOrders,
    int ApprovedQc,
    int RejectedQc,
    decimal RejectionRate);
