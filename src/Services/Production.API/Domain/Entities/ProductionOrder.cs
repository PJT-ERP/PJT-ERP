namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class ProductionOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PoNumber { get; set; } = "";
    public Guid SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public Guid? SalesOrderItemId { get; set; }
    public SalesOrderItem? SalesOrderItem { get; set; }
    public string? DrawingRef { get; set; }
    public string? DrawingFileUrl { get; set; }
    public Guid? DrawingUploadedByUserId { get; set; }
    public string? DrawingUploaderName { get; set; }
    public DateTime? DrawingUploadedAtUtc { get; set; }
    public string BarcodeUid { get; set; } = "";
    public int OrderQty { get; set; }
    public string Status { get; set; } = ProductionOrderStatuses.Waiting;
    public DateTime? StartedAtUtc { get; set; }
    public Guid? StartedByUserId { get; set; }
    public string? StartedByName { get; set; }
    public DateTime? FinishedAtUtc { get; set; }
    public Guid? FinishedByUserId { get; set; }
    public string? FinishedByName { get; set; }
    public string? QcDecision { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ProductionOrderStatuses
{
    public const string Waiting = "Waiting";
    public const string InProgress = "InProgress";
    public const string Finished = "Finished";
    public const string Closed = "Closed";
}
