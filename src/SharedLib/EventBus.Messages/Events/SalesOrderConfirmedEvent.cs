namespace PJT_ERP.EventBus.Messages.Events;

public record SalesOrderConfirmedEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    DateTime ConfirmedAtUtc,
    IReadOnlyCollection<SalesOrderConfirmedItem>? Items = null,
    Guid? ProductionWorkerUserId = null,
    string? ProductionWorkerName = null,
    Guid? QcReviewerUserId = null,
    string? QcReviewerName = null) : IntegrationEvent;

public record SalesOrderConfirmedItem(
    Guid SalesOrderItemId,
    Guid ProductId,
    decimal Quantity,
    string ProductCode = "",
    string ProductName = "",
    string? MaterialSpec = null,
    string? Notes = null);
