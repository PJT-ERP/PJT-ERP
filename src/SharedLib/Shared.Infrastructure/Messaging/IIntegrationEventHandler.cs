using PJT_ERP.EventBus.Messages.Events;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public interface IIntegrationEventHandler
{
    Task Handle(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default);
}

public interface IIntegrationEventHandler<in TIntegrationEvent> : IIntegrationEventHandler
    where TIntegrationEvent : IntegrationEvent
{
    Task Handle(TIntegrationEvent integrationEvent, CancellationToken cancellationToken = default);

    Task IIntegrationEventHandler.Handle(IntegrationEvent integrationEvent, CancellationToken cancellationToken)
    {
        return Handle((TIntegrationEvent)integrationEvent, cancellationToken);
    }
}
