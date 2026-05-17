namespace PJT_ERP.Purchasing.Api.Domain.Entities;

public sealed class MaterialRequirement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesOrderId { get; set; }
    public SalesOrderSnapshot? SalesOrder { get; set; }
    public string SalesOrderNumber { get; set; } = "";
    public Guid ProductionOrderId { get; set; }
    public string SpkNumber { get; set; } = "";
    public string BarcodeUid { get; set; } = "";
    public Guid ProductId { get; set; }
    public string ProductPartNumber { get; set; } = "";
    public string ProductDescription { get; set; } = "";
    public string? MaterialSpec { get; set; }
    public int RequiredQty { get; set; }
    public string ProjectName { get; set; } = "";
    public string Status { get; set; } = MaterialRequirementStatuses.Required;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<PurchaseRequestItem> PurchaseRequestItems { get; set; } = [];
}

public static class MaterialRequirementStatuses
{
    public const string Required = "Required";
    public const string PurchaseRequested = "PurchaseRequested";
    public const string PurchaseApproved = "PurchaseApproved";
    public const string PurchaseRejected = "PurchaseRejected";
    public const string Ordered = "Ordered";
    public const string Received = "Received";
}
