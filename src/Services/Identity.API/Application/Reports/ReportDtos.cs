using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed class CreateReportRequest
{
    [Required]
    public DateOnly? ReportDate { get; init; }

    [StringLength(2000)]
    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string Summary { get; init; } = string.Empty;

    public List<ReportTaskRequest> Tasks { get; init; } = [];
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed class UpdateReportRequest
{
    public List<Guid> RemovedAttachmentIds { get; init; } = [];
    [StringLength(2000)]
    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string Summary { get; init; } = string.Empty;
    public List<ReportTaskRequest> Tasks { get; init; } = [];
}

public sealed class AddReportAttachmentsRequest
{
    public Guid? TaskId { get; init; }
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}

public sealed class ReportTaskRequest
{
    public Guid? Id { get; init; }
    public string Description { get; init; } = "";
    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string Target { get; init; } = "";
    public string Status { get; init; } = "On Progress";
    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string Result { get; init; } = "";
    public Guid? SalesOrderId { get; init; }
    public string? SalesOrderNumber { get; init; }
    public List<Guid> TaggedUserIds { get; init; } = [];
    public List<IFormFile> Images { get; init; } = [];
    public List<string?> AttachmentCaptions { get; init; } = [];
}
public sealed record ReportUserDto(Guid Id, string Name, string Role);
public sealed record DailyReportTaskDto(Guid Id, string Description, int SortOrder, string Target, string Status, string Result, Guid? SalesOrderId, string? SalesOrderNumber, IReadOnlyList<ReportUserDto> TaggedUsers);
public sealed record DailyReportAttachmentDto(Guid Id, string OriginalFileName, string ContentType, long FileSizeBytes, string? Caption, DateTime CreatedAtUtc, Guid? TaskId);
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
