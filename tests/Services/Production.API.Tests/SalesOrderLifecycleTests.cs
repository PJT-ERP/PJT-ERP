using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using System.Linq;

namespace Production.API.Tests;

/// <summary>
/// Tests that validate the full Sales Order lifecycle, including
/// custom products that become registered products after Engineering completes the design.
/// </summary>
public sealed class SalesOrderLifecycleTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly Guid UnassignedWorkerId = Guid.Parse("77777777-7777-7777-7777-777777777777");
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task CustomDesignToRegisteredProduct_complete_lifecycle_design_approve_production_and_finish()
    {
        // ── Arrange: persistent database + test service ──────────────────
        await using var db = CreateDbContext();

        // Seed Master Data: customer + a product that starts as "placeholder"
        await db.CustomerReplicas.AddAsync(new CustomerReplica
        {
            Id = CustomerId, Code = "CUST-001", Name = "PT Custom Client"
        });
        await db.ProductReplicas.AddAsync(new ProductReplica
        {
            Id = ProductId, PartNumber = "PART-PLACEHOLDER", Description = "Temporary placeholder for custom design",
            MaterialSpec = null, Unit = "pcs"
        });
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        // ── Step 1 – Create SO where design is ALREADY approved (the product is now registered) ──
        var customSo = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(
                CustomerId,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
                [new CreateSalesOrderItemRequest(ProductId, 5, 0m, null)],
                new EngineerAssignment(WorkerUserId, "Engineer Worker"),
                new EngineerAssignment(WorkerUserId, "Engineer Worker"),
                new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
                null,
                "INTERNAL_DESIGN",
                SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        Assert.StartsWith("SO", customSo.SoNumber);
        Assert.Equal(SalesOrderDesignStatuses.Approved, customSo.DesignStatus);
        Assert.Equal("INTERNAL_DESIGN", customSo.DesignReference);

        // ── Step 2 – Confirm the SO (puts it into production tracking) ──
        var confirmed = await service.ConfirmSalesOrderAsync(
            customSo.Id,
            new ConfirmSalesOrderRequest(Guid.NewGuid()),
            CancellationToken.None);

        Assert.Equal(ProductionOrderStatuses.Waiting, confirmed.ProductionStatus);

        // ── Step 3 – Engineering uploads the FINAL production drawing ──
        var designUploaded = await service.UploadEngineeringDrawingAsync(
            customSo.Id,
            new UploadEngineeringDrawingRequest(
                "https://internal-drive/designs/jig-assembly-final.dwg",
                WorkerUserId, "Engineer Worker",
                "DWG-2026-076"),
            CancellationToken.None);

        Assert.Equal("https://internal-drive/designs/jig-assembly-final.dwg", designUploaded.DrawingFileUrl);
        Assert.Equal("DWG-2026-076", designUploaded.DrawingRef);

        // ── Step 4 – Set pricing ──
        var priced = await service.SetSalesOrderPricingAsync(
            customSo.Id,
            new SetSalesOrderPricingRequest([
                new SetSalesOrderPricingItemRequest(customSo.Items.First().Id, 1_500_000m)
            ]),
            CancellationToken.None);

        Assert.Equal(1_500_000m, priced.Items.First().UnitPrice);

        // ── Step 5 – Production worker starts production ──
        var started = await service.StartProductionAsync(
            customSo.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker"),
            CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(ProductionOrderStatuses.InProgress, started.ProductionStatus);
        Assert.NotNull(started.StartedAtUtc);
        Assert.Equal(60m, started.ProgressPercent);

        // ── Step 6 – Worker pauses due to machine maintenance ──
        var paused = await service.PauseProductionAsync(
            customSo.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker") { Reason = "Mesin CNC maintenance terjadwal" },
            CancellationToken.None);

        Assert.NotNull(paused);
        Assert.Equal(ProductionOrderStatuses.Paused, paused.ProductionStatus);
        Assert.Equal("Mesin CNC maintenance terjadwal", paused.PauseReason);

        // ── Step 7 – Worker resumes ──
        var resumed = await service.ResumeProductionAsync(
            customSo.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker"),
            CancellationToken.None);

        Assert.NotNull(resumed);
        Assert.Equal(ProductionOrderStatuses.InProgress, resumed.ProductionStatus);

        // ── Step 8 – Worker finishes production ──
        var finished = await service.FinishProductionAsync(
            customSo.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker"),
            CancellationToken.None);

        Assert.NotNull(finished);
        Assert.Equal(ProductionOrderStatuses.Finished, finished.ProductionStatus);
        Assert.NotNull(finished.FinishedAtUtc);
        Assert.Equal(80m, finished.ProgressPercent);

        // ── Step 9 – Verify the published events ──
        Assert.Contains(eventPublisher.PublishedEvents, e => e is SalesOrderConfirmedEvent);
        Assert.Contains(eventPublisher.PublishedEvents, e => e is SpkCreatedEvent);
        var finishEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<ProductionFinishedEvent>());
        Assert.Equal(customSo.SoNumber, finishEvent.SpkNumber);
    }

    [Fact]
    public async Task CustomDesignRejected_and_resubmitted_after_revision()
    {
        await using var db = CreateDbContext();
        await SeedCustomerAndProductAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        // Create SO with design NOT yet approved — needs supervisor review
        var so = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(CustomerId, DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
                [new CreateSalesOrderItemRequest(ProductId, 3, 0m, null)],
                new EngineerAssignment(WorkerUserId, "Engineer Worker"),
                new EngineerAssignment(WorkerUserId, "Engineer Worker"),
                new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
                null, "INTERNAL_DESIGN", SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        // Confirm so that drawings can be uploaded
        await service.ConfirmSalesOrderAsync(so.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None);

        // Design uploaded by engineer, then rejected by supervisor
        await service.UploadEngineeringDrawingAsync(so.Id,
            new UploadEngineeringDrawingRequest("https://example.com/v1.dwg", WorkerUserId, "Engineer Worker", "DWG-001"),
            CancellationToken.None);

        var rejected = await service.UpdateSalesOrderDesignStatusAsync(so.Id,
            new UpdateSalesOrderDesignStatusRequest(SalesOrderDesignStatuses.RevisionRequired,
                ReviewerUserId, "QC Reviewer", "Toleransi tidak sesuai spesifikasi klien."),
            CancellationToken.None);

        Assert.Equal(SalesOrderDesignStatuses.RevisionRequired, rejected.DesignStatus);

        // Engineer resubmits with corrections
        await service.UpdateSalesOrderDesignStatusAsync(so.Id,
            new UpdateSalesOrderDesignStatusRequest(SalesOrderDesignStatuses.WaitingApproval,
                WorkerUserId, "Engineer Worker", "Revisi toleransi sudah diperbaiki sesuai permintaan."),
            CancellationToken.None);

        var approved = await service.UpdateSalesOrderDesignStatusAsync(so.Id,
            new UpdateSalesOrderDesignStatusRequest(SalesOrderDesignStatuses.Approved,
                ReviewerUserId, "QC Reviewer", null),
            CancellationToken.None);

        Assert.Equal(SalesOrderDesignStatuses.Approved, approved.DesignStatus);
    }

    [Fact]
    public async Task Multiple_items_confirm_and_finish_publishes_correct_events()
    {
        await using var db = CreateDbContext();
        await SeedCustomerAndProductAsync(db);
        await db.ProductReplicas.AddAsync(new ProductReplica
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222223"),
            PartNumber = "PART-002", Description = "Bushing Bronze", MaterialSpec = "Bronze", Unit = "pcs"
        });
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        var so = await service.CreateSalesOrderAsync(
            new CreateSalesOrderRequest(CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                [
                    new CreateSalesOrderItemRequest(ProductId, 5, 0m, "Urgent"),
                    new CreateSalesOrderItemRequest(Guid.Parse("22222222-2222-2222-2222-222222222223"), 2, 0m, null),
                ],
                null,
                new EngineerAssignment(WorkerUserId, "Engineer Worker"),
                new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
                null, null, SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        var confirmed = await service.ConfirmSalesOrderAsync(so.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None);

        Assert.Equal(2, confirmed.Items.Count);
        Assert.Equal(7, confirmed.TotalQuantity);

        await service.StartProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker"), CancellationToken.None);
        await service.FinishProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Engineer Worker"), CancellationToken.None);

        var confirmedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<SalesOrderConfirmedEvent>());
        Assert.Equal(2, confirmedEvent.Items!.Count);

        var spkEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<SpkCreatedEvent>());
        Assert.Equal(2, spkEvent.Items!.Count);

        var finishEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<ProductionFinishedEvent>());
        Assert.Equal(so.SoNumber, finishEvent.SpkNumber);
    }

    [Fact]
    public async Task Material_request_submission_with_mixed_project_and_consumable_items()
    {
        await using var db = CreateDbContext();
        var (salesOrder, _) = await SeedSalesOrderWithProductionOrderAsync(db, "Draft");
        var eventPublisher = new RecordingEventPublisher();
        var service = new ProductionService(db, eventPublisher, new StubMasterDataClient());

        var result = await service.SubmitMaterialRequestAsync(salesOrder.Id,
            new SubmitProductionMaterialRequest(WorkerUserId, "Engineer Worker",
            [
                new SubmitProductionMaterialRequestItem(null, salesOrder.Items[0].Id,
                    "S45C Round Bar D20mm", "Diameter 20mm x 3m", 2, "Urgent", "PT Steel Supplier",
                    "Material kritis untuk project ini", "Project"),
                new SubmitProductionMaterialRequestItem(null, null,
                    "Cutting Oil", "General purpose cutting fluid", 1, "Normal", null,
                    "Consumable rutin", "Consumable"),
            ], "Mixed project + consumable request"), CancellationToken.None);

        Assert.NotNull(result);
        var materialRequestEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<MaterialRequestSubmittedEvent>());
        Assert.Equal(2, materialRequestEvent.Items.Count);
        Assert.Contains(materialRequestEvent.Items, item => item.ItemName == "Cutting Oil" && item.PurchaseCategory == "Consumable");
        Assert.Contains(materialRequestEvent.Items, item => item.ItemName == "S45C Round Bar D20mm" && item.PurchaseCategory == "Project");
    }

    // ── Helpers (duplicated from ProductionServiceTests for test isolation) ──

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ProductionContext(options);
    }

    private static async Task SeedCustomerAndProductAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica
        {
            Id = CustomerId, Code = "CUST-001", Name = "PT Test Customer"
        });
        await db.ProductReplicas.AddAsync(new ProductReplica
        {
            Id = ProductId, PartNumber = "PART-001", Description = "Shaft D20", MaterialSpec = "S45C", Unit = "pcs"
        });
        await db.SaveChangesAsync();
    }

    // Creates a basic SalesOrder with two items and a waiting production order
    private static async Task<(SalesOrder SalesOrder, ProductionOrder ProductionOrder)> SeedSalesOrderWithProductionOrderAsync(ProductionContext db, string status = "InProduction")
    {
        var so = new SalesOrder
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            SoNumber = "SO-001", CustomerId = CustomerId, CustomerCode = "CUST-001", CustomerName = "PT Customer",
            ProductionWorkerUserId = WorkerUserId, ProductionWorkerName = "Worker Engineer",
            QcReviewerUserId = ReviewerUserId, QcReviewerName = "Reviewer Engineer",
            CustomerEmail = "test@example.com",
            CustomerDrawingUrl = "https://drive.example/customer-drawing.jpg",
            DesignReference = "DESIGN-001", DesignStatus = SalesOrderDesignStatuses.Approved,
            DesignApprovedAtUtc = DateTime.UtcNow,
            Status = status
        };
        so.Items.AddRange([
            new SalesOrderItem { Id = Guid.Parse("66666666-6666-6666-6666-666666666666"), SalesOrder = so, SalesOrderId = so.Id, ProductId = ProductId, ProductPartNumber = "PART-001", ProductDescription = "Shaft D20", Qty = 10 },
            new SalesOrderItem { Id = Guid.Parse("66666666-6666-6666-6666-666666666667"), SalesOrder = so, SalesOrderId = so.Id, ProductId = ProductId, ProductPartNumber = "PART-001", ProductDescription = "Shaft D20", Qty = 4 }
        ]);
        var productionOrder = new ProductionOrder
        {
            Id = Guid.NewGuid(), SalesOrder = so, SalesOrderId = so.Id,
            SalesOrderItem = so.Items[0], SalesOrderItemId = so.Items[0].Id,
            PoNumber = so.SoNumber, DrawingRef = so.SoNumber,
            BarcodeUid = $"PJT|SO|20260518|{Guid.NewGuid():N}",
            OrderQty = so.Items.Sum(item => item.Qty), Status = ProductionOrderStatuses.Waiting
        };
        so.ProductionOrders.Add(productionOrder);
        await db.SalesOrders.AddAsync(so);
        await db.SaveChangesAsync();
        return (so, productionOrder);
    }

    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];
        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default) { PublishedEvents.Add(e); return Task.CompletedTask; }
    }

    private sealed class StubMasterDataClient : IMasterDataClient
    {
        public List<Guid> RequestedCustomerIds { get; } = [];
        public List<Guid> RequestedProductIds { get; } = [];
                public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) { RequestedCustomerIds.Add(id); return Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "CUST-HTTP", "PT HTTP", "http@test.com", true)); }
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) { RequestedProductIds.Add(id); return Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-HTTP", "HTTP Desc", "pcs", "HTTP Spec", true)); }
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(Array.Empty<BomStockDto>());
    }
}

