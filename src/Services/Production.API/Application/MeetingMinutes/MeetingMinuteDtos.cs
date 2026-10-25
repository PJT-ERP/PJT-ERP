namespace PJT_ERP.Production.Api.Application.MeetingMinutes;

public class SaveMeetingMinuteRequest
{
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateOnly? MeetingDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Discussion { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
    public string Participants { get; set; } = string.Empty;
    public string? ResultFileUrl { get; set; }
    public string? ResultFileName { get; set; }
    public DateOnly? FeedbackDeadline { get; set; }
}

public class MeetingMinuteDto
{
    public Guid Id { get; set; }
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateOnly MeetingDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Discussion { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
    public string Participants { get; set; } = string.Empty;
    public string? ResultFileUrl { get; set; }
    public string? ResultFileName { get; set; }
    public DateOnly? FeedbackDeadline { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public string? UpdatedByName { get; set; }
}
