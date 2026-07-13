using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Controllers;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

public sealed class ProductionServiceTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");

    [Fact]
    public void ShopFloorController_exposes_read_only_sales_order_tracking_lookup()
    {
        var authorize = Assert.Single(
            typeof(ShopFloorController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
                .Cast<AuthorizeAttribute>());

        Assert.Contains("Engineering", authorize.Roles);
        Assert.DoesNotContain("Engineering Supervisor", authorize.Roles);
        Assert.DoesNotContain(
            typeof(ShopFloorController).GetMethods(),
            method => method.Name.Contains("Scan", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData(nameof(SalesOrdersController.GetProgress), "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    [InlineData(nameof(SalesOrdersController.UploadEngineeringDrawing), "Admin,Engineering,Engineering Supervisor,Owner")]
    [InlineData(nameof(SalesOrdersController.SubmitMaterialRequest), "Admin,Engineering,Engineering Supervisor,Owner")]
    [InlineData(nameof(SalesOrdersController.StartProduction), "Admin,Engineering,Engineering Supervisor,Owner")]
    [InlineData(nameof(SalesOrdersController.FinishProduction), "Admin,Engineering,Engineering Supervisor,Owner")]
    public void SalesOrder_production_actions_keep_reviewer_outside_production_flow(string actionName, string expectedRoles)
    {
        var method = typeof(SalesOrdersController)
            .GetMethods()
            .Single(method => method.Name == actionName);
        var authorize = method
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
            .Cast<AuthorizeAttribute>()
            .Single();

        Assert.Equal(expectedRoles, authorize.Roles);
    }

    [Fact]
    public async Task ConfirmSalesOrderAsync_returns_sales_order_tracking_without_public_po_identity()
    {
        await using var db = CreateDbContext();
        var customer = new CustomerReplica
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "CUST-001",
            Name = "PT Customer"
        };
        var products = new[]
        {
            new ProductReplica
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                PartNumber = "PART-001",
                Description = "Shaft Diameter 20mm",
                MaterialSpec = "S45C"
            },
            new ProductReplica
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222223"),
                PartNumber = "PART-002",
                Description = "Bushing",
                MaterialSpec = "Bronze"
            }
        };
        await db.CustomerReplicas.AddAsync(customer);
        await db.ProductReplicas.AddRangeAsync(products);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());
        var salesOrder = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(
                customer.Id,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                [
                    new CreateSalesOrderItemRequest(products[0].Id, 10, 0m, "Urgent"),
                    new CreateSalesOrderItemRequest(products[1].Id, 4, 0m, null)
                ],
                null,
                new EngineerAssignment(WorkerUserId, "Worker Engineer"),
                new EngineerAssignment(ReviewerUserId, "Reviewer Engineer"),
                "https://drive.example/customer-drawing.jpg",
                "DESIGN-001",
                SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        var tracking = await service.ConfirmSalesOrderAsync(
            salesOrder.Id,
            new ConfirmSalesOrderRequest(Guid.Parse("33333333-3333-3333-3333-333333333333")),
            CancellationToken.None);

        Assert.Equal(salesOrder.Id, tracking.SalesOrderId);
        Assert.Equal(salesOrder.SoNumber, tracking.SoNumber);
        Assert.Equal(ProductionOrderStatuses.Waiting, tracking.ProductionStatus);
        Assert.Equal(WorkerUserId, tracking.ProductionWorkerUserId);
        Assert.Equal(ReviewerUserId, tracking.QcReviewerUserId);
        Assert.Equal("https://drive.example/customer-drawing.jpg", tracking.CustomerDrawingUrl);
        Assert.Equal("DESIGN-001", tracking.DesignReference);
        Assert.Equal(SalesOrderDesignStatuses.Approved, tracking.DesignStatus);
        Assert.Equal(14, tracking.TotalQuantity);
        Assert.Equal(2, tracking.Items.Count);
        Assert.StartsWith("PJT|SO|", tracking.TrackingBarcodeUid, StringComparison.Ordinal);
        Assert.Null(typeof(SalesOrderProductionProgressDto).GetProperty("PoNumber"));
        Assert.Null(typeof(SalesOrderProductionProgressDto).GetProperty("ProductionOrderId"));
        Assert.Null(typeof(SalesOrderProductionProgressDto).GetProperty("ProductionOrders"));

        var confirmedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<SalesOrderConfirmedEvent>());
        Assert.Equal(2, confirmedEvent.Items!.Count);
        var spkEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<SpkCreatedEvent>());
        Assert.Equal(salesOrder.SoNumber, spkEvent.SpkNumber);
        Assert.Equal(2, spkEvent.Items!.Count);
    }

    [Fact]
    public async Task ConfirmSalesOrderAsync_requires_engineer_assignments()
    {
        // EnsureEngineersAssigned was removed in workflow change:
        // MR is now submitted by SPV before operator assignment,
        // so production worker / QC reviewer are no longer required at confirm time.
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        salesOrder.ProductionWorkerUserId = null;
        salesOrder.ProductionWorkerName = null;
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        // Should NOT throw anymore — engineers are no longer required at confirm time
        var result = await service.ConfirmSalesOrderAsync(salesOrder.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task InvoicePaymentRecordedEventHandler_marks_draft_paid_sales_order_ready_for_assignment()
    {
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        salesOrder.Status = SalesOrderStatuses.Draft;
        salesOrder.ProductionWorkerUserId = null;
        salesOrder.ProductionWorkerName = null;
        salesOrder.QcReviewerUserId = null;
        salesOrder.QcReviewerName = null;
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var handler = new InvoicePaymentRecordedEventHandler(db);
        await handler.Handle(
            new InvoicePaymentRecordedEvent(
                Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "INV-001",
                salesOrder.Id,
                salesOrder.SoNumber,
                salesOrder.CustomerId,
                100_000m,
                100_000m,
                200_000m,
                50m,
                new DateOnly(2026, 6, 11),
                false),
            CancellationToken.None);

        var updated = await db.SalesOrders.AsNoTracking().SingleAsync(order => order.Id == salesOrder.Id);
        Assert.Equal(SalesOrderStatuses.Confirmed, updated.Status);
        Assert.Null(updated.ProductionWorkerUserId);
    }

    [Fact]
    public async Task TrackingLookup_returns_sales_order_detail_without_mutating_status()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var result = await service.GetSalesOrderTrackingByCodeAsync(productionOrder.BarcodeUid, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("SO-001", result.SoNumber);
        Assert.Equal("CUST-001", result.CustomerCode);
        Assert.Equal(ProductionOrderStatuses.Waiting, result.ProductionStatus);
        Assert.Null(result.StartedAtUtc);
        Assert.Null(typeof(SalesOrderProductionProgressDto).GetProperty("PoNumber"));
    }

    [Fact]
    public async Task StartAndFinishProductionAsync_update_sales_order_tracking_with_assigned_worker_and_event()
    {
        await using var db = CreateDbContext();
        var (salesOrder, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        var started = await service.StartProductionAsync(
            salesOrder.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker Engineer"),
            CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(ProductionOrderStatuses.InProgress, started.ProductionStatus);
        Assert.NotNull(started.StartedAtUtc);
        Assert.Equal(WorkerUserId, started.StartedByUserId);
        Assert.Equal(60m, started.ProgressPercent);
        Assert.Empty(eventPublisher.PublishedEvents);

        var finished = await service.FinishProductionAsync(
            salesOrder.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker Engineer"),
            CancellationToken.None);

        Assert.NotNull(finished);
        Assert.Equal(ProductionOrderStatuses.Finished, finished.ProductionStatus);
        Assert.NotNull(finished.FinishedAtUtc);
        Assert.Equal(WorkerUserId, finished.FinishedByUserId);
        Assert.Equal(80m, finished.ProgressPercent);

        var finishedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<ProductionFinishedEvent>());
        Assert.Equal(productionOrder.Id, finishedEvent.ProductionOrderId);
        Assert.Equal(salesOrder.SoNumber, finishedEvent.SpkNumber);
        Assert.Equal(ReviewerUserId, finishedEvent.QcReviewerUserId);
    }

    [Fact]
    public async Task UploadEngineeringDrawingAsync_updates_sales_order_tracking_with_assigned_worker()
    {
        await using var db = CreateDbContext();
        var (salesOrder, _) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var result = await service.UploadEngineeringDrawingAsync(
            salesOrder.Id,
            new UploadEngineeringDrawingRequest(
                "https://drive.example/engineering-drawing.jpg",
                WorkerUserId,
                "Worker Engineer",
                "DRAW-001"),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("https://drive.example/engineering-drawing.jpg", result.DrawingFileUrl);
        Assert.Equal(WorkerUserId, result.DrawingUploadedByUserId);
        Assert.Equal("Worker Engineer", result.DrawingUploaderName);
        Assert.Equal("DRAW-001", result.DrawingRef);
    }

    [Fact]
    public async Task SubmitMaterialRequestAsync_publishes_material_request_for_assigned_worker()
    {
        await using var db = CreateDbContext();
        var (salesOrder, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        var result = await service.SubmitMaterialRequestAsync(
            salesOrder.Id,
            new SubmitProductionMaterialRequest(
                WorkerUserId,
                "Worker Engineer",
                [
                    new SubmitProductionMaterialRequestItem(
                        null,
                        salesOrder.Items[0].Id,
                        "S45C Round Bar",
                        "Diameter 10mm",
                        2,
                        "Urgent",
                        "PT Steel",
                        "Stock shortage",
                        "Project"),
                    new SubmitProductionMaterialRequestItem(
                        null,
                        null,
                        "Coolant",
                        "Water soluble",
                        1,
                        "Normal",
                        null,
                        "Consumable for multiple SO",
                        "Consumable")
                ],
                "Material shortage before production start."),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(salesOrder.Id, result.SalesOrderId);
        var materialRequestEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<MaterialRequestSubmittedEvent>());
        Assert.Equal(salesOrder.Id, materialRequestEvent.SalesOrderId);
        Assert.Equal(salesOrder.SoNumber, materialRequestEvent.SalesOrderNumber);
        Assert.Equal(productionOrder.Id, materialRequestEvent.ProductionOrderId);
        Assert.Equal(WorkerUserId, materialRequestEvent.RequestedByUserId);
        Assert.Equal(2, materialRequestEvent.Items.Count);
        Assert.Contains(materialRequestEvent.Items, item => item.ItemName == "Coolant" && item.PurchaseCategory == "Consumable");
    }

    [Fact]
    public async Task UploadEngineeringDrawingAsync_rejects_unassigned_worker()
    {
        await using var db = CreateDbContext();
        var (salesOrder, _) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadEngineeringDrawingAsync(
                salesOrder.Id,
                new UploadEngineeringDrawingRequest(
                    "https://drive.example/engineering-drawing.jpg",
                    ReviewerUserId,
                    "Reviewer Engineer",
                    "DRAW-001"),
                CancellationToken.None));

        Assert.Contains("assigned production worker", exception.Message);
    }

    [Fact]
    public async Task StartProductionAsync_rejects_unassigned_worker()
    {
        await using var db = CreateDbContext();
        var (salesOrder, _) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.StartProductionAsync(
                salesOrder.Id,
                new ProductionStatusUpdateRequest(Guid.NewGuid(), "Other Worker"),
                CancellationToken.None));

        Assert.Contains("assigned production worker", exception.Message);
    }

    [Fact]
    public async Task FinishProductionAsync_rejects_finish_before_start()
    {
        await using var db = CreateDbContext();
        var (salesOrder, _) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.FinishProductionAsync(
                salesOrder.Id,
                new ProductionStatusUpdateRequest(WorkerUserId, "Worker Engineer"),
                CancellationToken.None));

        Assert.Contains("started by the assigned worker", exception.Message);
    }

    [Fact]
    public async Task GetPublicTrackingAsync_returns_customer_progress_without_internal_identifiers()
    {
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        var productionOrder = CreateProductionOrder(salesOrder, ProductionOrderStatuses.Finished);
        productionOrder.StartedAtUtc = DateTime.UtcNow.AddHours(-2);
        productionOrder.FinishedAtUtc = DateTime.UtcNow.AddHours(-1);
        salesOrder.ProductionOrders.Add(productionOrder);
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var service = new ProductionService(db, new RecordingEventPublisher(), new StubMasterDataClient());

        var tracking = await service.GetPublicTrackingAsync("SO-001", CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SoNumber);
        Assert.Equal("PT Customer", tracking.CustomerName);
        Assert.Equal(80m, tracking.ProgressPercent);
        Assert.Equal(2, tracking.Items.Count);
        Assert.Equal(ProductionOrderStatuses.Finished, tracking.ProductionStatus);
        Assert.Equal("https://drive.example/customer-drawing.jpg", tracking.CustomerDrawingUrl);
        Assert.Equal("DESIGN-001", tracking.DesignReference);
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("BarcodeUid"));
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("PoNumber"));
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("ProductionOrderId"));
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
        var productionOrder = CreateProductionOrder(salesOrder, ProductionOrderStatuses.Waiting);
        salesOrder.ProductionOrders.Add(productionOrder);
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
            ProductionWorkerUserId = WorkerUserId,
            ProductionWorkerName = "Worker Engineer",
            QcReviewerUserId = ReviewerUserId,
            QcReviewerName = "Reviewer Engineer",
            CustomerEmail = "customer@example.com",
            CustomerDrawingUrl = "https://drive.example/customer-drawing.jpg",
            DesignReference = "DESIGN-001",
            DesignStatus = SalesOrderDesignStatuses.Approved,
            DesignApprovedByUserId = ReviewerUserId,
            DesignApprovedByName = "Reviewer Engineer",
            DesignApprovedAtUtc = DateTime.UtcNow,
            Status = SalesOrderStatuses.InProduction
        };

        salesOrder.Items.AddRange(
        [
            new SalesOrderItem
            {
                Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                SalesOrder = salesOrder,
                SalesOrderId = salesOrder.Id,
                ProductId = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                ProductPartNumber = "PART-001",
                ProductDescription = "Shaft Diameter 20mm",
                Qty = 10
            },
            new SalesOrderItem
            {
                Id = Guid.Parse("66666666-6666-6666-6666-666666666667"),
                SalesOrder = salesOrder,
                SalesOrderId = salesOrder.Id,
                ProductId = Guid.Parse("77777777-7777-7777-7777-777777777778"),
                ProductPartNumber = "PART-002",
                ProductDescription = "Bushing",
                Qty = 4
            }
        ]);

        return salesOrder;
    }

    private static ProductionOrder CreateProductionOrder(SalesOrder salesOrder, string status)
    {
        var firstItem = salesOrder.Items[0];
        return new ProductionOrder
        {
            Id = Guid.NewGuid(),
            SalesOrder = salesOrder,
            SalesOrderId = salesOrder.Id,
            SalesOrderItem = firstItem,
            SalesOrderItemId = firstItem.Id,
            PoNumber = salesOrder.SoNumber,
            DrawingRef = salesOrder.SoNumber,
            BarcodeUid = $"PJT|SO|20260518|{Guid.NewGuid():N}",
            OrderQty = salesOrder.Items.Sum(item => item.Qty),
            Status = status
        };
    }

    [Fact]
    public async Task CreateSalesOrderAsync_fetches_missing_master_data_synchronously_via_http_fallback()
    {
        await using var db = CreateDbContext();
        
        // We do NOT seed the Customer or Products into db.CustomerReplicas or db.ProductReplicas.
        // This simulates the race condition where the event bus is lagging behind.
        var customerId = Guid.NewGuid();
        var productId1 = Guid.NewGuid();
        var productId2 = Guid.NewGuid();
        
        var eventPublisher = new RecordingEventPublisher();
        var stubClient = new StubMasterDataClient();
        var service = new ProductionService(db, eventPublisher, stubClient);
        
        var salesOrder = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(
                customerId,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                [
                    new CreateSalesOrderItemRequest(productId1, 10, 0m, "Urgent"),
                    new CreateSalesOrderItemRequest(productId2, 4, 0m, null)
                ],
                null,
                new EngineerAssignment(WorkerUserId, "Worker Engineer"),
                new EngineerAssignment(ReviewerUserId, "Reviewer Engineer"),
                "https://drive.example/customer-drawing.jpg",
                "DESIGN-001",
                SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        // Assert that the client was called with the exact missing IDs
        Assert.Single(stubClient.RequestedCustomerIds);
        Assert.Equal(customerId, stubClient.RequestedCustomerIds[0]);

        Assert.Equal(2, stubClient.RequestedProductIds.Count);
        Assert.Contains(productId1, stubClient.RequestedProductIds);
        Assert.Contains(productId2, stubClient.RequestedProductIds);

        // Assert that the fallback actually saved them to the local database correctly
        var savedCustomer = await db.CustomerReplicas.SingleOrDefaultAsync(c => c.Id == customerId);
        Assert.NotNull(savedCustomer);
        Assert.Equal("CUST-HTTP", savedCustomer.Code);

        var savedProduct1 = await db.ProductReplicas.SingleOrDefaultAsync(p => p.Id == productId1);
        Assert.NotNull(savedProduct1);
        Assert.StartsWith("PART-HTTP-", savedProduct1.PartNumber);

        // Assert the Sales Order was successfully created
        Assert.NotNull(salesOrder);
        Assert.Equal(2, salesOrder.Items.Count);
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

    private sealed class StubMasterDataClient : IMasterDataClient
    {
        public List<Guid> RequestedCustomerIds { get; } = [];
        public List<Guid> RequestedProductIds { get; } = [];

        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken)
        {
            RequestedCustomerIds.Add(id);
            return Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "CUST-HTTP", "PT HTTP Customer", "http@test.com", true));
        }

        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken)
        {
            RequestedProductIds.Add(id);
            return Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, $"PART-HTTP-{id.ToString()[..4]}", "HTTP Desc", "pcs", "HTTP Spec", true));
        }

        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
