using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.IntegrationEvents;

public sealed class InvoicePaymentRecordedEventHandler(ProductionContext db) : IIntegrationEventHandler<InvoicePaymentRecordedEvent>
{
    public async Task Handle(InvoicePaymentRecordedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        if (integrationEvent.PaidAmount <= 0)
        {
            return;
        }

        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == integrationEvent.SalesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return;
        }

        if (salesOrder.Status is SalesOrderStatuses.Cancelled
            or SalesOrderStatuses.Completed
            or SalesOrderStatuses.InProduction)
        {
            return;
        }

        if (salesOrder.DesignStatus != SalesOrderDesignStatuses.Approved)
        {
            return;
        }

        if (salesOrder.Status == SalesOrderStatuses.Draft || salesOrder.Status == "Waiting Payment")
        {
            var now = DateTime.UtcNow;
            salesOrder.Status = SalesOrderStatuses.Confirmed;
            salesOrder.ApprovedAtUtc ??= now;
            salesOrder.UpdatedAtUtc = now;

            // Initialize Production Order
            var firstItem = salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First();
            var productionOrder = await db.ProductionOrders
                .OrderBy(po => po.CreatedAtUtc)
                .FirstOrDefaultAsync(po => po.SalesOrderId == salesOrder.Id, cancellationToken);
                
            if (productionOrder is null)
            {
                productionOrder = new ProductionOrder
                {
                    SalesOrderId = salesOrder.Id,
                    SalesOrder = salesOrder,
                    SalesOrderItemId = firstItem.Id,
                    PoNumber = salesOrder.SoNumber,
                    DrawingRef = salesOrder.SoNumber,
                    BarcodeUid = $"PJT|SO|{now:yyyyMMdd}|{salesOrder.Id:N}",
                    OrderQty = salesOrder.Items.Sum(item => item.Qty)
                };

                await db.ProductionOrders.AddAsync(productionOrder, cancellationToken);
                salesOrder.ProductionOrders.Add(productionOrder);
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
