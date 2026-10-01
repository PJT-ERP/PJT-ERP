using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed record CreateReportRequest
{
    public string Description { get; init; } = "";
    public IFormFile? Photo { get; init; }
}

public sealed record DailyReportDto
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string UserName { get; init; } = "";
    public string UserRole { get; init; } = "";
    public string Description { get; init; } = "";
    public string? PhotoUrl { get; init; }
    public DateTime ReportDate { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}
