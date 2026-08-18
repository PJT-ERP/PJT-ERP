using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Application.IntegrationEvents;

public sealed class PurchaseRequestFinanceApprovedEventHandler(MasterDataContext db, IEventPublisher eventPublisher) 
    : IIntegrationEventHandler<PurchaseRequestFinanceApprovedEvent>
{
    public async Task Handle(PurchaseRequestFinanceApprovedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        foreach (var prItem in integrationEvent.Items)
        {
            var searchName = prItem.ItemName.Trim().ToLower();
            var inventoryItem = await db.InventoryItems
                .FirstOrDefaultAsync(item => 
                    item.Name.ToLower() == searchName || 
                    searchName.Contains(item.Code.ToLower()), cancellationToken);

            if (inventoryItem == null)
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
                    Name = prItem.ItemName.Trim(),
                    Category = string.IsNullOrWhiteSpace(prItem.PurchaseCategory) ? "Consumable" : prItem.PurchaseCategory,
                    Unit = !string.IsNullOrWhiteSpace(prItem.Unit) ? prItem.Unit : "pcs",
                    CurrentStock = 0, // Didaftarkan tapi belum ada barang fisik (0)
                    Location = "General",
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                db.InventoryItems.Add(inventoryItem);
            }

            // Sync the updated name (with MAT-XXX prefix) back to Purchasing.API
            var newItemName = $"{inventoryItem.Code} - {inventoryItem.Name}";
            await eventPublisher.PublishAsync(
                new PurchaseItemMasterDataLinkedEvent(prItem.PurchaseRequestItemId, newItemName), 
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
