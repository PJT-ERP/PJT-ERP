namespace PJT_ERP.Finance.Api.Domain.Entities;

public sealed class InvoiceCandidate
{
    public Guid SalesOrderId { get; set; }
    public string SalesOrderNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string? CustomerEmail { get; set; }
    public DateOnly? TargetDate { get; set; }
    public DateTime CompletedAtUtc { get; set; }
    public string Status { get; set; } = InvoiceCandidateStatuses.ReadyForInvoice;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<InvoiceCandidateItem> Items { get; set; } = [];
}

public sealed class InvoiceCandidateItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesOrderId { get; set; }
    public InvoiceCandidate? Candidate { get; set; }
    public Guid SalesOrderItemId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductPartNumber { get; set; } = "";
    public string ProductDescription { get; set; } = "";
    public int Qty { get; set; }
}

public static class InvoiceCandidateStatuses
{
    public const string ReadyForInvoice = "ReadyForInvoice";
    public const string Invoiced = "Invoiced";
}
