using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.IntegrationEvents;

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
        productionOrder.Status = integrationEvent.Decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
            ? ProductionOrderStatuses.Closed
            : productionOrder.Status;
        productionOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
    }
}
