using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Application.IntegrationEvents;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;
using PJT_ERP.Purchasing.Api.Controllers;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using Microsoft.AspNetCore.Authorization;

namespace Purchasing.API.Tests;

public sealed class PurchaseRequestServiceTests
{
    [Fact]
    public void MaterialTrackingController_allows_operational_read_roles()
    {
        var authorize = Assert.Single(
            typeof(MaterialTrackingController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
                .Cast<AuthorizeAttribute>());

        Assert.Equal("Admin,Finance,Engineering,Purchasing,Owner,Sales Order", authorize.Roles);
    }

    [Fact]
    public async Task Integration_handlers_create_sales_order_snapshot_and_material_requirement()
    {
        await using var db = CreateDbContext();
        var salesOrderId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var productionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        await new SalesOrderConfirmedEventHandler(db).Handle(
            new SalesOrderConfirmedEvent(salesOrderId, "SO-001", Guid.Parse("33333333-3333-3333-3333-333333333333"), DateTime.UtcNow));
        await new SpkCreatedEventHandler(db).Handle(
            new SpkCreatedEvent(
                productionOrderId,
                salesOrderId,
                "SPK-001",
                "PJT|SPK|001",
                Guid.Parse("44444444-4444-4444-4444-444444444444"),
                5,
                "PART-001",
                "Shaft",
                "DRW-001",
                "S45C"));

        var requirement = await db.MaterialRequirements.SingleAsync();
        Assert.Equal(salesOrderId, requirement.SalesOrderId);
        Assert.Equal("SO-001", requirement.SalesOrderNumber);
        Assert.Equal(productionOrderId, requirement.ProductionOrderId);
        Assert.Equal("S45C", requirement.MaterialSpec);
        Assert.Equal(MaterialRequirementStatuses.Required, requirement.Status);
    }

    [Fact]
    public async Task CreateAsync_links_purchase_request_to_material_requirement_and_marks_requested()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = new PurchaseRequestService(db, new RecordingEventPublisher());

        var purchaseRequest = await service.CreateAsync(
            new CreatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("55555555-5555-5555-5555-555555555555"),
                "Purchasing",
                null,
                null,
                null,
                [new CreatePurchaseRequestItem(requirement.Id, null, null, null, null, null, "", null, 5, "Supplier A", "Need material")]),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.Submitted, purchaseRequest.Status);
        Assert.Equal(requirement.SalesOrderId, purchaseRequest.SalesOrderId);
        var item = Assert.Single(purchaseRequest.Items);
        Assert.Equal(requirement.Id, item.MaterialRequirementId);
        Assert.Equal("S45C", item.ItemName);
        Assert.Equal(PurchaseItemStatuses.Requested, item.PurchaseStatus);

        var updatedRequirement = await db.MaterialRequirements.SingleAsync();
        Assert.Equal(MaterialRequirementStatuses.PurchaseRequested, updatedRequirement.Status);
    }

    [Fact]
    public async Task ReviewAsync_approves_request_and_updates_requirement()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = new PurchaseRequestService(db, eventPublisher);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);

        var reviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(Guid.Parse("66666666-6666-6666-6666-666666666666"), "Approve", null),
            CancellationToken.None);

        Assert.NotNull(reviewed);
        Assert.Equal(PurchaseRequestStatuses.Approved, reviewed.Status);
        Assert.Equal(PurchaseItemStatuses.Approved, Assert.Single(reviewed.Items).PurchaseStatus);
        Assert.Equal(MaterialRequirementStatuses.PurchaseApproved, (await db.MaterialRequirements.SingleAsync()).Status);
        Assert.Single(eventPublisher.PublishedEvents.OfType<PurchaseRequestReviewedEvent>());
    }

    [Fact]
    public async Task UpdatePurchaseItemInfoAsync_records_supplier_dates_and_received_status()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = new PurchaseRequestService(db, new RecordingEventPublisher());
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        var reviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(Guid.Parse("66666666-6666-6666-6666-666666666666"), "Approve", null),
            CancellationToken.None);
        var itemId = Assert.Single(reviewed!.Items).Id;

        var updated = await service.UpdatePurchaseItemInfoAsync(
            purchaseRequest.Id,
            itemId,
            new UpdatePurchaseItemInfoRequest("Supplier A", new DateOnly(2026, 5, 17), new DateOnly(2026, 5, 20), new DateOnly(2026, 5, 19), "Received", "Material arrived"),
            CancellationToken.None);

        var item = Assert.Single(updated!.Items);
        Assert.Equal("Supplier A", item.SupplierName);
        Assert.Equal(PurchaseItemStatuses.Received, item.PurchaseStatus);
        Assert.Equal(new DateOnly(2026, 5, 19), item.ReceivedDate);
        Assert.Equal(MaterialRequirementStatuses.Received, (await db.MaterialRequirements.SingleAsync()).Status);
    }

    [Fact]
    public async Task GetSalesOrderMaterialTrackingAsync_returns_requirements_and_linked_purchase_info()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = new PurchaseRequestService(db, new RecordingEventPublisher());
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        var reviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(Guid.Parse("66666666-6666-6666-6666-666666666666"), "Approve", null),
            CancellationToken.None);
        await service.UpdatePurchaseItemInfoAsync(
            purchaseRequest.Id,
            Assert.Single(reviewed!.Items).Id,
            new UpdatePurchaseItemInfoRequest("Supplier A", new DateOnly(2026, 5, 17), null, new DateOnly(2026, 5, 18), "Received", null),
            CancellationToken.None);

        var tracking = await service.GetSalesOrderMaterialTrackingAsync(requirement.SalesOrderId, CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SalesOrderNumber);
        Assert.Equal(1, tracking.TotalRequirements);
        Assert.Equal(1, tracking.ReceivedRequirements);
        Assert.Equal(100m, tracking.ReceivedPercent);
        var linkedItem = Assert.Single(Assert.Single(tracking.Requirements).PurchaseItems);
        Assert.Equal(PurchaseItemStatuses.Received, linkedItem.PurchaseStatus);
        Assert.Equal("Supplier A", linkedItem.SupplierName);
    }

    private static PurchasingContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PurchasingContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new PurchasingContext(options);
    }

    private static async Task<MaterialRequirement> SeedRequirementAsync(PurchasingContext db)
    {
        var snapshot = new SalesOrderSnapshot
        {
            SalesOrderId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            SalesOrderNumber = "SO-001",
            CustomerId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            ConfirmedAtUtc = DateTime.UtcNow
        };
        var requirement = new MaterialRequirement
        {
            SalesOrderId = snapshot.SalesOrderId,
            SalesOrder = snapshot,
            SalesOrderNumber = snapshot.SalesOrderNumber,
            ProductionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            SpkNumber = "SPK-001",
            BarcodeUid = "PJT|SPK|001",
            ProductId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            ProductPartNumber = "PART-001",
            ProductDescription = "Shaft",
            MaterialSpec = "S45C",
            RequiredQty = 5,
            ProjectName = "SO-001"
        };
        snapshot.MaterialRequirements.Add(requirement);
        await db.SalesOrderSnapshots.AddAsync(snapshot);
        await db.SaveChangesAsync();
        return requirement;
    }

    private static Task<PurchaseRequestDto> CreateLinkedPurchaseRequestAsync(
        PurchaseRequestService service,
        MaterialRequirement requirement)
    {
        return service.CreateAsync(
            new CreatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("55555555-5555-5555-5555-555555555555"),
                "Purchasing",
                null,
                null,
                null,
                [new CreatePurchaseRequestItem(requirement.Id, null, null, null, null, null, "", null, 5, "Supplier A", "Need material")]),
            CancellationToken.None);
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
