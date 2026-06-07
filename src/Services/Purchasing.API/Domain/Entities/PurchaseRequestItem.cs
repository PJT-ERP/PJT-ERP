namespace PJT_ERP.Purchasing.Api.Domain.Entities;

public sealed class PurchaseRequestItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PurchaseRequestId { get; set; }
    public PurchaseRequest? PurchaseRequest { get; set; }
    public Guid? MaterialRequirementId { get; set; }
    public MaterialRequirement? MaterialRequirement { get; set; }
    public Guid? SalesOrderId { get; set; }
    public string? SalesOrderNumber { get; set; }
    public Guid? ProductionOrderId { get; set; }
    public string? SpkNumber { get; set; }
    public string? ProjectName { get; set; }
    public string ItemName { get; set; } = "";
    public string? Size { get; set; }
    public int Qty { get; set; }
    public string Urgency { get; set; } = PurchaseItemUrgencies.Normal;
    public string? SuggestedSupplier { get; set; }
    public string? SupplierName { get; set; }
    public string? PoNumber { get; set; }
    public decimal? EstimatedPrice { get; set; }
    public DateOnly? PurchaseDate { get; set; }
    public DateOnly? ExpectedArrivalDate { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public string PurchaseStatus { get; set; } = PurchaseItemStatuses.Requested;
    public string? PurchaseNotes { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class PurchaseItemStatuses
{
    public const string Requested = "Requested";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Ordered = "Ordered";
    public const string Received = "Received";
}

public static class PurchaseItemUrgencies
{
    public const string Normal = "Normal";
    public const string Urgent = "Urgent";
    public const string Critical = "Critical";
}
