namespace PJT_ERP.Production.Api.Application.Production;

public sealed record EngineerAssignment(Guid UserId, string Name);

public sealed record CreateSalesOrderRequest(
    Guid CustomerId,
    DateOnly SoDate,
    DateOnly? TargetDate,
    IReadOnlyCollection<CreateSalesOrderItemRequest> Items,
    EngineerAssignment? ProductionWorker = null,
    EngineerAssignment? QcReviewer = null,
    string? CustomerDrawingUrl = null,
    string? DesignReference = null,
    string? DesignStatus = null);

public sealed record CreateSalesOrderItemRequest(Guid ProductId, int Qty, string? Notes);

public sealed record AssignSalesOrderEngineersRequest(
    EngineerAssignment? ProductionWorker,
    EngineerAssignment? QcReviewer);

public sealed record UpdateSalesOrderDesignStatusRequest(
    string DesignStatus,
    Guid? ReviewedByUserId,
    string? ReviewerName,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null);

public sealed record ConfirmSalesOrderRequest(Guid ApprovedByUserId);

public sealed record SalesOrderDto(
    Guid Id,
    string SoNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerDrawingUrl,
    string? DesignReference,
    string DesignStatus,
    Guid? DesignApprovedByUserId,
    string? DesignApprovedByName,
    DateTime? DesignApprovedAtUtc,
    DateOnly SoDate,
    DateOnly? TargetDate,
    Guid? ProductionWorkerUserId,
    string? ProductionWorkerName,
    Guid? QcReviewerUserId,
    string? QcReviewerName,
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
    string? CustomerEmail,
    string? CustomerDrawingUrl,
    string? DesignReference,
    string DesignStatus,
    Guid? DesignApprovedByUserId,
    string? DesignApprovedByName,
    DateTime? DesignApprovedAtUtc,
    Guid? ProductionWorkerUserId,
    string? ProductionWorkerName,
    Guid? QcReviewerUserId,
    string? QcReviewerName,
    string SalesOrderStatus,
    string ProductionStatus,
    int TotalItems,
    int TotalQuantity,
    decimal ProgressPercent,
    string? DrawingRef,
    string? DrawingFileUrl,
    Guid? DrawingUploadedByUserId,
    string? DrawingUploaderName,
    DateTime? DrawingUploadedAtUtc,
    string? TrackingBarcodeUid,
    DateTime? StartedAtUtc,
    Guid? StartedByUserId,
    string? StartedByName,
    DateTime? FinishedAtUtc,
    Guid? FinishedByUserId,
    string? FinishedByName,
    long? DurationSeconds,
    string? QcDecision,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<SalesOrderProductionProgressItemDto> Items);

public sealed record SalesOrderProductionProgressItemDto(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty);

public sealed record PublicProductionTrackingDto(
    string SoNumber,
    string CustomerName,
    string? CustomerDrawingUrl,
    string? DesignReference,
    string SalesOrderStatus,
    string ProductionStatus,
    int TotalItems,
    int TotalQuantity,
    decimal ProgressPercent,
    string? DrawingFileUrl,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    long? DurationSeconds,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PublicProductionTrackingItemDto> Items);

public sealed record PublicProductionTrackingItemDto(
    string ProductPartNumber,
    string ProductDescription,
    int Qty);

public sealed record LookupSalesOrderTrackingRequest(string TrackingCode);

public sealed record ProductionStatusUpdateRequest(Guid WorkerUserId, string WorkerName);

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

public sealed record SubmitProductionMaterialRequest(
    Guid RequestedByUserId,
    string RequesterName,
    IReadOnlyCollection<SubmitProductionMaterialRequestItem> Items,
    string? Notes = null);

public sealed record SubmitProductionMaterialRequestItem(
    Guid? MaterialRequirementId,
    Guid? SalesOrderItemId,
    string ItemName,
    string? Size,
    int Qty,
    string? Urgency = null,
    string? SuggestedSupplier = null,
    string? Notes = null,
    string? PurchaseCategory = null);
