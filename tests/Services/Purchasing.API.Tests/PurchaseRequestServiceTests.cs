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
    [Theory]
    [InlineData(nameof(PurchaseRequestsController.Create), "Admin,Engineering,Engineering Supervisor,Purchasing")]
    [InlineData(nameof(PurchaseRequestsController.Update), "Admin,Engineering,Engineering Supervisor,Purchasing")]
    [InlineData(nameof(PurchaseRequestsController.SupervisorReview), "Admin,Engineering Supervisor")]
    [InlineData(nameof(PurchaseRequestsController.FinanceReview), "Admin,Finance")]
    [InlineData(nameof(PurchaseRequestsController.Review), "Admin,Finance")]
    [InlineData(nameof(PurchaseRequestsController.ProcessItem), "Admin,Purchasing")]
    [InlineData(nameof(PurchaseRequestsController.RejectItem), "Admin,Purchasing")]
    [InlineData(nameof(PurchaseRequestsController.ReceiveItem), "Admin,Purchasing")]
    [InlineData(nameof(PurchaseRequestsController.UpdatePurchaseInfo), "Admin,Purchasing")]
    public void PurchaseRequestController_allows_expected_write_roles(string actionName, string expectedRoles)
    {
        var authorize = typeof(PurchaseRequestsController)
            .GetMethods()
            .Single(method => method.Name == actionName)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
            .Cast<AuthorizeAttribute>()
            .Single();

        Assert.Equal(expectedRoles, authorize.Roles);
    }

    [Fact]
    public void MaterialTrackingController_allows_operational_read_roles()
    {
        var authorize = Assert.Single(
            typeof(MaterialTrackingController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
                .Cast<AuthorizeAttribute>());

        Assert.Equal("Admin,Finance,Engineering,Engineering Supervisor,Purchasing,Owner,Sales,Sales Order", authorize.Roles);
    }

    [Fact]
    public async Task Integration_handlers_create_sales_order_snapshot_and_material_requirement()
    {
        await using var db = CreateDbContext();
        var salesOrderId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var productionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var firstSalesOrderItemId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var secondSalesOrderItemId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        await new SalesOrderConfirmedEventHandler(db).Handle(
            new SalesOrderConfirmedEvent(salesOrderId, "SO-001", Guid.Parse("33333333-3333-3333-3333-333333333333"), DateTime.UtcNow));
        await new SpkCreatedEventHandler(db).Handle(
            new SpkCreatedEvent(
                productionOrderId,
                salesOrderId,
                "SO-001",
                "PJT|SO|001",
                Guid.Parse("44444444-4444-4444-4444-444444444444"),
                5,
                "PART-001",
                "Shaft",
                "SO-001",
                "S45C",
                SalesOrderNumber: "SO-001",
                Items:
                [
                    new SpkCreatedItem(firstSalesOrderItemId, Guid.Parse("44444444-4444-4444-4444-444444444444"), 5, "PART-001", "Shaft", "S45C"),
                    new SpkCreatedItem(secondSalesOrderItemId, Guid.Parse("44444444-4444-4444-4444-444444444445"), 2, "PART-002", "Bushing", "Bronze")
                ]));

        var requirements = await db.MaterialRequirements.OrderBy(requirement => requirement.ProductPartNumber).ToArrayAsync();
        Assert.Equal(2, requirements.Length);
        Assert.All(requirements, requirement => Assert.Equal(salesOrderId, requirement.SalesOrderId));
        Assert.All(requirements, requirement => Assert.Equal("SO-001", requirement.SalesOrderNumber));
        Assert.Equal(firstSalesOrderItemId, requirements[0].SalesOrderItemId);
        Assert.Equal("S45C", requirements[0].MaterialSpec);
        Assert.Equal("Bronze", requirements[1].MaterialSpec);
        Assert.All(requirements, requirement => Assert.Equal(MaterialRequirementStatuses.Required, requirement.Status));
    }

    [Fact]
    public async Task MaterialRequestSubmittedEventHandler_creates_submitted_multi_item_request()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);
        var handler = new MaterialRequestSubmittedEventHandler(service);
        var salesOrderId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var workerUserId = Guid.Parse("55555555-5555-5555-5555-555555555555");

        await handler.Handle(
            new MaterialRequestSubmittedEvent(
                salesOrderId,
                "SO-001",
                Guid.NewGuid(),
                null,
                workerUserId,
                "Worker A",
                new DateOnly(2026, 7, 1),
                "Project",
                "Test notes",
                [
                    new MaterialRequestSubmittedItem(
                        null,
                        Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                        "S45C Round Bar",
                        "Diameter 10mm",
                        2,
                        "Urgent",
                        "PT Steel",
                        "Main material",
                        "Project"),
                    new MaterialRequestSubmittedItem(
                        null,
                        null,
                        "Coolant",
                        "Water soluble",
                        1,
                        "Normal",
                        null,
                        "Shared shop-floor consumable",
                        "Consumable")
                ]),
            CancellationToken.None);

        var request = await db.PurchaseRequests.Include(item => item.Items).SingleAsync();
        Assert.Equal(PurchaseRequestStatuses.SupervisorApproved, request.Status);
        Assert.Equal(salesOrderId, request.SalesOrderId);
        Assert.Equal("SO-001", request.SalesOrderNumber);
        Assert.Equal(workerUserId, request.RequestedByUserId);
        Assert.Equal(2, request.Items.Count);
        Assert.Contains(request.Items, item => item.ItemName == "Coolant" && item.PurchaseCategory == PurchaseItemCategories.Consumable);
    }

    [Fact]
    public async Task MaterialRequestSubmittedEventHandler_allows_same_material_different_sizes_and_receives_them()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);
        var handler = new MaterialRequestSubmittedEventHandler(service);
        var salesOrderId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        var workerUserId = Guid.Parse("55555555-5555-5555-5555-555555555555");

        // 1. Submit Material Request with SAME item name but DIFFERENT sizes
        await handler.Handle(
            new MaterialRequestSubmittedEvent(
                salesOrderId,
                "SO-999",
                Guid.NewGuid(),
                null,
                workerUserId,
                "Worker A",
                new DateOnly(2026, 7, 1),
                "Project",
                "Test notes",
                [
                    new MaterialRequestSubmittedItem(null, null, "Aluminium", "100x50", 1, "Normal", null, "For side panel", "Project"),
                    new MaterialRequestSubmittedItem(null, null, "Aluminium", "200x300", 2, "Normal", null, "For back panel", "Project")
                ]),
            CancellationToken.None);

        var request = await db.PurchaseRequests.Include(item => item.Items).SingleAsync();
        Assert.Equal(2, request.Items.Count);
        
        var item1 = request.Items.Single(i => i.Size == "100x50");
        var item2 = request.Items.Single(i => i.Size == "200x300");
        
        Assert.Equal("Aluminium", item1.ItemName);
        Assert.Equal("Aluminium", item2.ItemName);

        // 2. Process, Order, and Receive them
        await service.ReviewAsync(request.Id, new ReviewPurchaseRequest(workerUserId, PurchaseRequestStatuses.Approved, null, "Supervisor"), CancellationToken.None);
        
        // Process both items (sets supplier and prices)
        await service.ProcessPurchaseItemAsync(request.Id, item1.Id, new ProcessPurchaseItemRequest("PT Alu", new DateOnly(2026, 7, 10), null, 1000, null), CancellationToken.None);
        await service.ProcessPurchaseItemAsync(request.Id, item2.Id, new ProcessPurchaseItemRequest("PT Alu", new DateOnly(2026, 7, 10), null, 2000, null), CancellationToken.None);
        
        await service.ReviewAsync(request.Id, new ReviewPurchaseRequest(workerUserId, PurchaseRequestStatuses.Approved, null, "Finance"), CancellationToken.None);
        
        // Order both items
        await service.UpdatePurchaseItemInfoAsync(request.Id, item1.Id, new UpdatePurchaseItemInfoRequest(null, new DateOnly(2026, 7, 10), null, null, PurchaseItemStatuses.Ordered, null, "PO-999"), CancellationToken.None);
        await service.UpdatePurchaseItemInfoAsync(request.Id, item2.Id, new UpdatePurchaseItemInfoRequest(null, new DateOnly(2026, 7, 10), null, null, PurchaseItemStatuses.Ordered, null, "PO-999"), CancellationToken.None);
        
        // Receive both items (Terima barang)
        var receivedDto = await service.ReceivePurchaseItemAsync(request.Id, item1.Id, new ReceivePurchaseItemRequest(new DateOnly(2026, 7, 12), "Received 100x50", 1), CancellationToken.None);
        receivedDto = await service.ReceivePurchaseItemAsync(request.Id, item2.Id, new ReceivePurchaseItemRequest(new DateOnly(2026, 7, 12), "Received 200x300", 2), CancellationToken.None);

        var finalRequest = await db.PurchaseRequests.Include(item => item.Items).SingleAsync();
        Assert.All(finalRequest.Items, i => Assert.Equal(PurchaseItemStatuses.Received, i.PurchaseStatus));
        Assert.Equal(PurchaseRequestStatuses.Completed, finalRequest.Status);
    }

    [Fact]
    public async Task SpkCreatedEventHandler_uses_null_sales_order_item_id_for_legacy_single_item_events()
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
                "SO-001",
                "PJT|SO|001",
                Guid.Parse("44444444-4444-4444-4444-444444444444"),
                5,
                "PART-001",
                "Shaft",
                "SO-001",
                "S45C",
                SalesOrderNumber: "SO-001"));

        var requirement = await db.MaterialRequirements.SingleAsync();
        Assert.Null(requirement.SalesOrderItemId);
    }

    [Fact]
    public async Task CreateAsync_links_purchase_request_to_material_requirement_and_marks_requested()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = CreateService(db);

        var purchaseRequest = await service.CreateAsync(
            new CreatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("55555555-5555-5555-5555-555555555555"),
                "Engineering Worker",
                null,
                null,
                null,
                [new CreatePurchaseRequestItem(requirement.Id, null, null, null, "", null, 5, "Supplier A", "Need material", "Critical")]),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.SupervisorApproved, purchaseRequest.Status);
        Assert.Equal(requirement.SalesOrderId, purchaseRequest.SalesOrderId);
        var item = Assert.Single(purchaseRequest.Items);
        Assert.Equal(requirement.Id, item.MaterialRequirementId);
        Assert.Equal("S45C", item.ItemName);
        Assert.Equal(PurchaseItemUrgencies.Critical, item.Urgency);
        Assert.Equal(PurchaseItemStatuses.Requested, item.PurchaseStatus);

        var updatedRequirement = await db.MaterialRequirements.SingleAsync();
        Assert.Equal(MaterialRequirementStatuses.PurchaseRequested, updatedRequirement.Status);
    }

    [Theory]
    [InlineData(PurchaseRequestStatuses.SupervisorRejected)]
    [InlineData(PurchaseRequestStatuses.FinanceRejected)]
    [InlineData(PurchaseRequestStatuses.Rejected)]
    public async Task UpdateAsync_allows_rejected_request_to_be_resubmitted(string rejectedStatus)
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = CreateService(db);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);

        var entity = await db.PurchaseRequests.Include(request => request.Items).SingleAsync();
        entity.Status = rejectedStatus;
        entity.RejectionReason = "Need clearer material spec";
        entity.SupervisorRejectionReason = rejectedStatus == PurchaseRequestStatuses.SupervisorRejected ? entity.RejectionReason : null;
        entity.FinanceRejectionReason = rejectedStatus == PurchaseRequestStatuses.FinanceRejected ? entity.RejectionReason : null;
        await db.SaveChangesAsync();

        var updated = await service.UpdateAsync(
            purchaseRequest.Id,
            new UpdatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("55555555-5555-5555-5555-555555555555"),
                "Engineering Worker",
                null,
                null,
                null,
                [new UpdatePurchaseRequestItem(requirement.Id, null, null, null, "", "S45C Round Bar 12mm", 3, "Supplier B", "Revised item", "Urgent")]),
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(PurchaseRequestStatuses.SupervisorApproved, updated.Status);
        Assert.Null(updated.RejectionReason);
        Assert.Null(updated.SupervisorRejectionReason);
        Assert.Null(updated.FinanceRejectionReason);
        var item = Assert.Single(updated.Items);
        Assert.Equal(requirement.Id, item.MaterialRequirementId);
        Assert.Equal("S45C", item.ItemName);
        Assert.Equal(3, item.Qty);
        Assert.Equal("S45C Round Bar 12mm", item.Size);
        Assert.Equal(MaterialRequirementStatuses.PurchaseRequested, (await db.MaterialRequirements.SingleAsync()).Status);
    }

    [Fact]
    public async Task ReviewAsync_routes_supervisor_approved_request_to_purchasing_before_finance()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = CreateService(db, eventPublisher);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);

        var supervisorReviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("77777777-7777-7777-7777-777777777777"),
                "Accept",
                null,
                "Supervisor"),
            CancellationToken.None);

        Assert.NotNull(supervisorReviewed);
        Assert.Equal(PurchaseRequestStatuses.SupervisorApproved, supervisorReviewed.Status);
        Assert.Equal(Guid.Parse("77777777-7777-7777-7777-777777777777"), supervisorReviewed.SupervisorReviewedByUserId);
        Assert.NotNull(supervisorReviewed.SupervisorReviewedAtUtc);
        Assert.Equal(PurchaseItemStatuses.Requested, Assert.Single(supervisorReviewed.Items).PurchaseStatus);
        Assert.Equal(MaterialRequirementStatuses.PurchaseRequested, (await db.MaterialRequirements.SingleAsync()).Status);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("66666666-6666-6666-6666-666666666666"),
                "Accept",
                null,
                "Finance"),
            CancellationToken.None));

        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            Assert.Single(supervisorReviewed.Items).Id,
            new ProcessPurchaseItemRequest("PT. Krakatau Steel", new DateOnly(2026, 5, 25), "PO-2026-041", 7_300_000m, null),
            CancellationToken.None);

        Assert.NotNull(processed);
        Assert.Equal(PurchaseRequestStatuses.Processing, processed.Status);
        Assert.Equal(PurchaseItemStatuses.Ordered, Assert.Single(processed.Items).PurchaseStatus);
        Assert.Equal(MaterialRequirementStatuses.Ordered, (await db.MaterialRequirements.SingleAsync()).Status);

        var financeReviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("66666666-6666-6666-6666-666666666666"),
                "Accept",
                null,
                "Finance"),
            CancellationToken.None);

        Assert.NotNull(financeReviewed);
        Assert.Equal(PurchaseRequestStatuses.FinanceApproved, financeReviewed.Status);
        Assert.Equal(Guid.Parse("66666666-6666-6666-6666-666666666666"), financeReviewed.FinanceReviewedByUserId);
        Assert.NotNull(financeReviewed.FinanceReviewedAtUtc);
        Assert.Equal(PurchaseItemStatuses.Ordered, Assert.Single(financeReviewed.Items).PurchaseStatus);
        Assert.Equal(MaterialRequirementStatuses.Ordered, (await db.MaterialRequirements.SingleAsync()).Status);
        Assert.Equal(2, eventPublisher.PublishedEvents.OfType<PurchaseRequestReviewedEvent>().Count());
    }

    [Fact]
    public async Task UpdatePurchaseItemInfoAsync_records_supplier_dates_and_received_status()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = CreateService(db);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        var approved = await AcceptPurchaseRequestAsync(service, purchaseRequest);
        var itemId = Assert.Single(approved.Items).Id;

        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            itemId,
            new ProcessPurchaseItemRequest(
                "Supplier A",
                new DateOnly(2026, 5, 20),
                "PO-2026-001",
                2_750_000m,
                "Material ordered"),
            CancellationToken.None);
        await FinanceApprovePurchaseRequestAsync(service, processed!);

        var updated = await service.UpdatePurchaseItemInfoAsync(
            purchaseRequest.Id,
            itemId,
            new UpdatePurchaseItemInfoRequest(
                "Supplier A",
                new DateOnly(2026, 5, 17),
                new DateOnly(2026, 5, 20),
                new DateOnly(2026, 5, 19),
                "Received",
                "Material arrived",
                "PO-2026-001",
                2_750_000m),
            CancellationToken.None);

        var item = Assert.Single(updated!.Items);
        Assert.Equal(PurchaseRequestStatuses.Completed, updated.Status);
        Assert.Equal("Supplier A", item.SupplierName);
        Assert.Equal("PO-2026-001", item.PoNumber);
        Assert.Equal(2_750_000m, item.EstimatedPrice);
        Assert.Equal(PurchaseItemStatuses.Received, item.PurchaseStatus);
        Assert.Equal(new DateOnly(2026, 5, 19), item.ReceivedDate);
        Assert.Equal(MaterialRequirementStatuses.Received, (await db.MaterialRequirements.SingleAsync()).Status);
    }

    [Fact]
    public async Task ProcessAndReceivePurchaseItemAsync_match_purchasing_ui_actions()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var eventPublisher = new RecordingEventPublisher();
        var service = CreateService(db, eventPublisher);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        purchaseRequest = await AcceptPurchaseRequestAsync(service, purchaseRequest);
        var itemId = Assert.Single(purchaseRequest.Items).Id;

        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            itemId,
            new ProcessPurchaseItemRequest(
                "PT. Krakatau Steel",
                new DateOnly(2026, 5, 25),
                "PO-2026-041",
                7_300_000m,
                "Stok cutting tool untuk mesin CNC"),
            CancellationToken.None);

        var processedItem = Assert.Single(processed!.Items);
        Assert.Equal(PurchaseRequestStatuses.Processing, processed.Status);
        Assert.Equal(PurchaseItemStatuses.Ordered, processedItem.PurchaseStatus);
        Assert.Equal("PT. Krakatau Steel", processedItem.SupplierName);
        Assert.Equal("PO-2026-041", processedItem.PoNumber);
        Assert.Equal(7_300_000m, processedItem.EstimatedPrice);
        Assert.Equal(new DateOnly(2026, 5, 25), processedItem.ExpectedArrivalDate);
        Assert.Equal(MaterialRequirementStatuses.Ordered, (await db.MaterialRequirements.SingleAsync()).Status);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReceivePurchaseItemAsync(
            processed!.Id,
            itemId,
            new ReceivePurchaseItemRequest(new DateOnly(2026, 5, 24), "Should wait for Finance approval"),
            CancellationToken.None));

        var financeReviewed = await FinanceApprovePurchaseRequestAsync(service, processed!);
        Assert.Equal(PurchaseRequestStatuses.FinanceApproved, financeReviewed.Status);

        eventPublisher.PublishedEvents.Clear(); // Clear events before receiving

        var received = await service.ReceivePurchaseItemAsync(
            financeReviewed.Id,
            itemId,
            new ReceivePurchaseItemRequest(new DateOnly(2026, 5, 24), "Barang diterima lengkap"),
            CancellationToken.None);

        var receivedItem = Assert.Single(received!.Items);
        Assert.Equal(PurchaseRequestStatuses.Completed, received.Status);
        Assert.Equal(PurchaseItemStatuses.Received, receivedItem.PurchaseStatus);
        Assert.Equal(new DateOnly(2026, 5, 24), receivedItem.ReceivedDate);
        Assert.Equal("PT. Krakatau Steel", receivedItem.SupplierName);
        Assert.Equal("PO-2026-041", receivedItem.PoNumber);
        Assert.Equal(MaterialRequirementStatuses.Received, (await db.MaterialRequirements.SingleAsync()).Status);
        
        var receivedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<PurchaseItemReceivedEvent>());
        Assert.Equal(received.Id, receivedEvent.PurchaseRequestId);
        Assert.Equal(receivedItem.Id, receivedEvent.PurchaseRequestItemId);
        Assert.Equal(receivedItem.ItemName, receivedEvent.ItemName);
        Assert.Equal(receivedItem.Qty, receivedEvent.QuantityReceived);
    }

    [Fact]
    public async Task RejectPurchaseItemAsync_marks_item_and_requirement_rejected()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = CreateService(db);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        purchaseRequest = await AcceptPurchaseRequestAsync(service, purchaseRequest);
        var itemId = Assert.Single(purchaseRequest.Items).Id;

        var rejected = await service.RejectPurchaseItemAsync(
            purchaseRequest.Id,
            itemId,
            new RejectPurchaseItemRequest("Request material tidak valid"),
            CancellationToken.None);

        var item = Assert.Single(rejected!.Items);
        Assert.Equal(PurchaseRequestStatuses.Rejected, rejected.Status);
        Assert.Equal(PurchaseItemStatuses.Rejected, item.PurchaseStatus);
        Assert.Equal("Request material tidak valid", item.RejectionReason);
        Assert.Equal(MaterialRequirementStatuses.PurchaseRejected, (await db.MaterialRequirements.SingleAsync()).Status);
    }

    [Fact]
    public async Task GetSalesOrderMaterialTrackingAsync_returns_requirements_and_linked_purchase_info()
    {
        await using var db = CreateDbContext();
        var requirement = await SeedRequirementAsync(db);
        var service = CreateService(db);
        var purchaseRequest = await CreateLinkedPurchaseRequestAsync(service, requirement);
        purchaseRequest = await AcceptPurchaseRequestAsync(service, purchaseRequest);
        var itemId = Assert.Single(purchaseRequest.Items).Id;
        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            itemId,
            new ProcessPurchaseItemRequest("Supplier A", new DateOnly(2026, 5, 18), "PO-2026-001", 2_750_000m, null),
            CancellationToken.None);
        await FinanceApprovePurchaseRequestAsync(service, processed!);
        await service.UpdatePurchaseItemInfoAsync(
            purchaseRequest.Id,
            itemId,
            new UpdatePurchaseItemInfoRequest("Supplier A", new DateOnly(2026, 5, 17), null, new DateOnly(2026, 5, 18), "Received", null),
            CancellationToken.None);

        var tracking = await service.GetSalesOrderMaterialTrackingAsync(requirement.SalesOrderId, CancellationToken.None);

        Assert.NotNull(tracking);
        Assert.Equal("SO-001", tracking.SalesOrderNumber);
        Assert.Equal(1, tracking.TotalRequirements);
        Assert.Equal(1, tracking.ReceivedRequirements);
        Assert.Equal(100m, tracking.ReceivedPercent);
        Assert.Null(typeof(MaterialRequirementDto).GetProperty("ProductionOrderId"));
        Assert.Null(typeof(MaterialRequirementDto).GetProperty("SpkNumber"));
        var linkedItem = Assert.Single(Assert.Single(tracking.Requirements).PurchaseItems);
        Assert.Equal(PurchaseItemStatuses.Received, linkedItem.PurchaseStatus);
        Assert.Equal("Supplier A", linkedItem.SupplierName);
    }

    [Fact]
    public async Task ProcessPurchaseItemAsync_multiple_items_different_suppliers_creates_different_pos()
    {
        await using var db = CreateDbContext();
        
        var requirement1 = await SeedRequirementAsync(db);
        var requirement2 = new MaterialRequirement
        {
            SalesOrderId = requirement1.SalesOrderId,
            SalesOrder = requirement1.SalesOrder,
            SalesOrderNumber = requirement1.SalesOrderNumber,
            ProductionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222223"),
            SpkNumber = "SO-001",
            BarcodeUid = "PJT|SO|002",
            ProductId = Guid.Parse("44444444-4444-4444-4444-444444444445"),
            ProductPartNumber = "PART-002",
            ProductDescription = "Bearing",
            MaterialSpec = "Steel",
            RequiredQty = 10,
            ProjectName = "SO-001"
        };
        db.MaterialRequirements.Add(requirement2);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var purchaseRequest = await service.CreateAsync(
            new CreatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("55555555-5555-5555-5555-555555555555"),
                "Engineering Worker",
                null,
                null,
                null,
                [
                    new CreatePurchaseRequestItem(requirement1.Id, null, null, null, "", null, 5, "Supplier A", "Need material 1", "Normal"),
                    new CreatePurchaseRequestItem(requirement2.Id, null, null, null, "", null, 10, "Supplier B", "Need material 2", "Normal")
                ]),
            CancellationToken.None);

        purchaseRequest = await AcceptPurchaseRequestAsync(service, purchaseRequest);
        var item1Id = purchaseRequest.Items.First(i => i.MaterialRequirementId == requirement1.Id).Id;
        var item2Id = purchaseRequest.Items.First(i => i.MaterialRequirementId == requirement2.Id).Id;

        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            item1Id,
            new ProcessPurchaseItemRequest("Supplier A", new DateOnly(2026, 5, 25), "PO-2026-001", 1_000_000m, null),
            CancellationToken.None);
            
        processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            item2Id,
            new ProcessPurchaseItemRequest("Supplier B", new DateOnly(2026, 5, 26), "PO-2026-002", 500_000m, null),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.Processing, processed!.Status);
        
        var item1 = processed.Items.First(i => i.Id == item1Id);
        var item2 = processed.Items.First(i => i.Id == item2Id);
        
        Assert.Equal("Supplier A", item1.SupplierName);
        Assert.Equal("PO-2026-001", item1.PoNumber);
        Assert.Equal(PurchaseItemStatuses.Ordered, item1.PurchaseStatus);
        
        Assert.Equal("Supplier B", item2.SupplierName);
        Assert.Equal("PO-2026-002", item2.PoNumber);
        Assert.Equal(PurchaseItemStatuses.Ordered, item2.PurchaseStatus);
    }

    [Fact]
    public async Task CreateAsync_manual_pr_without_so_skips_supervisor_but_requires_finance_approval()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        // 1. Create a manual PR (No SalesOrderId, no requirement link)
        var purchaseRequest = await service.CreateAsync(
            new CreatePurchaseRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.Parse("99999999-9999-9999-9999-999999999999"),
                "Office Admin",
                null, // No SO
                null,
                null,
                [
                    new CreatePurchaseRequestItem(null, null, null, null, "Office Supplies - A4 Paper", null, 10, "Gramedia", "Need for printer", "Normal")
                ]),
            CancellationToken.None);

        // Assert that it skipped Supervisor and went straight to SupervisorApproved
        Assert.Equal(PurchaseRequestStatuses.SupervisorApproved, purchaseRequest.Status);
        var itemId = Assert.Single(purchaseRequest.Items).Id;

        // 2. Purchasing processes the item (adds price and PO)
        var processed = await service.ProcessPurchaseItemAsync(
            purchaseRequest.Id,
            itemId,
            new ProcessPurchaseItemRequest("Gramedia", new DateOnly(2026, 6, 1), "PO-MANUAL-001", 500_000m, null),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.Processing, processed!.Status);

        // 3. Trying to receive the item before Finance approves should fail
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReceivePurchaseItemAsync(
            processed.Id,
            itemId,
            new ReceivePurchaseItemRequest(new DateOnly(2026, 5, 24), "Should fail"),
            CancellationToken.None));

        // 4. Finance approves the PR
        var financeReviewed = await service.ReviewAsync(
            processed.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("66666666-6666-6666-6666-666666666666"),
                "Accept",
                null,
                "Finance"),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.FinanceApproved, financeReviewed!.Status);

        // 5. Now it can be received
        var received = await service.ReceivePurchaseItemAsync(
            financeReviewed.Id,
            itemId,
            new ReceivePurchaseItemRequest(new DateOnly(2026, 6, 1), "Received normally"),
            CancellationToken.None);

        Assert.Equal(PurchaseRequestStatuses.Completed, received!.Status);
        Assert.Equal(PurchaseItemStatuses.Received, received.Items.First().PurchaseStatus);
    }

    private static PurchaseRequestService CreateService(
        PurchasingContext db,
        RecordingEventPublisher? eventPublisher = null)
    {
        return new PurchaseRequestService(db, eventPublisher ?? new RecordingEventPublisher());
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
            SpkNumber = "SO-001",
            BarcodeUid = "PJT|SO|001",
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
                "Engineering Worker",
                null,
                null,
                null,
                [new CreatePurchaseRequestItem(requirement.Id, null, null, null, "", null, 5, "Supplier A", "Need material")]),
            CancellationToken.None);
    }

    private static async Task<PurchaseRequestDto> AcceptPurchaseRequestAsync(
        PurchaseRequestService service,
        PurchaseRequestDto purchaseRequest)
    {
        var supervisorReviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("77777777-7777-7777-7777-777777777777"),
                "Accept",
                null,
                "Supervisor"),
            CancellationToken.None);

        return supervisorReviewed!;
    }

    private static async Task<PurchaseRequestDto> FinanceApprovePurchaseRequestAsync(
        PurchaseRequestService service,
        PurchaseRequestDto purchaseRequest)
    {
        var reviewed = await service.ReviewAsync(
            purchaseRequest.Id,
            new ReviewPurchaseRequest(
                Guid.Parse("66666666-6666-6666-6666-666666666666"),
                "Accept",
                null,
                "Finance"),
            CancellationToken.None);

        return reviewed!;
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
