namespace PJT_HIMTIKA.QC.Api.Domain.Entities;

public sealed class QcDimensionCheck
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QcInspectionId { get; set; }
    public QcInspection? QcInspection { get; set; }
    public DateOnly? CheckDate { get; set; }
    public string SampleId { get; set; } = "";
    public string Process { get; set; } = "";
    public string DimensionDataJson { get; set; } = "{}";
    public Guid? OperatorId { get; set; }
    public string? OperatorName { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
