using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.Production.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Production.Api.Application.IntegrationEvents;

public sealed class QcCheckCompletedEventHandler(ProductionContext db) : IIntegrationEventHandler<QcCheckCompletedEvent>
{
    public async Task Handle(QcCheckCompletedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var productionOrder = await db.ProductionOrders
            .FirstOrDefaultAsync(order => order.Id == integrationEvent.ProductionOrderId, cancellationToken);

        if (productionOrder is null)
        {
            return;
        }

        productionOrder.QcDecision = integrationEvent.Decision;
        productionOrder.Status = integrationEvent.Decision.Equals("Accept", StringComparison.OrdinalIgnoreCase)
            ? "Closed"
            : productionOrder.Status;
        productionOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
    }
}
