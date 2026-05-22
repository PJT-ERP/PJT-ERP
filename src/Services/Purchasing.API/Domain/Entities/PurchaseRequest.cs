namespace PJT_ERP.Purchasing.Api.Domain.Entities;

public sealed class PurchaseRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PrNumber { get; set; } = "";
    public DateOnly RequestDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public Guid RequestedByUserId { get; set; }
    public string RequesterName { get; set; } = "";
    public Guid? SalesOrderId { get; set; }
    public string? SalesOrderNumber { get; set; }
    public string? ProjectName { get; set; }
    public string Status { get; set; } = PurchaseRequestStatuses.Draft;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<PurchaseRequestItem> Items { get; set; } = [];
}

public static class PurchaseRequestStatuses
{
    public const string Draft = "Draft";
    public const string Submitted = "Submitted";
    public const string Processing = "Processing";
    public const string Completed = "Completed";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}
