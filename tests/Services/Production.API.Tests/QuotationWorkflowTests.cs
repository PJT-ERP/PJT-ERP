using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Quotations;
using PJT_ERP.Production.Api.Controllers;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace Production.API.Tests;

public sealed class QuotationWorkflowTests
{
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-4111-8111-111111111111");
    private static readonly Guid EngineerId = Guid.Parse("22222222-2222-4222-8222-222222222222");

    [Fact]
    public async Task EngineeringWorkAndSupervisorApproval_requireAssignmentAndSubmissionInOrder()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await service.CreateAsync(Request(), CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitDesignAsync(
            quotation.Id,
            new SubmitQuotationDesignRequest("https://design.test/part.dwg", Bom(), EngineerId, "Engineer"),
            CancellationToken.None));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None));

        var assigned = await service.AssignEngineerAsync(quotation.Id, new AssignQuotationEngineerRequest(EngineerId, "Engineer"), CancellationToken.None);
        Assert.Equal(EngineerId, assigned!.AssignedEngineerId);
        Assert.Equal("Engineer", assigned.AssignedEngineerName);
        var storedAssignment = await db.Quotations.SingleAsync();
        Assert.Equal(EngineerId, storedAssignment.AssignedEngineerId);
        Assert.Equal("Engineer", storedAssignment.AssignedEngineerName);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None));
        await service.SubmitDesignAsync(quotation.Id, new SubmitQuotationDesignRequest("https://design.test/part.dwg", Bom(), EngineerId, "Engineer"), CancellationToken.None);
        await service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None);
    }

    [Fact]
    public async Task EngineeringDesign_approvalAndPricingDoNotCreateSalesOrder_untilExplicitConversion()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var publisher = new RecordingPublisher();
        var service = new QuotationService(db, publisher);
        var quotation = await service.CreateAsync(Request(), CancellationToken.None);
        Assert.Equal(QuotationStatuses.PendingDesign, quotation.Status);
        Assert.Single(await db.Quotations.ToListAsync());
        Assert.Empty(await db.SalesOrders.ToListAsync());

        await service.AssignEngineerAsync(quotation.Id, new AssignQuotationEngineerRequest(EngineerId, "Engineer"), CancellationToken.None);
        await service.SubmitDesignAsync(quotation.Id, new SubmitQuotationDesignRequest("https://design.test/part.dwg", Bom(), EngineerId, "Engineer"), CancellationToken.None);
        quotation = (await service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None))!;
        Assert.Equal(QuotationStatuses.ClientDesignApproval, quotation.Status);
        Assert.Empty(await db.SalesOrders.ToListAsync());

        await service.ApproveClientDesignAsync(quotation.Id, CancellationToken.None);
        await service.SubmitPricingAsync(quotation.Id, new SubmitQuotationPricingRequest(1250m, null, EngineerId, "Finance"), CancellationToken.None);
        await service.MarkWonAsync(quotation.Id, CancellationToken.None);
        Assert.Empty(await db.SalesOrders.ToListAsync());

        var order = await service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None);
        Assert.NotNull(order);
        Assert.Equal("WaitingPayment", order!.Status);
        Assert.Equal(EngineerId, order.DesignWorkerUserId);
        Assert.Equal("Engineer", order.DesignWorkerName);
        Assert.NotNull(order.Materials);
        var material = Assert.Single(order.Materials!);
        Assert.Equal("MAT-01", material.Code);
        Assert.Equal("Steel", material.Name);
        Assert.Equal("S45C", material.Spec);
        Assert.Equal("S45C", material.Specification);
        Assert.Equal(2, material.Quantity);
        Assert.Equal("kg", material.Unit);
        Assert.Equal(1, await db.SalesOrders.CountAsync());
        var persistedOrder = await db.SalesOrders.Include(so => so.Items).SingleAsync();
        Assert.Equal(EngineerId, persistedOrder.DesignWorkerUserId);
        Assert.Equal("Engineer", persistedOrder.DesignWorkerName);
        Assert.StartsWith("[", persistedOrder.Items.Single().Notes);
        Assert.Null(persistedOrder.DpPercentage);
        Assert.Null(persistedOrder.DpDueDate);
        Assert.IsType<SalesOrderReadyForInvoiceEvent>(Assert.Single(publisher.Events));
        var persistedQuotation = await db.Quotations.SingleAsync();
        Assert.Equal(persistedOrder.Id, persistedQuotation.ConvertedSalesOrderId);
        Assert.Equal(persistedOrder.SoNumber, persistedQuotation.ConvertedSalesOrderNumber);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Equal(1, await db.SalesOrders.CountAsync());
    }

    [Fact]
    public async Task CustomerProvidedDesignWithoutReview_skipsEngineeringButRequiresBOMAndCustomerApproval()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await service.CreateAsync(Request(QuotationDesignSources.CustomerProvided, false, "https://customer.test/design.pdf", Bom()), CancellationToken.None);
        Assert.Equal(QuotationStatuses.ClientDesignApproval, quotation.Status);
        Assert.Empty(await db.SalesOrders.ToListAsync());

        await service.ApproveClientDesignAsync(quotation.Id, CancellationToken.None);
        await service.SubmitPricingAsync(quotation.Id, new SubmitQuotationPricingRequest(1000m, null, EngineerId, "Finance"), CancellationToken.None);
        await service.MarkWonAsync(quotation.Id, CancellationToken.None);
        var order = await service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None);

        Assert.Equal("WaitingPayment", order!.Status);
        var stored = await db.SalesOrders.SingleAsync();
        Assert.Equal("https://customer.test/design.pdf", stored.CustomerDrawingUrl);
        Assert.Equal("https://customer.test/design.pdf", stored.DesignReference);
    }

    [Fact]
    public async Task CustomerProvidedDesignWithReview_requiresEngineeringApprovalBeforePricing()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await service.CreateAsync(Request(QuotationDesignSources.CustomerProvided, true, "https://customer.test/design.pdf"), CancellationToken.None);
        await service.AssignEngineerAsync(quotation.Id, new AssignQuotationEngineerRequest(EngineerId, "Engineer"), CancellationToken.None);
        await service.SubmitDesignAsync(quotation.Id, new SubmitQuotationDesignRequest(null, Bom(), EngineerId, "Engineer"), CancellationToken.None);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitPricingAsync(quotation.Id, new SubmitQuotationPricingRequest(1000m, null, EngineerId, "Finance"), CancellationToken.None));
        await service.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None);
        await service.ApproveClientDesignAsync(quotation.Id, CancellationToken.None);
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task EngineerQuotationList_usesJwtSubjectAndReturnsOnlyAssignedActiveEngineeringWork()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var assigned = await service.CreateAsync(Request(), CancellationToken.None);
        await service.AssignEngineerAsync(assigned.Id, new AssignQuotationEngineerRequest(EngineerId, "Engineering User"), CancellationToken.None);
        var assignedToSomeoneElse = await service.CreateAsync(Request(), CancellationToken.None);
        await service.AssignEngineerAsync(assignedToSomeoneElse.Id, new AssignQuotationEngineerRequest(Guid.NewGuid(), "Other Engineer"), CancellationToken.None);
        await service.CreateAsync(Request(QuotationDesignSources.CustomerProvided, false, "https://customer.test/design.pdf", Bom()), CancellationToken.None);

        var identity = new ClaimsIdentity(
        [
            new Claim("sub", EngineerId.ToString()),
            new Claim(ClaimTypes.Role, "Engineering")
        ], "test", ClaimTypes.Name, ClaimTypes.Role);
        var controller = new QuotationsController(service, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            }
        };

        var result = await controller.List(null, null, CancellationToken.None);
        var response = Assert.IsType<OkObjectResult>(result.Result);
        var quotations = Assert.IsAssignableFrom<IReadOnlyCollection<QuotationDto>>(response.Value);
        var onlyQuotation = Assert.Single(quotations);
        Assert.Equal(assigned.Id, onlyQuotation.Id);
        Assert.Equal(EngineerId, onlyQuotation.AssignedEngineerId);
        Assert.Equal(QuotationStatuses.PendingDesign, onlyQuotation.Status);
    }

    [Fact]
    public async Task Conversion_rejectsQuotationThatIsNotWon()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await service.CreateAsync(Request(QuotationDesignSources.CustomerProvided, false, "https://customer.test/design.pdf", Bom()), CancellationToken.None);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Conversion_rejectsWonQuotationWithIncompletePricing()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await MakeWonCustomerQuotation(service);
        var storedQuotation = await db.Quotations.SingleAsync();
        storedQuotation.EstimatedAmount = null;
        db.QuotationPriceRevisions.RemoveRange(db.QuotationPriceRevisions);
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Conversion_rejectsQuotationMissingRequiredEngineeringApproval()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await MakeWonCustomerQuotation(service);
        var storedQuotation = await db.Quotations.SingleAsync();
        storedQuotation.DesignSource = QuotationDesignSources.Engineering;
        storedQuotation.DesignLink = "https://design.test/part.dwg";
        storedQuotation.EngineeringApprovedAtUtc = null;
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Conversion_rejectsQuotationMissingRequiredBom()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await MakeWonCustomerQuotation(service);
        var storedQuotation = await db.Quotations.SingleAsync();
        storedQuotation.DesignSource = QuotationDesignSources.Engineering;
        storedQuotation.DesignLink = "https://design.test/part.dwg";
        storedQuotation.EngineeringApprovedAtUtc = DateTime.UtcNow;
        db.QuotationBomItems.RemoveRange(db.QuotationBomItems);
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Conversion_rejectsQuotationWithoutCustomerDesignApproval()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var service = new QuotationService(db, new RecordingPublisher());
        var quotation = await MakeWonCustomerQuotation(service);
        var storedQuotation = await db.Quotations.SingleAsync();
        storedQuotation.ClientDesignApprovedAtUtc = null;
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None));
        Assert.Empty(await db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task ConvertedSalesOrder_retainsEngineerAndBomInQueryServiceAndProductionBoard_andBackfillsLegacyConvertedOrders()
    {
        await using var db = CreateDb();
        await SeedCustomer(db);
        var publisher = new RecordingPublisher();
        var quotationService = new QuotationService(db, publisher);
        var quotation = await quotationService.CreateAsync(Request(), CancellationToken.None);
        await quotationService.AssignEngineerAsync(quotation.Id, new AssignQuotationEngineerRequest(EngineerId, "Engineering User"), CancellationToken.None);
        await quotationService.SubmitDesignAsync(
            quotation.Id,
            new SubmitQuotationDesignRequest("https://design.test/part.dwg", [new QuotationBomItemRequest("MAT-001", "Bor 2mm", "HSS M2", 20, "PCS")], EngineerId, "Engineering User"),
            CancellationToken.None);
        await quotationService.ApproveDesignBySupervisorAsync(quotation.Id, CancellationToken.None);
        await quotationService.ApproveClientDesignAsync(quotation.Id, CancellationToken.None);
        await quotationService.SubmitPricingAsync(quotation.Id, new SubmitQuotationPricingRequest(400_000m, null, EngineerId, "Finance"), CancellationToken.None);
        await quotationService.MarkWonAsync(quotation.Id, CancellationToken.None);

        var converted = await quotationService.ConvertToSalesOrderAsync(quotation.Id, CancellationToken.None);
        Assert.NotNull(converted);

        // Simulate legacy converted SO missing engineer and JSON BOM in DB to verify query-time backfill
        var persistedSo = await db.SalesOrders.Include(s => s.Items).SingleAsync(s => s.Id == converted!.Id);
        persistedSo.DesignWorkerUserId = null;
        persistedSo.DesignWorkerName = null;
        persistedSo.Items.Single().Notes = null;
        persistedSo.Status = SalesOrderStatuses.Confirmed;
        await db.SaveChangesAsync();

        var queryService = new PJT_ERP.Production.Api.Application.Production.ProductionQueryService(
            db,
            publisher,
            new EmptyMasterDataClient());

        var listed = await queryService.ListSalesOrdersAsync(CancellationToken.None);
        var listedSo = Assert.Single(listed);
        Assert.Equal(EngineerId, listedSo.DesignWorkerUserId);
        Assert.Equal("Engineering User", listedSo.DesignWorkerName);
        var listedMat = Assert.Single(listedSo.Materials!);
        Assert.Equal("MAT-001", listedMat.Code);
        Assert.Equal("Bor 2mm", listedMat.Name);
        Assert.Equal("HSS M2", listedMat.Specification);
        Assert.Equal(20, listedMat.Quantity);
        Assert.Equal("PCS", listedMat.Unit);

        var boardQueues = await queryService.GetProductionBoardQueuesAsync(EngineerId, "Engineering Supervisor", CancellationToken.None);
        var boardSo = Assert.Single(boardQueues.PendingAssignment);
        Assert.Equal(converted!.Id, boardSo.Id);
        Assert.Single(boardSo.Materials!);
    }

    private static async Task<QuotationDto> MakeWonCustomerQuotation(QuotationService service)
    {
        var quotation = await service.CreateAsync(Request(QuotationDesignSources.CustomerProvided, false, "https://customer.test/design.pdf", Bom()), CancellationToken.None);
        await service.ApproveClientDesignAsync(quotation.Id, CancellationToken.None);
        await service.SubmitPricingAsync(quotation.Id, new SubmitQuotationPricingRequest(1000m, null, EngineerId, "Finance"), CancellationToken.None);
        return (await service.MarkWonAsync(quotation.Id, CancellationToken.None))!;
    }

    private static CreateQuotationRequest Request(string source = QuotationDesignSources.Engineering, bool requiresReview = true, string? customerDesign = null, IReadOnlyCollection<QuotationBomItemRequest>? bom = null) => new(
        CustomerId,
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
        "Test quote",
        [new CreateQuotationItemRequest(null, "Custom Part", "Part description", 2, "pcs", customerDesign, null, bom)],
        null,
        source,
        requiresReview);

    private static IReadOnlyCollection<QuotationBomItemRequest> Bom() => [new QuotationBomItemRequest("MAT-01", "Steel", "S45C", 2, "kg")];

    private static ProductionContext CreateDb() => new(new DbContextOptionsBuilder<ProductionContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task SeedCustomer(ProductionContext db)
    {
        await db.CustomerReplicas.AddAsync(new CustomerReplica { Id = CustomerId, Code = "CUST-001", Name = "PT Customer" });
        await db.SaveChangesAsync();
    }

    private sealed class RecordingPublisher : IEventPublisher
    {
        public List<IntegrationEvent> Events { get; } = [];

        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default)
        {
            Events.Add(e);
            return Task.CompletedTask;
        }
    }

    private sealed class EmptyMasterDataClient : PJT_ERP.Production.Api.Application.Production.IMasterDataClient
    {
        public Task<PJT_ERP.Production.Api.Application.Production.MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<PJT_ERP.Production.Api.Application.Production.MasterDataCustomerDto?>(null);
        public Task<PJT_ERP.Production.Api.Application.Production.MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<PJT_ERP.Production.Api.Application.Production.MasterDataProductDto?>(null);
        public Task<PJT_ERP.Production.Api.Application.Production.MasterDataCustomerDto> CreateCustomerAsync(PJT_ERP.Production.Api.Application.Production.CreateCustomerMasterDataRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<PJT_ERP.Production.Api.Application.Production.MasterDataProductDto> CreateProductAsync(PJT_ERP.Production.Api.Application.Production.CreateProductMasterDataRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.DeductCustomBomRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>>(Array.Empty<PJT_ERP.Production.Api.Application.Production.BomStockDto>());
    }
}
