using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PJT_ERP.EventBus.Messages.Events;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public sealed class EventDispatcher(
    IServiceProvider serviceProvider,
    IOptions<EventBusSubscriptionInfo> subscriptionInfo,
    ILogger<EventDispatcher> logger)
{
    public async Task DispatchAsync(string eventName, JsonElement payload, CancellationToken cancellationToken)
    {
        if (!subscriptionInfo.Value.EventTypes.TryGetValue(eventName, out var eventType))
        {
            logger.LogDebug("No local subscription for integration event {EventName}.", eventName);
            return;
        }

        var integrationEvent = payload.Deserialize(eventType, subscriptionInfo.Value.JsonOptions) as IntegrationEvent
            ?? throw new InvalidOperationException($"Unable to deserialize integration event {eventName}.");

        var handlers = serviceProvider.GetKeyedServices<IIntegrationEventHandler>(eventType).ToArray();
        if (handlers.Length == 0)
        {
            logger.LogDebug("Integration event {EventName} has no registered handlers.", eventName);
            return;
        }

        foreach (var handler in handlers)
        {
            await handler.Handle(integrationEvent, cancellationToken);
        }
    }
}
