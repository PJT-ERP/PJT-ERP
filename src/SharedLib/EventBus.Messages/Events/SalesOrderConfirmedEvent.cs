namespace PJT_HIMTIKA.EventBus.Messages.Events;

public record SalesOrderConfirmedEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    DateTime ConfirmedAtUtc) : IntegrationEvent;
