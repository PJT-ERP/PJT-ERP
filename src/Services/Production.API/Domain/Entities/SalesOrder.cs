namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class SalesOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SoNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string? CustomerEmail { get; set; }
    public string? CustomerDrawingUrl { get; set; }
    public string? DesignReference { get; set; }
    public string DesignStatus { get; set; } = SalesOrderDesignStatuses.PendingDesign;
    public Guid? DesignApprovedByUserId { get; set; }
    public string? DesignApprovedByName { get; set; }
    public DateTime? DesignApprovedAtUtc { get; set; }
    public DateOnly SoDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? TargetDate { get; set; }
    public Guid? DesignWorkerUserId { get; set; }
    public string? DesignWorkerName { get; set; }
    public Guid? ProductionWorkerUserId { get; set; }
    public string? ProductionWorkerName { get; set; }
    public Guid? QcReviewerUserId { get; set; }
    public string? QcReviewerName { get; set; }
    public string Status { get; set; } = SalesOrderStatuses.Draft;
    public string? RejectionReason { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public decimal? EstimatedAmount { get; set; }
    public List<SalesOrderItem> Items { get; set; } = [];
    public List<ProductionOrder> ProductionOrders { get; set; } = [];
    public List<SalesOrderDesignRevision> DesignRevisions { get; set; } = [];
    public List<string> ProductionPhotos { get; set; } = new();
    public List<string> QcPhotos { get; set; } = new();
}

public static class SalesOrderStatuses
{
    public const string Draft = "Draft";
    public const string Confirmed = "Confirmed";
    public const string InProduction = "InProduction";
    public const string QC = "QC";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}

public static class SalesOrderDesignStatuses
{
    public const string PendingDesign = "PendingDesign";
    public const string WaitingApproval = "WaitingApproval";
    public const string Approved = "Approved";
    public const string RevisionRequired = "RevisionRequired";
    public const string Rejected = "Rejected";
}
