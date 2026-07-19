using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

/// <summary>
/// Tests for mixed-product SOs: registered products (pre-built BOM) + custom products (needs Engineering design).
/// </summary>
public sealed class MixedProductSalesOrderTests
{
    private static readonly Guid WorkerUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    private static readonly Guid ReviewerUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    // Registered product (has BOM, design already approved)
    private static readonly Guid RegisteredProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    // Custom product (no BOM, needs internal engineering design)
    private static readonly Guid CustomProductId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public async Task Create_mixed_so_sets_design_status_to_pending_design()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId,
            DateOnly.FromDateTime(DateTime.UtcNow),
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [
                new CreateSalesOrderItemRequest(RegisteredProductId, 5, 0m, null),
                new CreateSalesOrderItemRequest(CustomProductId, 2, 0m, null),
            ],
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
            null, "INTERNAL_DESIGN", SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        Assert.StartsWith("SO-", so.SoNumber);
        Assert.Equal(SalesOrderDesignStatuses.PendingDesign, so.DesignStatus);
        Assert.Equal(2, so.Items.Count);
    }

    [Fact]
    public async Task Mixed_so_rejects_start_production_when_custom_design_is_still_pending()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        // Create mixed SO with PendingDesign — custom product not done yet
        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [
                new CreateSalesOrderItemRequest(RegisteredProductId, 5, 0m, null),
                new CreateSalesOrderItemRequest(CustomProductId, 2, 0m, null),
            ],
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
            null, "INTERNAL_DESIGN", SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        // Confirm should REJECT because design is not approved
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ConfirmSalesOrderAsync(so.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None));

        // Start production directly should also fail — no confirmed order exists
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.StartProductionAsync(so.Id, new ProductionStatusUpdateRequest(WorkerUserId, "Worker"), CancellationToken.None));
    }

    [Fact]
    public async Task Mixed_so_registered_item_passes_through_without_design_step()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        // Registered product alone → auto-approved design
        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [new CreateSalesOrderItemRequest(RegisteredProductId, 5, 0m, null)],
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
            null, null, SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        Assert.Equal(SalesOrderDesignStatuses.Approved, so.DesignStatus);
        Assert.Equal("Waiting Pricing", so.Status);
    }

    [Fact]
    public async Task Mixed_so_custom_only_needs_design_step()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        // Custom only → must go through design
        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [new CreateSalesOrderItemRequest(CustomProductId, 2, 0m, "Need full design")],
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
            null, "INTERNAL_DESIGN", SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        Assert.Equal(SalesOrderDesignStatuses.PendingDesign, so.DesignStatus);
        Assert.Equal("Draft", so.Status);
        Assert.Single(so.Items);
    }

    [Fact]
    public async Task Mixed_so_publishes_correct_total_items_in_events()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var publisher = new RecordingEventPublisher();
        var service = new ProductionService(db, publisher, new StubMasterDataClient());

        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
            [
                new CreateSalesOrderItemRequest(RegisteredProductId, 4, 0m, null),
                new CreateSalesOrderItemRequest(RegisteredProductId, 6, 0m, null),
                new CreateSalesOrderItemRequest(CustomProductId, 1, 0m, "Unique design"),
            ],
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(WorkerUserId, "Engineer Worker"),
            new EngineerAssignment(ReviewerUserId, "QC Reviewer"),
            null, "INTERNAL_DESIGN", SalesOrderDesignStatuses.Approved),
            CancellationToken.None);

        await service.ConfirmSalesOrderAsync(so.Id, new ConfirmSalesOrderRequest(Guid.NewGuid()), CancellationToken.None);

        var spkEvent = publisher.PublishedEvents.OfType<SpkCreatedEvent>().First();
        Assert.Equal(3, spkEvent.Items!.Count);
    }

    [Fact]
    public async Task Custom_so_with_customer_design_reference_url_stores_and_returns_url()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [new CreateSalesOrderItemRequest(CustomProductId, 2, 0m, null, CustomerDrawingUrl: "https://client.example.com/designs/jig-v2.dwg")],
            CustomerDrawingUrl: "https://client.example.com/designs/reference.png",
            DesignReference: "CUSTOMER_DRAWING",
            DesignStatus: SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        Assert.Equal("CUSTOMER_DRAWING", so.DesignReference);
        Assert.Equal("https://client.example.com/designs/reference.png", so.CustomerDrawingUrl);
        Assert.Single(so.Items);
    }

    [Fact]
    public async Task Custom_so_without_customer_design_url_uses_internal_design()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            [new CreateSalesOrderItemRequest(CustomProductId, 1, 0m, "Need full internal design")],
            DesignReference: "INTERNAL_DESIGN",
            DesignStatus: SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        Assert.Equal("INTERNAL_DESIGN", so.DesignReference);
        Assert.Null(so.CustomerDrawingUrl);
        Assert.Equal(SalesOrderDesignStatuses.PendingDesign, so.DesignStatus);
    }

    [Fact]
    public async Task Mixed_so_one_customer_design_one_internal_design()
    {
        await using var db = CreateDbContext();
        await SeedProductsAsync(db);
        var service = CreateService(db);

        var so = await service.CreateSalesOrderAsync(new CreateSalesOrderRequest(
            CustomerId, DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)),
            [
                new CreateSalesOrderItemRequest(RegisteredProductId, 10, 0m, null),
                new CreateSalesOrderItemRequest(CustomProductId, 3, 0m, "Custom design by Engineering", DesignReference: "INTERNAL_DESIGN"),
                new CreateSalesOrderItemRequest(CustomProductId, 1, 0m, "Jig with client design", CustomerDrawingUrl: "https://client.example.com/jig-ref.pdf"),
            ],
            DesignReference: "INTERNAL_DESIGN",
            DesignStatus: SalesOrderDesignStatuses.PendingDesign),
            CancellationToken.None);

        Assert.Equal("INTERNAL_DESIGN", so.DesignReference);
        Assert.Equal(3, so.Items.Count);
        Assert.Equal(SalesOrderDesignStatuses.PendingDesign, so.DesignStatus);
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

    private static async Task SeedProductsAsync(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT Mixed Test" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = RegisteredProductId, PartNumber = "PART-REG-001", Description = "Registered Shaft", Unit = "pcs" });
        await db.ProductReplicas.AddAsync(new ProductReplica { Id = CustomProductId, PartNumber = "PART-CUSTOM-001", Description = "Custom Jig", Unit = "set" });
        await db.SaveChangesAsync();
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
            Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-STUB", "Stub", "pcs", null, true));
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}

