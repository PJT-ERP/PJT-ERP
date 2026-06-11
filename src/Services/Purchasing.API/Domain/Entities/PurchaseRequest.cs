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
    public Guid? SupervisorReviewedByUserId { get; set; }
    public DateTime? SupervisorReviewedAtUtc { get; set; }
    public string? SupervisorRejectionReason { get; set; }
    public Guid? FinanceReviewedByUserId { get; set; }
    public DateTime? FinanceReviewedAtUtc { get; set; }
    public string? FinanceRejectionReason { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<PurchaseRequestItem> Items { get; set; } = [];
}

public static class PurchaseRequestStatuses
{
    public const string Draft = "Draft";
    public const string Submitted = "Submitted";
    public const string SupervisorApproved = "SupervisorApproved";
    public const string SupervisorRejected = "SupervisorRejected";
    public const string FinanceApproved = "FinanceApproved";
    public const string FinanceRejected = "FinanceRejected";
    public const string Processing = "Processing";
    public const string Completed = "Completed";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

public static class PurchaseRequestReviewStages
{
    public const string Supervisor = "Supervisor";
    public const string Finance = "Finance";
}
