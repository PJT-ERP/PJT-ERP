using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.IntegrationEvents;

public sealed class PurchaseItemMasterDataLinkedEventHandler(PurchasingContext db) : IIntegrationEventHandler<PurchaseItemMasterDataLinkedEvent>
{
    public async Task Handle(PurchaseItemMasterDataLinkedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var item = await db.PurchaseRequestItems
            .FirstOrDefaultAsync(i => i.Id == integrationEvent.PurchaseRequestItemId, cancellationToken);

        if (item != null)
        {
            item.ItemName = integrationEvent.NewItemName;
            item.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
