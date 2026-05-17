using PJT_ERP.EventBus.Messages.Events;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public interface IEventPublisher
{
    Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default);
}
