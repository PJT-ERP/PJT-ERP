using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Controllers;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using Microsoft.AspNetCore.Authorization;

namespace Production.API.Tests;

public sealed class ProductionServiceTests
{
    [Fact]
    public void ShopFloorController_allows_owner_not_engineering_for_status_scans()
    {
        var authorize = Assert.Single(
            typeof(ShopFloorController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
                .Cast<AuthorizeAttribute>());

        Assert.Equal("Admin,Owner", authorize.Roles);
    }

    [Fact]
    public void PublicTrackingController_allows_anonymous_customer_tracking()
    {
        var allowAnonymous = Assert.Single(
            typeof(PublicTrackingController)
                .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false)
                .Cast<AllowAnonymousAttribute>());

        Assert.NotNull(allowAnonymous);
    }


    [Fact]
    public async Task ConfirmSalesOrderAsync_creates_barcode_orders_with_sales_order_links()
    {
        await using var db = CreateDbContext();
        var customer = new CustomerReplica
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "CUST-001",
            Name = "PT Customer"
        };
        var product = new ProductReplica
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            PartNumber = "PART-001",
            Description = "Shaft Diameter 20mm",
            MaterialSpec = "S45C"
        };
        await db.CustomerReplicas.AddAsync(customer);
        await db.ProductReplicas.AddAsync(product);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher);
        var salesOrder = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(
                customer.Id,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                [new CreateSalesOrderItemRequest(product.Id, 10, "Urgent")]),
            CancellationToken.None);

        var productionOrders = await service.ConfirmSalesOrderAsync(
            salesOrder.Id,
            new ConfirmSalesOrderRequest(Guid.Parse("33333333-3333-3333-3333-333333333333")),
            CancellationToken.None);

        var productionOrder = Assert.Single(productionOrders);
        Assert.Equal(ProductionOrderStatuses.Waiting, productionOrder.Status);
        Assert.Equal(salesOrder.Id, productionOrder.SalesOrderId);
        Assert.Equal(salesOrder.SoNumber, productionOrder.SoNumber);
        Assert.Equal(customer.Code, productionOrder.CustomerCode);
        Assert.Equal(product.Id, productionOrder.ProductId);
        Assert.Equal(product.PartNumber, productionOrder.ProductPartNumber);
        Assert.StartsWith("PJT|SPK|", productionOrder.BarcodeUid, StringComparison.Ordinal);
        Assert.Null(productionOrder.DurationSeconds);

        Assert.Contains(eventPublisher.PublishedEvents, item => item is SalesOrderConfirmedEvent);
        Assert.Contains(eventPublisher.PublishedEvents, item => item is SpkCreatedEvent);
    }

    [Fact]
    public async Task GetProductionOrderByBarcodeAsync_returns_tracking_detail()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher());

        var result = await service.GetProductionOrderByBarcodeAsync(productionOrder.BarcodeUid, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(productionOrder.Id, result.Id);
        Assert.Equal("SO-001", result.SoNumber);
        Assert.Equal("CUST-001", result.CustomerCode);
        Assert.Equal("PART-001", result.ProductPartNumber);
    }

    [Fact]
    public async Task ScanAsync_starts_and_completes_production_with_duration_and_event()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher);

        var started = await service.ScanAsync(new ScanProductionOrderRequest(productionOrder.BarcodeUid, "Start"), CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(ProductionOrderStatuses.InProgress, started.Status);
        Assert.NotNull(started.StartedAtUtc);
        Assert.NotNull(started.DurationSeconds);
        Assert.Empty(eventPublisher.PublishedEvents);

        var completed = await service.ScanAsync(new ScanProductionOrderRequest(productionOrder.BarcodeUid, "Complete"), CancellationToken.None);

        Assert.NotNull(completed);
        Assert.Equal(ProductionOrderStatuses.Finished, completed.Status);
        Assert.NotNull(completed.FinishedAtUtc);
        Assert.NotNull(completed.DurationSeconds);
        Assert.True(completed.DurationSeconds >= 0);

        var finishedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<ProductionFinishedEvent>());
        Assert.Equal(productionOrder.Id, finishedEvent.ProductionOrderId);
    }

    [Fact]
    public async Task ScanAsync_rejects_complete_before_start()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ScanAsync(new ScanProductionOrderRequest(productionOrder.BarcodeUid, "Complete"), CancellationToken.None));

        Assert.Contains("started before it can be completed", exception.Message);
    }

    [Fact]
    public async Task GetSalesOrderProgressAsync_returns_progress_counts_and_linked_orders()
    {
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        var waiting = CreateProductionOrder(salesOrder.Items[0], "SPK-001", ProductionOrderStatuses.Waiting);
        var inProgress = CreateProductionOrder(salesOrder.Items[0], "SPK-002", ProductionOrderStatuses.InProgress);
        inProgress.StartedAtUtc = DateTime.UtcNow.AddMinutes(-30);
        var finished = CreateProductionOrder(salesOrder.Items[0], "SPK-003", ProductionOrderStatuses.Finished);
        finished.StartedAtUtc = DateTime.UtcNow.AddHours(-2);
        finished.FinishedAtUtc = DateTime.UtcNow.AddHours(-1);
        salesOrder.Items[0].ProductionOrders.AddRange([waiting, inProgress, finished]);
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var service = new ProductionService(db, new RecordingEventPublisher());

        var progress = await service.GetSalesOrderProgressAsync(salesOrder.Id, CancellationToken.None);

        Assert.NotNull(progress);
        Assert.Equal(salesOrder.Id, progress.SalesOrderId);
        Assert.Equal(3, progress.ProductionOrderCount);
        Assert.Equal(1, progress.WaitingOrders);
        Assert.Equal(1, progress.InProgressOrders);
        Assert.Equal(1, progress.FinishedOrders);
        Assert.Equal(33.33m, progress.ProgressPercent);
        Assert.Equal(3, Assert.Single(progress.Items).ProductionOrders.Count);
    }

    [Fact]
    public async Task GetPublicTrackingAsync_returns_customer_progress_by_sales_order_number()
    {
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        var productionOrder = CreateProductionOrder(salesOrder.Items[0], "SPK-001", ProductionOrderStatuses.Finished);
        productionOrder.StartedAtUtc = DateTime.UtcNow.AddHours(-2);
        productionOrder.FinishedAtUtc = DateTime.UtcNow.AddHours(-1);
        salesOrder.Items[0].ProductionOrders.Add(productionOrder);
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var service = new ProductionService(db, new RecordingEventPublisher());

        var tracking = await service.GetPublicTrackingAsync("SO-001", CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SoNumber);
        Assert.Equal("PT Customer", tracking.CustomerName);
        Assert.Equal(100m, tracking.ProgressPercent);
        var item = Assert.Single(tracking.Items);
        var publicOrder = Assert.Single(item.ProductionOrders);
        Assert.Equal("SPK-001", publicOrder.PoNumber);
        Assert.Equal(ProductionOrderStatuses.Finished, publicOrder.Status);
        Assert.Null(typeof(PublicProductionOrderTrackingDto).GetProperty("BarcodeUid"));
        Assert.Null(typeof(PublicProductionOrderTrackingDto).GetProperty("DrawingFileUrl"));
    }

    [Fact]
    public async Task GetPublicTrackingAsync_accepts_barcode_without_exposing_barcode()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher());

        var tracking = await service.GetPublicTrackingAsync(productionOrder.BarcodeUid, CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SoNumber);
        Assert.Null(typeof(PublicProductionOrderTrackingDto).GetProperty("BarcodeUid"));
    }

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ProductionContext(options);
    }

    private static async Task<(SalesOrder SalesOrder, ProductionOrder ProductionOrder)> SeedSalesOrderWithProductionOrderAsync(ProductionContext db)
    {
        var salesOrder = CreateSalesOrder();
        var productionOrder = CreateProductionOrder(salesOrder.Items[0], "SPK-001", ProductionOrderStatuses.Waiting);
        salesOrder.Items[0].ProductionOrders.Add(productionOrder);
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();
        return (salesOrder, productionOrder);
    }

    private static SalesOrder CreateSalesOrder()
    {
        var salesOrder = new SalesOrder
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            SoNumber = "SO-001",
            CustomerId = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            CustomerCode = "CUST-001",
            CustomerName = "PT Customer",
            Status = SalesOrderStatuses.InProduction
        };

        salesOrder.Items.Add(new SalesOrderItem
        {
            Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
            SalesOrder = salesOrder,
            SalesOrderId = salesOrder.Id,
            ProductId = Guid.Parse("77777777-7777-7777-7777-777777777777"),
            ProductPartNumber = "PART-001",
            ProductDescription = "Shaft Diameter 20mm",
            Qty = 10
        });

        return salesOrder;
    }

    private static ProductionOrder CreateProductionOrder(SalesOrderItem item, string poNumber, string status)
    {
        return new ProductionOrder
        {
            Id = Guid.NewGuid(),
            SalesOrderItem = item,
            SalesOrderItemId = item.Id,
            PoNumber = poNumber,
            DrawingRef = item.ProductPartNumber,
            BarcodeUid = $"PJT|SPK|20260518|{Guid.NewGuid():N}",
            OrderQty = item.Qty,
            Status = status
        };
    }

    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
        {
            PublishedEvents.Add(integrationEvent);
            return Task.CompletedTask;
        }
    }
}
