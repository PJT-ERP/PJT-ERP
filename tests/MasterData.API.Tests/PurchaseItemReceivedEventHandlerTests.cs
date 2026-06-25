using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Application.IntegrationEvents;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;

namespace MasterData.API.Tests;

public sealed class PurchaseItemReceivedEventHandlerTests
{
    [Fact]
    public async Task Handle_Increments_InventoryItem_CurrentStock_When_Item_Exists()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<MasterDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new MasterDataContext(options);
        var inventoryItem = new InventoryItem
        {
            Code = "MAT-001",
            Name = "S45C Round Bar",
            CurrentStock = 10
        };
        await db.InventoryItems.AddAsync(inventoryItem);
        await db.SaveChangesAsync();

        var handler = new PurchaseItemReceivedEventHandler(db);
        var integrationEvent = new PurchaseItemReceivedEvent(
            Guid.NewGuid(),
            "PO-001",
            Guid.NewGuid(),
            "S45C Round Bar",
            5,
            DateOnly.FromDateTime(DateTime.UtcNow)
        );

        // Act
        await handler.Handle(integrationEvent, CancellationToken.None);

        // Assert
        var updatedItem = await db.InventoryItems.SingleAsync(i => i.Id == inventoryItem.Id);
        Assert.Equal(15, updatedItem.CurrentStock);
    }
}
