namespace PJT_ERP.Finance.Api.Application.Finance;

public record InvoiceCandidateDto(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    DateOnly? TargetDate,
    DateTime CompletedAtUtc,
    string Status,
    IReadOnlyCollection<InvoiceCandidateItemDto> Items);

public record InvoiceCandidateItemDto(
    Guid SalesOrderItemId,
    Guid ProductId,
    string ProductPartNumber,
    string ProductDescription,
    int Qty,
    decimal UnitPrice);

public record CreateInvoiceRequest(
    Guid SalesOrderId,
    DateOnly InvoiceDate,
    DateOnly DueDate,
    decimal TaxPercent,
    IReadOnlyCollection<CreateInvoiceItemPrice> Items,
    IReadOnlyCollection<CreatePaymentScheduleRequest> PaymentSchedules,
    string? BankName,
    string? BankAccountName,
    string? BankAccountNumber);

public record CreateInvoiceItemPrice(Guid SalesOrderItemId, decimal UnitPrice);

public record CreatePaymentScheduleRequest(
    string Label,
    decimal Percentage,
    DateOnly DueDate);

public record RecordPaymentRequest(
    DateOnly PaymentDate,
    decimal Amount,
    string? Notes);

public record CreateCollectionLetterRequest(
    DateOnly IssuedDate,
    DateOnly DueDate,
    string? Notes);

public record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    DateOnly InvoiceDate,
    DateOnly DueDate,
    decimal Subtotal,
    decimal TaxPercent,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RemainingAmount,
    decimal PaymentPercent,
    string Status,
    string? BankName,
    string? BankAccountName,
    string? BankAccountNumber,
    IReadOnlyCollection<InvoiceItemDto> Items,
    IReadOnlyCollection<PaymentScheduleDto> PaymentSchedules,
    IReadOnlyCollection<PaymentRecordDto> Payments,
    IReadOnlyCollection<CollectionLetterDto> CollectionLetters);

public record InvoiceItemDto(
    Guid SalesOrderItemId,
    Guid ProductId,
    string PartNumber,
    string Description,
    int Qty,
    decimal UnitPrice,
    decimal LineTotal);

public record PaymentScheduleDto(
    Guid Id,
    string Label,
    decimal Percentage,
    decimal Amount,
    DateOnly DueDate,
    bool IsPaid);

public record PaymentRecordDto(
    Guid Id,
    DateOnly PaymentDate,
    decimal Amount,
    string? Notes);

public record CollectionLetterDto(
    Guid Id,
    string LetterNumber,
    DateOnly IssuedDate,
    DateOnly DueDate,
    string? Notes);

public record FinanceDashboardDto(
    Guid? CustomerId,
    string? CustomerName,
    int InvoiceCount,
    int OverdueInvoiceCount,
    decimal TotalBilled,
    decimal TotalPaid,
    decimal OutstandingAmount,
    decimal OverdueAmount,
    decimal AveragePaymentPercent);
