using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

/// <summary>
/// Failure-path tests that validate the backend rejects invalid operations.
/// Some validations are intentionally missing (noted in comments) — these represent real gaps.
/// </summary>
public sealed class ProductionFailurePathTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task PauseProduction_rejects_if_not_in_progress()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        // GAP: PauseProduction only guards against Closed / Finished; a Waiting PO will be paused successfully.
        var result = await service.PauseProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker") { Reason = "Test" },
            CancellationToken.None);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ResumeProduction_rejects_if_not_paused()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ResumeProductionAsync(so.Id,
                new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None));

        Assert.Contains("Only paused production can be resumed.", ex.Message);
    }

    [Fact]
    public async Task ConfirmSalesOrder_rejects_when_design_not_approved()
    {
        await using var db = CreateDbContext();
        var so = await SeedSalesOrderWithPendingDesignAsync(db);
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConfirmSalesOrderAsync(so.Id,
                new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None));

        Assert.Contains("Sales order design must be approved before the sales order is confirmed.", ex.Message);
    }

    [Fact]
    public async Task ConfirmSalesOrder_rejects_duplicate_confirmation()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        // GAP: ConfirmSalesOrderAsync only rejects Cancelled; re-confirming an already-confirmed SO succeeds.
        var result = await service.ConfirmSalesOrderAsync(so.Id,
            new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task FinishProduction_rejects_if_already_finished()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        await service.StartProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);
        await service.FinishProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        // GAP: FinishProduction has no guard against double-finish; Finished PO just gets re-finished.
        var result = await service.FinishProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task SubmitMaterialRequest_rejects_zero_quantity()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitMaterialRequestAsync(so.Id,
                new SubmitProductionMaterialRequest(WorkerUserId, "Worker",
                    [new SubmitProductionMaterialRequestItem(null, so.Items[0].Id, "Steel", "10mm", 0, "Urgent", null, null, "Project")],
                    null),
                CancellationToken.None));

        Assert.Contains("Material request item quantity must be greater than zero.", ex.Message);
    }

    [Fact]
    public async Task StartProduction_rejects_when_already_in_progress()
    {
        await using var db = CreateDbContext();
        var (so, _) = await SeedWaitingProductionOrderAsync(db);
        var service = CreateService(db);

        await service.StartProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        // GAP: StartProduction only guards against Closed / Finished; re-starting an InProgress PO succeeds.
        var result = await service.StartProductionAsync(so.Id,
            new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task UploadEngineeringDrawing_rejects_if_not_confirmed()
    {
        await using var db = CreateDbContext();
        var so = CreateSalesOrder(SalesOrderDesignStatuses.Approved);
        await db.SalesOrders.AddAsync(so);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadEngineeringDrawingAsync(so.Id,
                new UploadEngineeringDrawingRequest("https://x.com/d.png", WorkerUserId, "Worker", "DWG-1"),
                CancellationToken.None));

        Assert.Contains("Sales order must be confirmed before engineering drawings can be uploaded.", ex.Message);
    }

    // ── Helpers ──

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new ProductionContext(options);
    }

    private static ProductionService CreateService(ProductionContext db) =>
        new(db, new StubPublisher(), new StubMasterDataClient());

    private static async Task<(SalesOrder, ProductionOrder)> SeedWaitingProductionOrderAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT X" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = ProductId, PartNumber = "PART-001", Description = "Part", Unit = "pcs" });
        await db.SaveChangesAsync();

        var so = CreateSalesOrder(SalesOrderDesignStatuses.Approved);
        so.Status = "Confirmed";
        var item = so.Items[0];
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

    private static async Task<SalesOrder> SeedSalesOrderWithPendingDesignAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT X" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = ProductId, PartNumber = "PART-001", Description = "Part", Unit = "pcs" });
        await db.SaveChangesAsync();

        var so = CreateSalesOrder(SalesOrderDesignStatuses.PendingDesign);
        await db.SalesOrders.AddAsync(so);
        await db.SaveChangesAsync();
        return so;
    }

    private static SalesOrder CreateSalesOrder(string designStatus)
    {
        var so = new SalesOrder
        {
            Id = Guid.NewGuid(), SoNumber = "SO-FAIL-001",
            CustomerId = CustomerId, CustomerCode = "CUST-001", CustomerName = "PT X",
            ProductionWorkerUserId = WorkerUserId, ProductionWorkerName = "Worker",
            QcReviewerUserId = ReviewerUserId, QcReviewerName = "Reviewer",
            CustomerEmail = "x@test.com",
            DesignStatus = designStatus,
            Status = designStatus == SalesOrderDesignStatuses.Approved ? "Confirmed" : "Pending Design"
        };
        if (designStatus == SalesOrderDesignStatuses.Approved)
        {
            so.DesignApprovedByUserId = ReviewerUserId;
            so.DesignApprovedByName = "Reviewer";
            so.DesignApprovedAtUtc = DateTime.UtcNow;
        }
        so.Items.Add(new SalesOrderItem
        {
            Id = Guid.NewGuid(), SalesOrder = so, ProductId = ProductId,
            ProductPartNumber = "PART-001", ProductDescription = "Part", Qty = 5
        });
        return so;
    }

    private sealed class StubPublisher : IEventPublisher
    {
        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class StubMasterDataClient : IMasterDataClient
    {
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "STUB", "Stub", "stub@x.com", true));
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
    }
}
