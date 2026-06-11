namespace PJT_ERP.Finance.Api.Domain.Entities;

public sealed class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string InvoiceNumber { get; set; } = "";
    public Guid SalesOrderId { get; set; }
    public string SalesOrderNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string? CustomerEmail { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PaymentPercent { get; set; }
    public string Status { get; set; } = InvoiceStatuses.Issued;
    public string? BankName { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<InvoiceItem> Items { get; set; } = [];
    public List<PaymentSchedule> PaymentSchedules { get; set; } = [];
    public List<PaymentRecord> Payments { get; set; } = [];
    public List<PaymentVerificationRequest> PaymentVerificationRequests { get; set; } = [];
    public List<CollectionLetter> CollectionLetters { get; set; } = [];
}

public sealed class InvoiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public Guid SalesOrderItemId { get; set; }
    public Guid ProductId { get; set; }
    public string PartNumber { get; set; } = "";
    public string Description { get; set; } = "";
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public sealed class PaymentSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public string Label { get; set; } = "";
    public decimal Percentage { get; set; }
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public bool IsPaid { get; set; }
}

public sealed class PaymentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class PaymentVerificationRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string BankName { get; set; } = "";
    public string? BankReference { get; set; }
    public string? ProofFileName { get; set; }
    public string? ProofFileUrl { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = PaymentVerificationStatuses.Pending;
    public string SubmittedBy { get; set; } = "Sales";
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    public string? VerifiedBy { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
}

public sealed class CollectionLetter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public string LetterNumber { get; set; } = "";
    public DateOnly IssuedDate { get; set; }
    public DateOnly DueDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class InvoiceStatuses
{
    public const string Issued = "Issued";
    public const string PartiallyPaid = "PartiallyPaid";
    public const string Paid = "Paid";
    public const string Overdue = "Overdue";
}

public static class PaymentVerificationStatuses
{
    public const string Pending = "Pending";
    public const string Verified = "Verified";
    public const string Rejected = "Rejected";
}
