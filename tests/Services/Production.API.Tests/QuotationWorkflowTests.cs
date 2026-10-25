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
        Assert.Equal(1, await db.SalesOrders.CountAsync());
        var persistedOrder = await db.SalesOrders.SingleAsync();
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
}
