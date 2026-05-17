using Microsoft.Extensions.DependencyInjection;
using PJT_HIMTIKA.EventBus.Messages.Events;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class EventBusBuilder(IServiceCollection services)
{
    public IServiceCollection Services { get; } = services;

    public EventBusBuilder WithReceiver()
    {
        Services.AddHostedService<PgmqEventReceiver>();
        return this;
    }

    public EventBusBuilder AddSubscription<TIntegrationEvent, THandler>()
        where TIntegrationEvent : IntegrationEvent
        where THandler : class, IIntegrationEventHandler<TIntegrationEvent>
    {
        Services.AddKeyedTransient<IIntegrationEventHandler, THandler>(typeof(TIntegrationEvent));
        Services.Configure<EventBusSubscriptionInfo>(info => info.Add<TIntegrationEvent>());
        return this;
    }
}
