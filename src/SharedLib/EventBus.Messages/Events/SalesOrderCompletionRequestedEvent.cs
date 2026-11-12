namespace PJT_ERP.EventBus.Messages.Events;

public sealed record SalesOrderCompletionRequestedEvent(
    Guid InvoiceId,
    string InvoiceNumber,
    Guid SalesOrderId,
    string SalesOrderNumber) : IntegrationEvent;
