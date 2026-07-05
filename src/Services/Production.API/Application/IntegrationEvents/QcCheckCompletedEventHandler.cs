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

        var decision = NormalizeDecision(integrationEvent.Decision);
        var isGo = decision == "Go";
        productionOrder.QcDecision = decision;
        productionOrder.Status = isGo
            ? ProductionOrderStatuses.Closed
            : ProductionOrderStatuses.Waiting;
        productionOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;

        if (!isGo)
        {
            productionOrder.FinishedAtUtc = null;
        }

        if (productionOrder.SalesOrder is not null)
        {
            productionOrder.SalesOrder.Status = isGo
                ? SalesOrderStatuses.Completed
                : productionOrder.SalesOrder.Status;
            productionOrder.SalesOrder.UpdatedAtUtc = integrationEvent.CheckedAtUtc;
            productionOrder.SalesOrder.ProductionPhotos = integrationEvent.ProductionPhotos.ToList();
            productionOrder.SalesOrder.QcPhotos = integrationEvent.QcPhotos.ToList();

            if (isGo)
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
                                item.Qty,
                                item.UnitPrice))
                            .ToArray()),
                    cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeDecision(string decision)
    {
        if (decision.Equals("Go", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Pass", StringComparison.OrdinalIgnoreCase))
        {
            return "Go";
        }

        if (decision.Equals("NoGo", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("No Go", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Fail", StringComparison.OrdinalIgnoreCase))
        {
            return "NoGo";
        }

        return decision;
    }
}
