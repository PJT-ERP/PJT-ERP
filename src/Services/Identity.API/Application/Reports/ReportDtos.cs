using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed class CreateReportRequest
{
    [Required]
    public DateOnly? ReportDate { get; init; }

    [Required, StringLength(2000, MinimumLength = 1)]
    public string Summary { get; init; } = string.Empty;

    public List<string> Tasks { get; init; } = [];
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed class UpdateReportRequest
{
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Summary { get; init; } = string.Empty;
    public List<string> Tasks { get; init; } = [];
}

public sealed class AddReportAttachmentsRequest
{
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed record DailyReportTaskDto(Guid Id, string Description, int SortOrder);
public sealed record DailyReportAttachmentDto(Guid Id, string OriginalFileName, string ContentType, long FileSizeBytes, string? Caption, DateTime CreatedAtUtc);
public sealed record DailyReportDto(Guid Id, Guid UserId, string UserName, string UserRole, DateTime ReportDate, string Summary, IReadOnlyList<DailyReportTaskDto> Tasks, IReadOnlyList<DailyReportAttachmentDto> Attachments, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
public sealed record ReportActor(Guid UserId, string UserName, string Role)
{
    public bool IsOwner => string.Equals(Role, "Owner", StringComparison.OrdinalIgnoreCase);
}

public sealed class DuplicateDailyReportException : Exception
{
    public DuplicateDailyReportException() : base("A daily report already exists for this date.") { }
}

public sealed class DailyReportValidationException(string message) : Exception(message);
