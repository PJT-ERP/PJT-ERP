namespace PJT_ERP.Production.Api.Application.Production;

public sealed record EngineerAssignment(Guid UserId, string Name);

public sealed record CreateSalesOrderRequest(
    Guid CustomerId,
    DateOnly SoDate,
    DateOnly? TargetDate,
    IReadOnlyCollection<CreateSalesOrderItemRequest> Items,
    EngineerAssignment? DesignWorker = null,
    EngineerAssignment? ProductionWorker = null,
    EngineerAssignment? QcReviewer = null,
    string? CustomerDrawingUrl = null,
    string? DesignReference = null,
    string? DesignStatus = null);

public sealed record CreateSalesOrderItemRequest(Guid ProductId, int Qty, decimal UnitPrice, string? Notes, string? DesignReference = null, string? CustomerDrawingUrl = null);

public sealed record CompleteSalesOrderRequest(
    CompleteSalesOrderCustomerRequest Customer,
    IReadOnlyCollection<CompleteSalesOrderProductRequest> Products,
    CompleteSalesOrderDetailsRequest Order
);

public sealed record CompleteSalesOrderCustomerRequest(
    string? Code,
    string Name,
    string? Address = null,
    string? ContactPerson = null,
    string? Email = null,
    string? Phone = null
);

public sealed record CompleteSalesOrderProductRequest(
    string TempId,
    string Description,
    string Unit,
    string? MaterialSpec = null
);

public sealed record CompleteSalesOrderDetailsRequest(
    DateOnly SoDate,
    DateOnly? TargetDate,
    IReadOnlyCollection<CompleteSalesOrderItemRequest> Items,
    EngineerAssignment? DesignWorker = null,
    EngineerAssignment? ProductionWorker = null,
    EngineerAssignment? QcReviewer = null,
    string? CustomerDrawingUrl = null,
    string? DesignReference = null,
    string? DesignStatus = null
);

public sealed record CompleteSalesOrderItemRequest(
    string? ProductTempId,
    Guid? ExistingProductId,
    int Qty,
    decimal UnitPrice,
    string? Notes,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null
);

public sealed record AssignSalesOrderEngineersRequest(
    EngineerAssignment? DesignWorker,
    EngineerAssignment? ProductionWorker,
    EngineerAssignment? QcReviewer,
    string? Notes = null);

public sealed record SubmitSalesOrderDesignRequest(
    string DesignReference,
    string? DrawingFileUrl = null,
    string? UpdatedByName = null);

public sealed record UpdateSalesOrderItemsRequest(
    IReadOnlyCollection<CreateSalesOrderItemRequest> Items);

public sealed record UpdateSalesOrderDesignStatusRequest(
    string DesignStatus,
    Guid? ReviewedByUserId,
    string? ReviewerName,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null,
    string? Notes = null);

public sealed record UpdateSalesOrderGeneralRequest(
    string? Description = null,
    int? Quantity = null,
    string? Unit = null,
    DateOnly? Deadline = null,
    string? Notes = null,
    string? CustomerDrawingUrl = null,
    IReadOnlyCollection<SalesOrderDesignRevisionDto>? DesignRevisions = null,
    string? Status = null);

public sealed record UpdateCustomerDrawingUrlRequest(
    string? CustomerDrawingUrl,
    string UpdatedByName);

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
    string? RejectionReason,
    DateOnly SoDate,
    DateOnly? TargetDate,
    Guid? DesignWorkerUserId,
    string? DesignWorkerName,
    Guid? ProductionWorkerUserId,
    string? ProductionWorkerName,
    Guid? QcReviewerUserId,
    string? QcReviewerName,
    string Status,
    string ProductionStatus,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    string? QcDecision,
    string? DrawingFileUrl,
    string? PauseReason,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    string? CompletionNote,
    decimal? EstimatedAmount,
    bool IsCostingCompleted,
    IReadOnlyCollection<SalesOrderDesignRevisionDto> DesignRevisions,
    IReadOnlyCollection<SalesOrderItemDto> Items,
    IReadOnlyCollection<SalesOrderCommentDto>? Comments = null,
    IReadOnlyCollection<string>? ProductionPhotos = null,
    IReadOnlyCollection<string>? QcPhotos = null,
    IReadOnlyCollection<SalesOrderMaterialDto>? Materials = null);

public sealed record SalesOrderCommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    DateTime CreatedAtUtc,
    bool IsEdited,
    bool IsDeleted);

public sealed record SalesOrderMaterialDto(
    string Id,
    string? InventoryItemId,
    string Name,
    string? Code,
    string? Spec,
    string? Specification,
    int Quantity,
    string Unit,
    bool IsCustomerMaterial = false);

public sealed record SalesOrderDesignRevisionDto(
    int Version,
    string Url,
    string ChangedBy,
    DateTime ChangedAtUtc);

public sealed record SalesOrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    decimal UnitPrice,
    string? Notes,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null);

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
    Guid? DesignWorkerUserId,
    string? DesignWorkerName,
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
    string? PauseReason,
    string? CompletionNote,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<SalesOrderProductionProgressItemDto> Items);

public sealed record SalesOrderProductionProgressItemDto(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null);

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
    int Qty,
    string? DesignReference = null,
    string? CustomerDrawingUrl = null);

public sealed record LookupSalesOrderTrackingRequest(string TrackingCode);

public sealed record ProductionStatusUpdateRequest(Guid WorkerUserId, string WorkerName, string? Reason = null);

public sealed record UploadEngineeringDrawingRequest(
    string DrawingFileUrl,
    Guid UploadedByUserId,
    string UploaderName,
    string? DrawingRef);

public sealed record AddSalesOrderCommentRequest(
    Guid UserId,
    string UserName,
    string Content);

public sealed record UpdateSalesOrderCommentRequest(
    string Content);

public sealed record ExecutiveDashboardDto(
    int WaitingOrders,
    int InProgressOrders,
    int FinishedOrders,
    int ClosedOrders,
    int GoQc,
    int NoGoQc,
    decimal NoGoRate)
{
    public int ApprovedQc => GoQc;
    public int RejectedQc => NoGoQc;
    public decimal RejectionRate => NoGoRate;
}

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

public sealed record QcQueuesDto(
    IReadOnlyCollection<SalesOrderDto> ReadyForInspection,
    IReadOnlyCollection<SalesOrderDto> InspectionHistory);

public sealed record ProductionBoardQueuesDto(
    IReadOnlyCollection<SalesOrderDto> PendingAssignment,
    IReadOnlyCollection<SalesOrderDto> ReadyToStart,
    IReadOnlyCollection<SalesOrderDto> InProduction,
    IReadOnlyCollection<SalesOrderDto> Paused,
    IReadOnlyCollection<SalesOrderDto> WaitingQc,
    IReadOnlyCollection<SalesOrderDto> Completed);
