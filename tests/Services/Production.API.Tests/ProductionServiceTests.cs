using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Application.Quotations;
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

        Assert.Contains("Engineering Worker", authorize.Roles);
        Assert.DoesNotContain("Engineering Reviewer", authorize.Roles);
        Assert.DoesNotContain(
            typeof(ShopFloorController).GetMethods(),
            method => method.Name.Contains("Scan", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData(nameof(SalesOrdersController.List), "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Worker,Purchasing")]
    [InlineData(nameof(SalesOrdersController.GetProgress), "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Worker,Purchasing")]
    [InlineData(nameof(SalesOrdersController.UploadEngineeringDrawing), "Admin,Engineering Worker")]
    [InlineData(nameof(SalesOrdersController.SubmitMaterialRequest), "Admin,Engineering Worker")]
    [InlineData(nameof(SalesOrdersController.StartProduction), "Admin,Engineering Worker")]
    [InlineData(nameof(SalesOrdersController.FinishProduction), "Admin,Engineering Worker")]
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
        Assert.DoesNotContain("Engineering Reviewer", authorize.Roles);
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
        var service = new ProductionService(db, eventPublisher);
        var salesOrder = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(
                customer.Id,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                [
                    new CreateSalesOrderItemRequest(products[0].Id, 10, "Urgent"),
                    new CreateSalesOrderItemRequest(products[1].Id, 4, null)
                ],
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
        await using var db = CreateDbContext();
        var salesOrder = CreateSalesOrder();
        salesOrder.ProductionWorkerUserId = null;
        salesOrder.ProductionWorkerName = null;
        await db.SalesOrders.AddAsync(salesOrder);
        await db.SaveChangesAsync();

        var service = new ProductionService(db, new RecordingEventPublisher());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConfirmSalesOrderAsync(salesOrder.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None));

        Assert.Contains("production worker engineer", exception.Message);
    }

    [Fact]
    public async Task TrackingLookup_returns_sales_order_detail_without_mutating_status()
    {
        await using var db = CreateDbContext();
        var (_, productionOrder) = await SeedSalesOrderWithProductionOrderAsync(db);
        var service = new ProductionService(db, new RecordingEventPublisher());

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
        var service = new ProductionService(db, eventPublisher);

        var started = await service.StartProductionAsync(
            salesOrder.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker Engineer"),
            CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(ProductionOrderStatuses.InProgress, started.ProductionStatus);
        Assert.NotNull(started.StartedAtUtc);
        Assert.Equal(WorkerUserId, started.StartedByUserId);
        Assert.Equal(50m, started.ProgressPercent);
        Assert.Empty(eventPublisher.PublishedEvents);

        var finished = await service.FinishProductionAsync(
            salesOrder.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker Engineer"),
            CancellationToken.None);

        Assert.NotNull(finished);
        Assert.Equal(ProductionOrderStatuses.Finished, finished.ProductionStatus);
        Assert.NotNull(finished.FinishedAtUtc);
        Assert.Equal(WorkerUserId, finished.FinishedByUserId);
        Assert.Equal(100m, finished.ProgressPercent);

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
        var service = new ProductionService(db, new RecordingEventPublisher());

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
        var service = new ProductionService(db, eventPublisher);

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
        var service = new ProductionService(db, new RecordingEventPublisher());

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
        var service = new ProductionService(db, new RecordingEventPublisher());

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
        var service = new ProductionService(db, new RecordingEventPublisher());

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

        var service = new ProductionService(db, new RecordingEventPublisher());

        var tracking = await service.GetPublicTrackingAsync("SO-001", CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SoNumber);
        Assert.Equal("PT Customer", tracking.CustomerName);
        Assert.Equal(100m, tracking.ProgressPercent);
        Assert.Equal(2, tracking.Items.Count);
        Assert.Equal(ProductionOrderStatuses.Finished, tracking.ProductionStatus);
        Assert.Equal("https://drive.example/customer-drawing.jpg", tracking.CustomerDrawingUrl);
        Assert.Equal("DESIGN-001", tracking.DesignReference);
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("BarcodeUid"));
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("PoNumber"));
        Assert.Null(typeof(PublicProductionTrackingDto).GetProperty("ProductionOrderId"));
    }

    [Fact]
    public async Task CreateQuotationAsync_keeps_material_snapshot_without_design_in_engineering_queue()
    {
        await using var db = CreateDbContext();
        var customer = new CustomerReplica
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "CUST-001",
            Name = "PT Customer",
            Email = "customer@example.com"
        };
        await db.CustomerReplicas.AddAsync(customer);
        await db.SaveChangesAsync();

        var service = new QuotationService(db, new RecordingEventPublisher());

        var quotation = await service.CreateAsync(
            new CreateQuotationRequest(
                customer.Id,
                new DateOnly(2026, 7, 1),
                null,
                [
                    new CreateQuotationItemRequest(
                        null,
                        "Baut 0.05 mm",
                        "Baut presisi",
                        10,
                        "pcs",
                        "https://drive.example/customer-reference.jpg",
                        null,
                        [new QuotationBomItemRequest("MAT-001", "S45C Rod", "Diameter 10mm", 2, "bar")])
                ]),
            CancellationToken.None);

        Assert.Equal(QuotationStatuses.PendingDesign, quotation.Status);
        Assert.Single(quotation.BomItems);
    }

    [Fact]
    public async Task SubmitDesignAsync_requires_supervisor_assignment()
    {
        await using var db = CreateDbContext();
        var customer = await SeedQuotationCustomerAsync(db);
        var service = new QuotationService(db, new RecordingEventPublisher());
        var quotation = await CreatePendingDesignQuotationAsync(service, customer.Id);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitDesignAsync(
                quotation.Id,
                new SubmitQuotationDesignRequest(
                    "https://drive.example/design.pdf",
                    [new QuotationBomItemRequest("MAT-001", "S45C Rod", "Diameter 10mm", 2, "bar")],
                    WorkerUserId,
                    "Worker Engineer"),
                CancellationToken.None));

        Assert.Contains("assigned by Engineering Supervisor", exception.Message);
    }

    [Fact]
    public async Task SubmitDesignAsync_accepts_only_assigned_engineer_then_waits_for_supervisor_approval()
    {
        await using var db = CreateDbContext();
        var customer = await SeedQuotationCustomerAsync(db);
        var service = new QuotationService(db, new RecordingEventPublisher());
        var quotation = await CreatePendingDesignQuotationAsync(service, customer.Id);

        await service.AssignEngineerAsync(
            quotation.Id,
            new AssignQuotationEngineerRequest(WorkerUserId, "Worker Engineer"),
            CancellationToken.None);

        var wrongEngineerException = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitDesignAsync(
                quotation.Id,
                new SubmitQuotationDesignRequest(
                    "https://drive.example/design.pdf",
                    [new QuotationBomItemRequest("MAT-001", "S45C Rod", "Diameter 10mm", 2, "bar")],
                    ReviewerUserId,
                    "Reviewer Engineer"),
                CancellationToken.None));

        Assert.Contains("assigned engineer", wrongEngineerException.Message);

        var submitted = await service.SubmitDesignAsync(
            quotation.Id,
            new SubmitQuotationDesignRequest(
                "https://drive.example/design.pdf",
                [new QuotationBomItemRequest("MAT-001", "S45C Rod", "Diameter 10mm", 2, "bar")],
                WorkerUserId,
                "Worker Engineer"),
            CancellationToken.None);

        Assert.NotNull(submitted);
        Assert.Equal(QuotationStatuses.DesignReview, submitted.Status);

        var clientApprovalException = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ApproveClientDesignAsync(quotation.Id, CancellationToken.None));

        Assert.Contains("not ready for client approval", clientApprovalException.Message);

        var supervisorApproved = await service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None);

        Assert.NotNull(supervisorApproved);
        Assert.Equal(QuotationStatuses.ClientDesignApproval, supervisorApproved.Status);
    }

    [Fact]
    public async Task ConvertQuotationToSalesOrderAsync_publishes_dp_invoice_request()
    {
        await using var db = CreateDbContext();
        var customer = new CustomerReplica
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "CUST-001",
            Name = "PT Customer",
            Email = "customer@example.com"
        };
        var product = new ProductReplica
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            PartNumber = "PART-001",
            Description = "Precision Bolt",
            MaterialSpec = "S45C"
        };
        await db.CustomerReplicas.AddAsync(customer);
        await db.ProductReplicas.AddAsync(product);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new QuotationService(db, eventPublisher);
        var quotation = await service.CreateAsync(
            new CreateQuotationRequest(
                customer.Id,
                new DateOnly(2026, 7, 1),
                null,
                [
                    new CreateQuotationItemRequest(
                        product.Id,
                        "Precision Bolt",
                        "Baut 0.05 mm",
                        10,
                        "pcs",
                        "https://drive.example/customer-image.jpg",
                        "https://drive.example/design.pdf",
                        [new QuotationBomItemRequest("MAT-001", "S45C Rod", "Diameter 10mm", 2, "bar")])
                ]),
            CancellationToken.None);

        Assert.Equal(QuotationStatuses.WaitingPricing, quotation.Status);

        quotation = await service.SubmitPricingAsync(
            quotation.Id,
            new SubmitQuotationPricingRequest(500_000m, "Initial pricing", Guid.Parse("33333333-3333-3333-3333-333333333333"), "Finance"),
            CancellationToken.None);
        quotation = await service.MarkWonAsync(quotation!.Id, CancellationToken.None);

        var salesOrder = await service.ConvertToSalesOrderAsync(
            quotation!.Id,
            new ConvertQuotationToSalesOrderRequest(50m, new DateOnly(2026, 6, 15)),
            CancellationToken.None);

        Assert.NotNull(salesOrder);
        Assert.Equal(SalesOrderStatuses.Draft, salesOrder.Status);
        Assert.Equal(SalesOrderDesignStatuses.Approved, salesOrder.DesignStatus);
        var dpEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<SalesOrderDpInvoiceRequestedEvent>());
        Assert.Equal(salesOrder.Id, dpEvent.SalesOrderId);
        Assert.Equal(500_000m, dpEvent.QuotationAmount);
        Assert.Equal(50m, dpEvent.DpPercentage);
        Assert.Equal(new DateOnly(2026, 6, 15), dpEvent.DpDueDate);
    }

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ProductionContext(options);
    }

    private static async Task<CustomerReplica> SeedQuotationCustomerAsync(ProductionContext db)
    {
        var customer = new CustomerReplica
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "CUST-001",
            Name = "PT Customer",
            Email = "customer@example.com"
        };
        await db.CustomerReplicas.AddAsync(customer);
        await db.SaveChangesAsync();
        return customer;
    }

    private static Task<QuotationDto> CreatePendingDesignQuotationAsync(QuotationService service, Guid customerId)
    {
        return service.CreateAsync(
            new CreateQuotationRequest(
                customerId,
                new DateOnly(2026, 7, 1),
                null,
                [
                    new CreateQuotationItemRequest(
                        null,
                        "Baut 0.05 mm",
                        "Baut presisi",
                        10,
                        "pcs",
                        "https://drive.example/customer-reference.jpg",
                        null,
                        null)
                ]),
            CancellationToken.None);
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
