using PJT_HIMTIKA.EventBus.Messages.Events;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public interface IEventPublisher
{
    Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default);
}
