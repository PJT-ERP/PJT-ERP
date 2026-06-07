namespace PJT_ERP.EventBus.Messages.Events;

public record ProductionFinishedEvent(
    Guid ProductionOrderId,
    string SpkNumber,
    string BarcodeValue,
    DateTime FinishedAtUtc,
    Guid? SalesOrderId = null,
    string? SalesOrderNumber = null,
    Guid? QcReviewerUserId = null,
    string? QcReviewerName = null) : IntegrationEvent;
