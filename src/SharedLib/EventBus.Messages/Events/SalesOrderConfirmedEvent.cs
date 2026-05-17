namespace PJT_ERP.EventBus.Messages.Events;

public record SalesOrderConfirmedEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    DateTime ConfirmedAtUtc) : IntegrationEvent;
