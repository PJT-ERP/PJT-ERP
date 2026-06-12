namespace PJT_ERP.EventBus.Messages.Events;

public record InvoicePaymentRecordedEvent(
    Guid InvoiceId,
    string InvoiceNumber,
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    decimal PaymentAmount,
    decimal PaidAmount,
    decimal TotalAmount,
    decimal PaymentPercent,
    DateOnly PaymentDate,
    bool IsFullyPaid) : IntegrationEvent;
