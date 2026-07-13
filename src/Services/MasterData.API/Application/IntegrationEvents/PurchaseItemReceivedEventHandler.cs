using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Application.IntegrationEvents;

public sealed class PurchaseItemReceivedEventHandler(MasterDataContext db) : IIntegrationEventHandler<PurchaseItemReceivedEvent>
{
    public async Task Handle(PurchaseItemReceivedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var searchName = integrationEvent.ItemName.Trim().ToLower();
        var inventoryItem = await db.InventoryItems
            .FirstOrDefaultAsync(item => 
                item.Name.ToLower() == searchName || 
                searchName.Contains(item.Code.ToLower()), cancellationToken);

        if (inventoryItem is not null)
        {
            inventoryItem.CurrentStock += integrationEvent.QuantityReceived;
            inventoryItem.UpdatedAtUtc = DateTime.UtcNow;
        }
        else
        {
            var existingCodes = await db.InventoryItems
                .Where(i => i.Code.StartsWith("MAT-"))
                .Select(i => i.Code)
                .ToListAsync(cancellationToken);
            
            var max = 0;
            foreach (var existingCode in existingCodes)
            {
                if (existingCode.Length <= 4) continue;
                if (int.TryParse(existingCode[4..], out var number) && number > max)
                {
                    max = number;
                }
            }
            var newCode = $"MAT-{(max + 1):000}";

            inventoryItem = new Domain.Entities.InventoryItem
            {
                Id = Guid.NewGuid(),
                Code = newCode,
                Name = integrationEvent.ItemName.Trim(),
                Category = string.IsNullOrWhiteSpace(integrationEvent.Category) ? "Consumable" : integrationEvent.Category,
                Unit = "pcs",
                CurrentStock = integrationEvent.QuantityReceived,
                Location = "General",
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            db.InventoryItems.Add(inventoryItem);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
