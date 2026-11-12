using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.IntegrationEvents;

public sealed class SalesOrderCompletionRequestedEventHandler(ProductionContext db)
    : IIntegrationEventHandler<SalesOrderCompletionRequestedEvent>
{
    public async Task Handle(SalesOrderCompletionRequestedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var order = await db.SalesOrders.FirstOrDefaultAsync(
            order => order.Id == integrationEvent.SalesOrderId,
            cancellationToken);

        if (order is null || order.Status is SalesOrderStatuses.Completed or SalesOrderStatuses.Cancelled)
        {
            return;
        }

        order.Status = SalesOrderStatuses.Completed;
        order.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        await db.SaveChangesAsync(cancellationToken);
    }
}
