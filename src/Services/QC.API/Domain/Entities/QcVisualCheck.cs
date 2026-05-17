namespace PJT_HIMTIKA.QC.Api.Domain.Entities;

public sealed class QcVisualCheck
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QcInspectionId { get; set; }
    public QcInspection? QcInspection { get; set; }
    public DateOnly? CheckDate { get; set; }
    public int QtyChecked { get; set; }
    public int QtyAccept { get; set; }
    public int QtyReject { get; set; }
    public int QtyRepair { get; set; }
    public int QtyScrap { get; set; }
    public string? NcRef { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
