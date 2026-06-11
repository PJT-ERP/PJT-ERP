using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Finance.Api.Application.IntegrationEvents;

public sealed class SalesOrderDpInvoiceRequestedEventHandler(FinanceContext db) : IIntegrationEventHandler<SalesOrderDpInvoiceRequestedEvent>
{
    public async Task Handle(SalesOrderDpInvoiceRequestedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        if (await db.Invoices.AnyAsync(invoice => invoice.SalesOrderId == integrationEvent.SalesOrderId, cancellationToken))
        {
            return;
        }

        if (integrationEvent.QuotationAmount <= 0)
        {
            throw new InvalidOperationException("Quotation amount must be greater than zero.");
        }

        if (integrationEvent.DpPercentage <= 0 || integrationEvent.DpPercentage > 100)
        {
            throw new InvalidOperationException("DP percentage must be between 1 and 100.");
        }

        if (integrationEvent.Items.Count == 0 || integrationEvent.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Sales order items must contain positive quantities.");
        }

        var candidate = await db.InvoiceCandidates
            .Include(existing => existing.Items)
            .FirstOrDefaultAsync(existing => existing.SalesOrderId == integrationEvent.SalesOrderId, cancellationToken);

        if (candidate is null)
        {
            candidate = new InvoiceCandidate
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                CreatedAtUtc = integrationEvent.OccurredAtUtc
            };
            await db.InvoiceCandidates.AddAsync(candidate, cancellationToken);
        }

        candidate.SalesOrderNumber = integrationEvent.SalesOrderNumber;
        candidate.CustomerId = integrationEvent.CustomerId;
        candidate.CustomerCode = integrationEvent.CustomerCode;
        candidate.CustomerName = integrationEvent.CustomerName;
        candidate.CustomerEmail = integrationEvent.CustomerEmail;
        candidate.TargetDate = integrationEvent.TargetDate;
        candidate.CompletedAtUtc = integrationEvent.OccurredAtUtc;
        candidate.Status = InvoiceCandidateStatuses.ReadyForInvoice;
        candidate.UpdatedAtUtc = DateTime.UtcNow;

        candidate.Items.Clear();
        var totalQty = integrationEvent.Items.Sum(item => item.Qty);
        var allocatedUnitPrice = decimal.Round(
            integrationEvent.QuotationAmount / totalQty,
            2,
            MidpointRounding.AwayFromZero);

        foreach (var item in integrationEvent.Items)
        {
            candidate.Items.Add(new InvoiceCandidateItem
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderItemId = item.SalesOrderItemId,
                ProductId = item.ProductId,
                ProductPartNumber = item.ProductPartNumber,
                ProductDescription = item.ProductDescription,
                Qty = item.Qty,
                UnitPrice = allocatedUnitPrice
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
