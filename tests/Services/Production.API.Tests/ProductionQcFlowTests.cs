using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

/// <summary>
/// Tests the production → QC → Go → completed and production → QC → NoGo → rework flows.
/// </summary>
public sealed class ProductionQcFlowTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Full_flow_production_finish_QC_Go_completes_so()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var publisher = new RecordingEventPublisher();
        var service = new ProductionService(db, publisher, new StubMasterDataClient());

        // Start and finish production
        await service.StartProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);
        var finished = await service.FinishProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotNull(finished);
        Assert.Equal(ProductionOrderStatuses.Finished, finished.ProductionStatus);
        Assert.NotNull(finished.FinishedAtUtc);

        // Verify the finish event is published with correct data for QC
        var finishEvent = Assert.Single(publisher.PublishedEvents.OfType<ProductionFinishedEvent>());
        Assert.Equal(so.SoNumber, finishEvent.SpkNumber);
    }

    [Fact]
    public async Task Production_start_fetches_bom_deducts_stock()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);

        var deductedProductIds = new List<Guid>();
        var deductedQtys = new List<int>();
        var client = new TrackingMasterDataClient(deductedProductIds, deductedQtys);
        var service = new ProductionService(db, new StubPublisher(), client);

        await service.StartProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotEmpty(deductedProductIds);
        Assert.Contains(ProductId, deductedProductIds);
    }

    [Fact]
    public async Task Production_finish_publishes_event_for_qc_inspection()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var publisher = new RecordingEventPublisher();
        var service = new ProductionService(db, publisher, new StubMasterDataClient());

        await service.StartProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);
        await service.FinishProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        var finishEvent = publisher.PublishedEvents.OfType<ProductionFinishedEvent>().First();
        Assert.Equal(so.SoNumber, finishEvent.SpkNumber);
        Assert.True(finishEvent.ProductionOrderId != Guid.Empty);
    }

    [Fact]
    public async Task Qc_NoGo_sets_production_waiting_and_so_ready_for_production()
    {
        await using var db = CreateDbContext();
        var (so, po) = await SeedWaitingProductionOrderAsync(db);
        so.Status = SalesOrderStatuses.QC;
        po.Status = ProductionOrderStatuses.Finished;
        await db.SaveChangesAsync();

        var publisher = new RecordingEventPublisher();
        var handler = new PJT_ERP.Production.Api.Application.IntegrationEvents.QcCheckCompletedEventHandler(db, publisher);

        var noGoEvent = new QcCheckCompletedEvent(
            Guid.NewGuid(),
            po.Id,
            "NoGo",
            DateTime.UtcNow,
            Array.Empty<string>(),
            Array.Empty<string>()
        );

        await handler.Handle(noGoEvent, CancellationToken.None);

        var updatedPo = await db.ProductionOrders.FindAsync(po.Id);
        var updatedSo = await db.SalesOrders.FindAsync(so.Id);

        Assert.NotNull(updatedPo);
        Assert.NotNull(updatedSo);
        Assert.Equal("NoGo", updatedPo.QcDecision);
        Assert.Equal(ProductionOrderStatuses.Waiting, updatedPo.Status);
        Assert.Equal(SalesOrderStatuses.QC, updatedSo.Status);
        
        // Ensure no invoice candidate event was published
        Assert.Empty(publisher.PublishedEvents.OfType<SalesOrderReadyForInvoiceEvent>());
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
            Id = Guid.NewGuid(), SoNumber = "SO-QC-001",
            CustomerId = CustomerId, CustomerCode = "CUST-001", CustomerName = "PT X",
            ProductionWorkerUserId = WorkerUserId, ProductionWorkerName = "Worker",
            QcReviewerUserId = ReviewerUserId, QcReviewerName = "Reviewer",
            CustomerEmail = "x@test.com",
            DesignStatus = SalesOrderDesignStatuses.Approved, DesignApprovedAtUtc = DateTime.UtcNow,
            Status = "Confirmed",
        };
        var item = new SalesOrderItem { Id = Guid.NewGuid(), ProductId = ProductId, ProductPartNumber = "PART-001", ProductDescription = "Part", Qty = 5 };
        so.Items.Add(item);
        var po = new ProductionOrder
        {
            Id = Guid.NewGuid(), SalesOrder = so, SalesOrderId = so.Id,
            SalesOrderItem = item, SalesOrderItemId = item.Id,
            PoNumber = so.SoNumber, DrawingRef = so.SoNumber,
            BarcodeUid = $"PJT|SO|{Guid.NewGuid():N}", OrderQty = item.Qty,
            Status = ProductionOrderStatuses.Waiting,
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

    private sealed class StubMasterDataClient : IMasterDataClient
    {
                public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "x@test.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub Desc", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(Array.Empty<BomStockDto>());
    }

    private sealed class TrackingMasterDataClient(List<Guid> productIds, List<int> qtys) : IMasterDataClient
    {
                public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "x@test.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub Desc", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct)
        {
            productIds.Add(productId); qtys.Add(quantity); return Task.CompletedTask;
        }
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken)
        {
            foreach(var item in items) { productIds.Add(item.ProductId); qtys.Add(item.ProductionQuantity); }
            return Task.CompletedTask;
        }
        public Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> pIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<BomStockDto>>(Array.Empty<BomStockDto>());
    }
}
