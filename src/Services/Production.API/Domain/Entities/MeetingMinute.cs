namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class MeetingMinute
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateOnly MeetingDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Discussion { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
    public DateOnly? FeedbackDeadline { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}
