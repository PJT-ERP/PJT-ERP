using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Application.IntegrationEvents;

public sealed class PurchaseItemReceivedEventHandler(MasterDataContext db) : IIntegrationEventHandler<PurchaseItemReceivedEvent>
{
    public async Task Handle(PurchaseItemReceivedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        // Try to find the item in inventory by its exact name, or if the name contains the item code
        var inventoryItem = await db.InventoryItems
            .FirstOrDefaultAsync(item => 
                item.Name == integrationEvent.ItemName || 
                integrationEvent.ItemName.Contains(item.Code), cancellationToken);

        if (inventoryItem is not null)
        {
            inventoryItem.CurrentStock += integrationEvent.QuantityReceived;
            inventoryItem.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
