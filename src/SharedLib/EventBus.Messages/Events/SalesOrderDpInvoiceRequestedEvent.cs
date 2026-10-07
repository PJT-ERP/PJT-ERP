namespace PJT_ERP.EventBus.Messages.Events;

public record SalesOrderDpInvoiceRequestedEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    DateOnly? TargetDate,
    decimal QuotationAmount,
    decimal DpPercentage,
    DateOnly DpDueDate,
    IReadOnlyCollection<SalesOrderDpInvoiceItem> Items) : IntegrationEvent;

public record SalesOrderDpInvoiceItem(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty);
