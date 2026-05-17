using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.Production.Api.Domain.Entities;
using PJT_HIMTIKA.Production.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Production.Api.Application.IntegrationEvents;

public sealed class MasterDataUpdatedEventHandler(ProductionContext db) : IIntegrationEventHandler<MasterDataUpdatedEvent>
{
    public async Task Handle(MasterDataUpdatedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        if (integrationEvent.EntityType.Equals("Customer", StringComparison.OrdinalIgnoreCase))
        {
            var customer = await db.CustomerReplicas.FirstOrDefaultAsync(replica => replica.Id == integrationEvent.EntityId, cancellationToken);
            if (customer is null)
            {
                customer = new CustomerReplica { Id = integrationEvent.EntityId };
                await db.CustomerReplicas.AddAsync(customer, cancellationToken);
            }

            customer.Code = integrationEvent.Code;
            customer.Name = integrationEvent.Name;
            customer.IsActive = !integrationEvent.Action.Equals("Deleted", StringComparison.OrdinalIgnoreCase);
            customer.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        }
        else if (integrationEvent.EntityType.Equals("Product", StringComparison.OrdinalIgnoreCase))
        {
            var product = await db.ProductReplicas.FirstOrDefaultAsync(replica => replica.Id == integrationEvent.EntityId, cancellationToken);
            if (product is null)
            {
                product = new ProductReplica { Id = integrationEvent.EntityId };
                await db.ProductReplicas.AddAsync(product, cancellationToken);
            }

            product.PartNumber = integrationEvent.Code;
            product.Description = integrationEvent.Name;
            product.IsActive = !integrationEvent.Action.Equals("Deleted", StringComparison.OrdinalIgnoreCase);
            product.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
