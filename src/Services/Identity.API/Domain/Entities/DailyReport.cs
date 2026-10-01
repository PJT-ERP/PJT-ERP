namespace PJT_ERP.Identity.Api.Domain.Entities;

public sealed class DailyReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string UserRole { get; set; } = "";
    public DateTime ReportDate { get; set; }
    public string Summary { get; set; } = "";
    public List<DailyReportTask> Tasks { get; set; } = [];
    public List<DailyReportAttachment> Attachments { get; set; } = [];
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class DailyReportTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DailyReportId { get; set; }
    public string Description { get; set; } = "";
    public int SortOrder { get; set; }
    public DailyReport? DailyReport { get; set; }
}

public sealed class DailyReportAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DailyReportId { get; set; }
    public string StoredFileName { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string? Caption { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DailyReport? DailyReport { get; set; }
}
