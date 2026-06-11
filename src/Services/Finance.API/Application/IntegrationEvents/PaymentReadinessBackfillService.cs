using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Finance.Api.Application.IntegrationEvents;

public sealed class PaymentReadinessBackfillService(
    IServiceScopeFactory scopeFactory,
    ILogger<PaymentReadinessBackfillService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FinanceContext>();
        var eventPublisher = scope.ServiceProvider.GetRequiredService<IEventPublisher>();

        var paidInvoices = await db.Invoices
            .AsNoTracking()
            .Where(invoice => invoice.PaidAmount > 0)
            .OrderBy(invoice => invoice.CreatedAtUtc)
            .ToListAsync(stoppingToken);

        foreach (var invoice in paidInvoices)
        {
            await eventPublisher.PublishAsync(
                new InvoicePaymentRecordedEvent(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    invoice.SalesOrderId,
                    invoice.SalesOrderNumber,
                    invoice.CustomerId,
                    invoice.PaidAmount,
                    invoice.PaidAmount,
                    invoice.TotalAmount,
                    invoice.PaymentPercent,
                    invoice.InvoiceDate,
                    invoice.PaidAmount >= invoice.TotalAmount),
                stoppingToken);
        }

        if (paidInvoices.Count > 0)
        {
            await db.SaveChangesAsync(stoppingToken);
            logger.LogInformation(
                "Published {Count} payment readiness backfill event(s) for existing paid invoices.",
                paidInvoices.Count);
        }
    }
}
