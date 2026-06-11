namespace PJT_ERP.QC.Api.Domain.Entities;

public sealed class QcInspection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RefNo { get; set; } = "";
    public Guid ProductionOrderId { get; set; }
    public string SpkNumber { get; set; } = "";
    public string BarcodeUid { get; set; } = "";
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public string? PorNumber { get; set; }
    public string? DrawingRef { get; set; }
    public string? CustomerDrawingUrl { get; set; }
    public string? DesignReference { get; set; }
    public int? OrderQty { get; set; }
    public string? MaterialSpec { get; set; }
    public DateTime? ProductionFinishedAtUtc { get; set; }
    public Guid? AssignedReviewerUserId { get; set; }
    public string? AssignedReviewerName { get; set; }
    public string? QcImageUrl { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = QcInspectionStatuses.WaitingProduction;
    public string? Decision { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewerName { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class QcInspectionStatuses
{
    public const string WaitingProduction = "WaitingProduction";
    public const string ReadyForInspection = "ReadyForInspection";
    public const string Go = "Go";
    public const string NoGo = "NoGo";

    public const string Approved = Go;
    public const string Rejected = NoGo;
}
