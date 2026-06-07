namespace PJT_ERP.EventBus.Messages.Events;

public record SalesOrderReadyForInvoiceEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    DateOnly? TargetDate,
    DateTime CompletedAtUtc,
    IReadOnlyCollection<SalesOrderReadyForInvoiceItem> Items) : IntegrationEvent;

public record SalesOrderReadyForInvoiceItem(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty);
