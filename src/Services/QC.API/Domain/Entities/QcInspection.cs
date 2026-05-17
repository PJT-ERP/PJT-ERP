namespace PJT_HIMTIKA.QC.Api.Domain.Entities;

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
    public int? OrderQty { get; set; }
    public string? MaterialSpec { get; set; }
    public Guid? InspectorId { get; set; }
    public string? InspectorName { get; set; }
    public DateOnly? InspectionDate { get; set; }
    public DateTime? ProductionFinishedAtUtc { get; set; }
    public int? SampleQty { get; set; }
    public string? SamplingMethod { get; set; }
    public string? MeasuringToolNo { get; set; }
    public string Status { get; set; } = QcInspectionStatuses.WaitingProduction;
    public string? InspectionResult { get; set; }
    public string? DefectNotes { get; set; }
    public string? EngineeringRemarks { get; set; }
    public string? OwnerDecision { get; set; }
    public Guid? OwnerReviewedByUserId { get; set; }
    public string? OwnerReviewerName { get; set; }
    public DateTime? OwnerReviewedAtUtc { get; set; }
    public string? OwnerReviewRemarks { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<QcVisualCheck> VisualChecks { get; set; } = [];
    public List<QcDimensionCheck> DimensionChecks { get; set; } = [];
}

public static class QcInspectionStatuses
{
    public const string WaitingProduction = "WaitingProduction";
    public const string ReadyForInspection = "ReadyForInspection";
    public const string InInspection = "InInspection";
    public const string PendingOwnerReview = "PendingOwnerReview";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

public static class QcInspectionResults
{
    public const string Accept = "Accept";
    public const string Reject = "Reject";
    public const string Repair = "Repair";
    public const string Scrap = "Scrap";
}
