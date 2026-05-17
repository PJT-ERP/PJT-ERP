using System.Text.Json;
using PJT_ERP.EventBus.Messages.Events;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public sealed class EventBusSubscriptionInfo
{
    public Dictionary<string, Type> EventTypes { get; } = new(StringComparer.Ordinal);
    public JsonSerializerOptions JsonOptions { get; } = new(JsonSerializerDefaults.Web);

    public void Add<TIntegrationEvent>() where TIntegrationEvent : IntegrationEvent
    {
        EventTypes[typeof(TIntegrationEvent).Name] = typeof(TIntegrationEvent);
    }
}
