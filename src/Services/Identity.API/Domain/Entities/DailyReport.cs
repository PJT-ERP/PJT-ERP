namespace PJT_ERP.Identity.Api.Domain.Entities;

public sealed class DailyReport
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<DailyReportTask> Tasks { get; set; } = [];
    public List<DailyReportAttachment> Attachments { get; set; } = [];
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class DailyReportTask
{
    public Guid Id { get; set; }
    public Guid DailyReportId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DailyReport? DailyReport { get; set; }
}

public sealed class DailyReportAttachment
{
    public Guid Id { get; set; }
    public Guid DailyReportId { get; set; }
    public string StoredFilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Caption { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DailyReport? DailyReport { get; set; }
}
