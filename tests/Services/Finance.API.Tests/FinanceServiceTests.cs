using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Application.Finance;
using PJT_ERP.Finance.Api.Application.IntegrationEvents;
using PJT_ERP.Finance.Api.Controllers;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;

namespace Finance.API.Tests;

public sealed class FinanceServiceTests
{
    private static readonly Guid SalesOrderId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid CustomerId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid FirstSalesOrderItemId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid SecondSalesOrderItemId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    [Theory]
    [InlineData(typeof(InvoiceCandidatesController), "Admin,Finance,Owner")]
    [InlineData(typeof(InvoicesController), "Admin,Finance,Owner")]
    [InlineData(typeof(DashboardController), "Admin,Finance,Owner")]
    public void Finance_controllers_are_role_protected(Type controllerType, string expectedRoles)
    {
        var authorize = controllerType
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
            .Cast<AuthorizeAttribute>()
            .Single();

        Assert.Equal(expectedRoles, authorize.Roles);
    }

    [Fact]
    public async Task SalesOrderReadyForInvoiceEventHandler_creates_invoice_candidate_with_items()
    {
        await using var db = CreateDbContext();
        var handler = new SalesOrderReadyForInvoiceEventHandler(db);

        await handler.Handle(CreateReadyForInvoiceEvent(), CancellationToken.None);

        var service = new FinanceService(db);
        var candidates = await service.ListInvoiceCandidatesAsync(null, CancellationToken.None);
        var candidate = Assert.Single(candidates);
        Assert.Equal("SO-001", candidate.SalesOrderNumber);
        Assert.Equal("PT Customer", candidate.CustomerName);
        Assert.Equal("billing@example.com", candidate.CustomerEmail);
        Assert.Equal(2, candidate.Items.Count);
    }

    [Fact]
    public async Task SalesOrderDpInvoiceRequestedEventHandler_creates_invoice_candidate_for_manual_dp_invoice()
    {
        await using var db = CreateDbContext();
        var handler = new SalesOrderDpInvoiceRequestedEventHandler(db);

        await handler.Handle(CreateDpInvoiceRequestedEvent(), CancellationToken.None);

        Assert.Empty(await db.Invoices.ToListAsync());

        var candidate = await db.InvoiceCandidates.Include(item => item.Items).SingleAsync();
        Assert.Equal("SO-001", candidate.SalesOrderNumber);
        Assert.Equal("PT Customer", candidate.CustomerName);
        Assert.Equal(InvoiceCandidateStatuses.ReadyForInvoice, candidate.Status);
        Assert.Equal(2, candidate.Items.Count);
    }

    [Fact]
    public async Task CreateInvoiceAsync_uses_sales_order_items_and_builds_payment_schedule()
    {
        await using var db = CreateDbContext();
        await SeedCandidateAsync(db);
        var service = new FinanceService(db);

        var invoice = await service.CreateInvoiceAsync(
            new CreateInvoiceRequest(
                SalesOrderId,
                new DateOnly(2026, 6, 8),
                new DateOnly(2026, 6, 22),
                11,
                [
                    new CreateInvoiceItemPrice(FirstSalesOrderItemId, 100_000),
                    new CreateInvoiceItemPrice(SecondSalesOrderItemId, 50_000)
                ],
                [
                    new CreatePaymentScheduleRequest("DP 50%", 50, new DateOnly(2026, 6, 12)),
                    new CreatePaymentScheduleRequest("Pelunasan 50%", 50, new DateOnly(2026, 6, 22))
                ],
                "BCA",
                "PT PJT",
                "1234567890"),
            CancellationToken.None);

        Assert.Equal(2, invoice.Items.Count);
        Assert.Equal(300_000m, invoice.Subtotal);
        Assert.Equal(33_000m, invoice.TaxAmount);
        Assert.Equal(333_000m, invoice.TotalAmount);
        Assert.Equal(2, invoice.PaymentSchedules.Count);
        Assert.Contains(invoice.PaymentSchedules, schedule => schedule.Label == "DP 50%" && schedule.Amount == 166_500m);
        Assert.Equal("BCA", invoice.BankName);

        var candidates = await service.ListInvoiceCandidatesAsync(null, CancellationToken.None);
        Assert.Equal("Invoiced", Assert.Single(candidates).Status);
    }

    [Fact]
    public async Task RecordPaymentAsync_updates_paid_amount_percent_and_status()
    {
        await using var db = CreateDbContext();
        var invoice = await CreateInvoiceAsync(db);
        var service = new FinanceService(db);

        var updated = await service.RecordPaymentAsync(
            invoice.Id,
            new RecordPaymentRequest(new DateOnly(2026, 6, 10), 166_500, "DP received"),
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(166_500m, updated.PaidAmount);
        Assert.Equal(50m, updated.PaymentPercent);
        Assert.Equal("PartiallyPaid", updated.Status);
        Assert.Contains(updated.PaymentSchedules, schedule => schedule.Label == "DP 50%" && schedule.IsPaid);
    }

    [Fact]
    public async Task CreateCollectionLetterAsync_requires_overdue_unpaid_invoice()
    {
        await using var db = CreateDbContext();
        var invoice = await CreateInvoiceAsync(db, new DateOnly(2026, 1, 15));
        var service = new FinanceService(db);

        var updated = await service.CreateCollectionLetterAsync(
            invoice.Id,
            new CreateCollectionLetterRequest(new DateOnly(2026, 1, 20), new DateOnly(2026, 1, 30), "Lewat jatuh tempo"),
            CancellationToken.None);

        Assert.NotNull(updated);
        var letter = Assert.Single(updated.CollectionLetters);
        Assert.StartsWith("COL-", letter.LetterNumber, StringComparison.Ordinal);
        Assert.Equal("Overdue", updated.Status);
    }

    [Fact]
    public async Task GetDashboardAsync_can_scope_to_customer()
    {
        await using var db = CreateDbContext();
        await CreateInvoiceAsync(db);
        var service = new FinanceService(db);

        var dashboard = await service.GetDashboardAsync(CustomerId, CancellationToken.None);

        Assert.Equal(CustomerId, dashboard.CustomerId);
        Assert.Equal("PT Customer", dashboard.CustomerName);
        Assert.Equal(1, dashboard.InvoiceCount);
        Assert.Equal(333_000m, dashboard.TotalBilled);
    }

    private static async Task<InvoiceDto> CreateInvoiceAsync(FinanceContext db, DateOnly? dueDate = null)
    {
        await SeedCandidateAsync(db);
        var service = new FinanceService(db);
        var invoice = await service.CreateInvoiceAsync(
            new CreateInvoiceRequest(
                SalesOrderId,
                new DateOnly(2026, 1, 1),
                dueDate ?? new DateOnly(2026, 6, 22),
                11,
                [
                    new CreateInvoiceItemPrice(FirstSalesOrderItemId, 100_000),
                    new CreateInvoiceItemPrice(SecondSalesOrderItemId, 50_000)
                ],
                [
                    new CreatePaymentScheduleRequest("DP 50%", 50, new DateOnly(2026, 1, 10)),
                    new CreatePaymentScheduleRequest("Pelunasan 50%", 50, dueDate ?? new DateOnly(2026, 6, 22))
                ],
                null,
                null,
                null),
            CancellationToken.None);

        db.ChangeTracker.Clear();
        return invoice;
    }

    private static async Task SeedCandidateAsync(FinanceContext db)
    {
        var handler = new SalesOrderReadyForInvoiceEventHandler(db);
        await handler.Handle(CreateReadyForInvoiceEvent(), CancellationToken.None);
    }

    private static SalesOrderReadyForInvoiceEvent CreateReadyForInvoiceEvent()
    {
        return new SalesOrderReadyForInvoiceEvent(
            SalesOrderId,
            "SO-001",
            CustomerId,
            "CUST-001",
            "PT Customer",
            "billing@example.com",
            new DateOnly(2026, 6, 30),
            DateTime.UtcNow,
            [
                new SalesOrderReadyForInvoiceItem(
                    FirstSalesOrderItemId,
                    Guid.Parse("55555555-5555-5555-5555-555555555555"),
                    "PART-001",
                    "Shaft",
                    2),
                new SalesOrderReadyForInvoiceItem(
                    SecondSalesOrderItemId,
                    Guid.Parse("66666666-6666-6666-6666-666666666666"),
                    "PART-002",
                    "Bushing",
                    2)
            ]);
    }

    private static SalesOrderDpInvoiceRequestedEvent CreateDpInvoiceRequestedEvent()
    {
        return new SalesOrderDpInvoiceRequestedEvent(
            SalesOrderId,
            "SO-001",
            CustomerId,
            "CUST-001",
            "PT Customer",
            "billing@example.com",
            new DateOnly(2026, 6, 30),
            500_000m,
            50m,
            new DateOnly(2026, 6, 12),
            [
                new SalesOrderDpInvoiceItem(
                    FirstSalesOrderItemId,
                    Guid.Parse("55555555-5555-5555-5555-555555555555"),
                    "PART-001",
                    "Shaft",
                    2),
                new SalesOrderDpInvoiceItem(
                    SecondSalesOrderItemId,
                    Guid.Parse("66666666-6666-6666-6666-666666666666"),
                    "PART-002",
                    "Bushing",
                    2)
            ])
        {
            OccurredAtUtc = new DateTime(2026, 6, 8, 10, 0, 0, DateTimeKind.Utc)
        };
    }

    private static FinanceContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<FinanceContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new FinanceContext(options);
    }
}
