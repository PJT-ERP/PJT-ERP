using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PJT_HIMTIKA.EventBus.Messages.Events;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class OutboxEventPublisher<TContext>(
    TContext dbContext,
    IOptions<EventBusSubscriptionInfo> subscriptionInfo) : IEventPublisher
    where TContext : DbContext
{
    public async Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var message = OutboxMessage.FromEvent(integrationEvent, subscriptionInfo.Value.JsonOptions);
        await dbContext.Set<OutboxMessage>().AddAsync(message, cancellationToken);
    }
}
