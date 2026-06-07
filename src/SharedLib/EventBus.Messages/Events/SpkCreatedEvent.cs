namespace PJT_ERP.EventBus.Messages.Events;

public record SpkCreatedEvent(
    Guid ProductionOrderId,
    Guid SalesOrderId,
    string SpkNumber,
    string BarcodeValue,
    Guid ProductId,
    decimal Quantity,
    string ProductCode = "",
    string ProductName = "",
    string? DrawingRef = null,
    string? MaterialSpec = null,
    string? SalesOrderNumber = null,
    Guid? ProductionWorkerUserId = null,
    string? ProductionWorkerName = null,
    Guid? QcReviewerUserId = null,
    string? QcReviewerName = null,
    IReadOnlyCollection<SpkCreatedItem>? Items = null) : IntegrationEvent;

public record SpkCreatedItem(
    Guid SalesOrderItemId,
    Guid ProductId,
    decimal Quantity,
    string ProductCode = "",
    string ProductName = "",
    string? MaterialSpec = null,
    string? Notes = null);
