using System.Text.Json;
using PJT_HIMTIKA.EventBus.Messages.Events;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class OutboxMessage
{
    private OutboxMessage()
    {
    }

    private OutboxMessage(string type, string content)
    {
        Id = Guid.NewGuid();
        Type = type;
        Content = content;
        OccurredAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Type { get; private set; } = "";
    public string Content { get; private set; } = "";
    public DateTime OccurredAtUtc { get; private set; }
    public DateTime? ProcessedAtUtc { get; private set; }
    public int Attempts { get; private set; }
    public string? Error { get; private set; }

    public static OutboxMessage FromEvent(IntegrationEvent integrationEvent, JsonSerializerOptions options)
    {
        return new OutboxMessage(integrationEvent.GetType().Name, JsonSerializer.Serialize(integrationEvent, integrationEvent.GetType(), options));
    }

    public void MarkProcessed(DateTime processedAtUtc)
    {
        ProcessedAtUtc = processedAtUtc;
        Error = null;
    }

    public void MarkFailed(string error)
    {
        Attempts++;
        Error = error;
    }
}
