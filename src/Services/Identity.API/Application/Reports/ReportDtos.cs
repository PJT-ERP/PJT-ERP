using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed record CreateReportRequest
{
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Summary { get; init; } = "";
    public List<string> Tasks { get; init; } = [];
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed record UpdateReportRequest
{
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Summary { get; init; } = "";
    public List<string> Tasks { get; init; } = [];
}

public sealed record AddReportAttachmentsRequest
{
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed record DailyReportAttachmentDto(Guid Id, string FileName, string ContentType, long FileSizeBytes, string? Caption, string Url);

public sealed record DailyReportDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string UserRole,
    DateTime ReportDate,
    string Summary,
    IReadOnlyList<string> Tasks,
    IReadOnlyList<DailyReportAttachmentDto> Attachments,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record ReportActor(Guid UserId, string UserName, string Role)
{
    public bool IsOwner => string.Equals(Role, "Owner", StringComparison.OrdinalIgnoreCase);
}

public sealed class DuplicateDailyReportException : Exception
{
    public DuplicateDailyReportException() : base("A daily report has already been submitted for today.") { }
}

public sealed class DailyReportValidationException(string message) : Exception(message);
