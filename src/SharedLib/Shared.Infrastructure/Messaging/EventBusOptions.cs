namespace PJT_ERP.Shared.Infrastructure.Messaging;

public sealed class EventBusOptions
{
    public string QueueName { get; set; } = "pjt_default_events";
    public List<string> FanOutQueues { get; set; } = [];
    public int VisibilityTimeoutSeconds { get; set; } = 30;
    public int RetryCount { get; set; } = 5;
    public string DlqName => $"{QueueName}_dlq";
}
