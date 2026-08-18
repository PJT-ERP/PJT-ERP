using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

/// <summary>
/// Tests that validate production cannot start when material stock is insufficient.
/// These guard against the bug where workers could "Mulai Produksi" without enough materials.
/// </summary>
public sealed class ProductionMaterialStockValidationTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task StartProduction_rejects_when_bom_material_is_out_of_stock()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderWithOutOfStockMaterialAsync(db);
        var service = new ProductionService(db, new StubPublisher(), new StubOutOfStockMasterDataClient());

        // DeductBomStockAsync throws because stock is 0 — this happens
        // BEFORE StartProduction() is called, so production never starts.
        // The controller catches this and returns BadRequest.
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.StartProductionAsync(so.Id,
                new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None));
    }

    [Fact]
    public async Task FullLifecycle_material_request_then_stock_received_then_production_starts()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderWithOutOfStockMaterialAsync(db);

        // Phase 1: Submit material request (stock is 0)
        var service = new ProductionService(db, new RecordingEventPublisher(), new StubOutOfStockMasterDataClient());
        var mr = await service.SubmitMaterialRequestAsync(so.Id,
            new SubmitProductionMaterialRequest(WorkerUserId, "Worker",
                [new SubmitProductionMaterialRequestItem(null, so.Items[0].Id,
                    "S45C Round Bar D20", "20mm", 2, "Urgent", "PT Supplier", "Material kritis", "Project")],
                null),
            CancellationToken.None);

        Assert.NotNull(mr);

        // Phase 2: Stock arrives (simulated by switching to in-stock client)
        var serviceAfterRestock = new ProductionService(db, new RecordingEventPublisher(), new StubInStockMasterDataClient());
        var started = await serviceAfterRestock.StartProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(ProductionOrderStatuses.InProgress, started.ProductionStatus);
    }

    [Fact]
    public async Task StartProduction_with_stock_deducts_correctly()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);

        var deductions = new List<(Guid ProductId, int Quantity)>();

        var client = new StubTrackingMasterDataClient(deductions);
        var service = new ProductionService(db, new StubPublisher(), client);

        await service.StartProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotEmpty(deductions);
        Assert.Contains(deductions, d => d.ProductId == ProductId);
    }

    // ── Helpers ──

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new ProductionContext(options);
    }

    private static async Task<(SalesOrder, ProductionOrder)> SeedWaitingProductionOrderAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT X" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = ProductId, PartNumber = "PART-001", Description = "Part", Unit = "pcs" });
        await db.SaveChangesAsync();

        var so = new SalesOrder
        {
            Id = Guid.NewGuid(), SoNumber = "SO-STOCK-001",
            CustomerId = CustomerId, CustomerCode = "CUST-001", CustomerName = "PT X",
            ProductionWorkerUserId = WorkerUserId, ProductionWorkerName = "Worker",
            QcReviewerUserId = ReviewerUserId, QcReviewerName = "Reviewer",
            CustomerEmail = "x@test.com",
            DesignStatus = SalesOrderDesignStatuses.Approved,
            DesignApprovedAtUtc = DateTime.UtcNow,
            Status = "Confirmed"
        };
        var item = new SalesOrderItem { Id = Guid.NewGuid(), ProductId = ProductId, ProductPartNumber = "PART-001", ProductDescription = "Part", Qty = 5 };
        so.Items.Add(item);
        var po = new ProductionOrder
        {
            Id = Guid.NewGuid(), SalesOrder = so, SalesOrderId = so.Id,
            SalesOrderItem = item, SalesOrderItemId = item.Id,
            PoNumber = so.SoNumber, DrawingRef = so.SoNumber,
            BarcodeUid = $"PJT|SO|{Guid.NewGuid():N}", OrderQty = item.Qty,
            Status = ProductionOrderStatuses.Waiting
        };
        so.ProductionOrders.Add(po);
        await db.SalesOrders.AddAsync(so);
        await db.SaveChangesAsync();
        return (so, po);
    }

    private static async Task<(SalesOrder, ProductionOrder)> SeedWaitingProductionOrderWithOutOfStockMaterialAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT X" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = ProductId, PartNumber = "PART-001", Description = "Part", Unit = "pcs" });
        await db.SaveChangesAsync();

        var so = new SalesOrder
        {
            Id = Guid.NewGuid(), SoNumber = "SO-OOS-001",
            CustomerId = CustomerId, CustomerCode = "CUST-001", CustomerName = "PT X",
            ProductionWorkerUserId = WorkerUserId, ProductionWorkerName = "Worker",
            QcReviewerUserId = ReviewerUserId, QcReviewerName = "Reviewer",
            CustomerEmail = "x@test.com",
            DesignStatus = SalesOrderDesignStatuses.Approved,
            DesignApprovedAtUtc = DateTime.UtcNow,
            Status = "Confirmed"
        };
        var item = new SalesOrderItem { Id = Guid.NewGuid(), ProductId = ProductId, ProductPartNumber = "PART-001", ProductDescription = "Part", Qty = 10 };
        so.Items.Add(item);
        var po = new ProductionOrder
        {
            Id = Guid.NewGuid(), SalesOrder = so, SalesOrderId = so.Id,
            SalesOrderItem = item, SalesOrderItemId = item.Id,
            PoNumber = so.SoNumber, DrawingRef = so.SoNumber,
            BarcodeUid = $"PJT|SO|{Guid.NewGuid():N}", OrderQty = item.Qty,
            Status = ProductionOrderStatuses.Waiting
        };
        so.ProductionOrders.Add(po);
        await db.SalesOrders.AddAsync(so);
        await db.SaveChangesAsync();
        return (so, po);
    }

    private sealed class StubPublisher : IEventPublisher
    {
        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];
        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default) { PublishedEvents.Add(e); return Task.CompletedTask; }
    }

    private sealed class StubOutOfStockMasterDataClient : IMasterDataClient
    {
        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "x@test.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub Desc", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) =>
            throw new InvalidOperationException("Stock tidak mencukupi untuk memulai produksi.");
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Stock tidak mencukupi untuk memulai produksi.");
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Stock tidak mencukupi untuk memulai produksi.");
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(productIds.Select(id => new BomStockDto(id, "PART", "PARTNAME", new List<BomStockItemDto> { new BomStockItemDto(id, id, null, "INV", 1m, "kg", null, 100, "") })).ToArray());
    }

    private sealed class StubInStockMasterDataClient : IMasterDataClient
    {
        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "x@test.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub Desc", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(productIds.Select(id => new BomStockDto(id, "PART", "PARTNAME", new List<BomStockItemDto> { new BomStockItemDto(id, id, null, "INV", 1m, "kg", null, 100, "") })).ToArray());
    }

    private sealed class StubTrackingMasterDataClient(List<(Guid, int)> deductions) : IMasterDataClient
    {
        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "x@test.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub Desc", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct)
        {
            deductions.Add((productId, quantity));
            return Task.CompletedTask;
        }
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken)
        {
            foreach (var item in items) { deductions.Add((item.ProductId, item.ProductionQuantity)); }
            return Task.CompletedTask;
        }
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) { foreach(var item in items) { deductions.Add((item.InventoryItemId, (int)item.Quantity)); } return Task.CompletedTask; }
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(productIds.Select(id => new BomStockDto(id, "PART", "PARTNAME", new List<BomStockItemDto> { new BomStockItemDto(id, id, null, "INV", 1m, "kg", null, 100, "") })).ToArray());
    }
}

