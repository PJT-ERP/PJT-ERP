namespace PJT_HIMTIKA.QC.Api.Domain.Entities;

public sealed class QcInspection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RefNo { get; set; } = "";
    public Guid ProductionOrderId { get; set; }
    public string SpkNumber { get; set; } = "";
    public string BarcodeUid { get; set; } = "";
    public Guid? InspectorId { get; set; }
    public string? InspectorName { get; set; }
    public DateOnly? InspectionDate { get; set; }
    public DateTime? ProductionFinishedAtUtc { get; set; }
    public int? SampleQty { get; set; }
    public string? SamplingMethod { get; set; }
    public string? MeasuringToolNo { get; set; }
    public string Status { get; set; } = QcInspectionStatuses.WaitingProduction;
    public string? Decision { get; set; }
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
    public const string Completed = "Completed";
}
