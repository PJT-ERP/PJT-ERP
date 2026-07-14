using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Application.IntegrationEvents;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using Xunit;

namespace MasterData.API.Tests;

public class PurchaseRequestFinanceApprovedEventHandlerTests
{
    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public List<IntegrationEvent> PublishedEvents { get; } = new();

        public Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
        {
            PublishedEvents.Add(integrationEvent);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task Handle_creates_new_inventory_item_and_publishes_link_event_when_item_not_found()
    {
        var options = new DbContextOptionsBuilder<MasterDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        
        await using var db = new MasterDataContext(options);
        var publisher = new RecordingEventPublisher();
        var handler = new PurchaseRequestFinanceApprovedEventHandler(db, publisher);

        var purchaseRequestId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var integrationEvent = new PurchaseRequestFinanceApprovedEvent(
            purchaseRequestId,
            "PR-001",
            new[] { new PurchaseRequestFinanceApprovedItem(itemId, "Adhoc Laptop", "Asset", 1, "pcs") }
        );

        await handler.Handle(integrationEvent, CancellationToken.None);

        var item = await db.InventoryItems.SingleAsync();
        Assert.Equal("MAT-001", item.Code);
        Assert.Equal("Adhoc Laptop", item.Name);
        Assert.Equal("Asset", item.Category);
        Assert.Equal(0, item.CurrentStock);

        var linkEvent = publisher.PublishedEvents
            .OfType<PurchaseItemMasterDataLinkedEvent>()
            .SingleOrDefault();
        
        Assert.NotNull(linkEvent);
        Assert.Equal(itemId, linkEvent.PurchaseRequestItemId);
        Assert.Equal("MAT-001 - Adhoc Laptop", linkEvent.NewItemName);
    }
}
