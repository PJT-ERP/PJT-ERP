namespace PJT_ERP.Identity.Api.Domain.Entities;

public sealed class DailyReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string UserRole { get; set; } = "";
    public string Description { get; set; } = "";
    public string? PhotoUrl { get; set; }
    public DateTime ReportDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
