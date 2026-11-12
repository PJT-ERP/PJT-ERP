using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace Production.API.Tests;

public sealed class SalesOrderCompletionRequestedEventHandlerTests
{
    [Fact]
    public async Task Handler_marks_the_invoice_sales_order_completed()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new ProductionContext(options);
        await db.Database.EnsureCreatedAsync();
        var order = new SalesOrder { SoNumber = "SO-2026-900", Status = "Pending Design" };
        db.SalesOrders.Add(order);
        await db.SaveChangesAsync();
        var handler = new SalesOrderCompletionRequestedEventHandler(db);

        await handler.Handle(new SalesOrderCompletionRequestedEvent(
            Guid.NewGuid(), "INV-2026-900", order.Id, order.SoNumber), CancellationToken.None);

        Assert.Equal(SalesOrderStatuses.Completed, order.Status);
    }

    [Fact]
    public async Task Handler_does_not_change_cancelled_orders()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new ProductionContext(options);
        await db.Database.EnsureCreatedAsync();
        var order = new SalesOrder { SoNumber = "SO-2026-901", Status = SalesOrderStatuses.Cancelled };
        db.SalesOrders.Add(order);
        await db.SaveChangesAsync();
        var handler = new SalesOrderCompletionRequestedEventHandler(db);

        await handler.Handle(new SalesOrderCompletionRequestedEvent(
            Guid.NewGuid(), "INV-2026-901", order.Id, order.SoNumber), CancellationToken.None);

        Assert.Equal(SalesOrderStatuses.Cancelled, order.Status);
    }
}
