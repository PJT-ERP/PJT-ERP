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

        if (salesOrder.Status == SalesOrderStatuses.Draft || salesOrder.Status == "Menunggu Invoice DP")
        {
            salesOrder.Status = SalesOrderStatuses.Confirmed;
            salesOrder.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
