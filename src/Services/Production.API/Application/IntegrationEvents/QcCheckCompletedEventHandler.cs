using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.IntegrationEvents;

public sealed class QcCheckCompletedEventHandler(ProductionContext db, IEventPublisher eventPublisher) : IIntegrationEventHandler<QcCheckCompletedEvent>
{
    public async Task Handle(QcCheckCompletedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var productionOrder = await db.ProductionOrders
            .Include(order => order.SalesOrder)
                .ThenInclude(salesOrder => salesOrder!.Items)
            .FirstOrDefaultAsync(order => order.Id == integrationEvent.ProductionOrderId, cancellationToken);

        if (productionOrder is null)
        {
            return;
        }

        var isApproved = integrationEvent.Decision.Equals("Approved", StringComparison.OrdinalIgnoreCase);
        productionOrder.QcDecision = integrationEvent.Decision;
        productionOrder.Status = isApproved
            ? ProductionOrderStatuses.Closed
            : productionOrder.Status;
        productionOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;

        if (productionOrder.SalesOrder is not null)
        {
            productionOrder.SalesOrder.Status = isApproved
                ? SalesOrderStatuses.Completed
                : productionOrder.SalesOrder.Status;
            productionOrder.SalesOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;

            if (isApproved)
            {
                await eventPublisher.PublishAsync(
                    new SalesOrderReadyForInvoiceEvent(
                        productionOrder.SalesOrder.Id,
                        productionOrder.SalesOrder.SoNumber,
                        productionOrder.SalesOrder.CustomerId,
                        productionOrder.SalesOrder.CustomerCode,
                        productionOrder.SalesOrder.CustomerName,
                        productionOrder.SalesOrder.CustomerEmail,
                        productionOrder.SalesOrder.TargetDate,
                        integrationEvent.CheckedAtUtc,
                        productionOrder.SalesOrder.Items
                            .OrderBy(item => item.ProductPartNumber)
                            .Select(item => new SalesOrderReadyForInvoiceItem(
                                item.Id,
                                item.ProductId,
                                item.ProductPartNumber,
                                item.ProductDescription,
                                item.Qty))
                            .ToArray()),
                    cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
