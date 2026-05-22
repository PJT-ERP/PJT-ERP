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
            .Include(order => order.SalesOrder)
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

        if (productionOrder.SalesOrder is not null)
        {
            productionOrder.SalesOrder.Status = integrationEvent.Decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                ? SalesOrderStatuses.Completed
                : productionOrder.SalesOrder.Status;
            productionOrder.SalesOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
