using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.IntegrationEvents;

public sealed class SalesOrderConfirmedEventHandler(PurchasingContext db) : IIntegrationEventHandler<SalesOrderConfirmedEvent>
{
    public async Task Handle(SalesOrderConfirmedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var snapshot = await db.SalesOrderSnapshots
            .FirstOrDefaultAsync(order => order.SalesOrderId == integrationEvent.SalesOrderId, cancellationToken);

        if (snapshot is null)
        {
            snapshot = new SalesOrderSnapshot
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderNumber = integrationEvent.SalesOrderNumber,
                CustomerId = integrationEvent.CustomerId,
                ConfirmedAtUtc = integrationEvent.ConfirmedAtUtc,
                UpdatedAtUtc = integrationEvent.ConfirmedAtUtc
            };
            await db.SalesOrderSnapshots.AddAsync(snapshot, cancellationToken);
        }
        else
        {
            snapshot.SalesOrderNumber = integrationEvent.SalesOrderNumber;
            snapshot.CustomerId = integrationEvent.CustomerId;
            snapshot.ConfirmedAtUtc = integrationEvent.ConfirmedAtUtc;
            snapshot.UpdatedAtUtc = integrationEvent.ConfirmedAtUtc;
        }

        var requirements = await db.MaterialRequirements
            .Where(requirement => requirement.SalesOrderId == integrationEvent.SalesOrderId)
            .ToListAsync(cancellationToken);

        foreach (var requirement in requirements)
        {
            requirement.SalesOrderNumber = integrationEvent.SalesOrderNumber;
            if (string.IsNullOrWhiteSpace(requirement.ProjectName))
            {
                requirement.ProjectName = integrationEvent.SalesOrderNumber;
            }

            requirement.UpdatedAtUtc = integrationEvent.ConfirmedAtUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
