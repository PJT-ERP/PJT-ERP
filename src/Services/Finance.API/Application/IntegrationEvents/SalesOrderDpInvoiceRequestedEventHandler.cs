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
        candidate.Status = InvoiceCandidateStatuses.Invoiced;
        candidate.UpdatedAtUtc = DateTime.UtcNow;

        candidate.Items.Clear();
        foreach (var item in integrationEvent.Items)
        {
            candidate.Items.Add(new InvoiceCandidateItem
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderItemId = item.SalesOrderItemId,
                ProductId = item.ProductId,
                ProductPartNumber = item.ProductPartNumber,
                ProductDescription = item.ProductDescription,
                Qty = item.Qty
            });
        }

        var subtotal = RoundMoney(integrationEvent.QuotationAmount);
        var invoice = new Invoice
        {
            InvoiceNumber = GenerateNumber("INV"),
            SalesOrderId = integrationEvent.SalesOrderId,
            SalesOrderNumber = integrationEvent.SalesOrderNumber,
            CustomerId = integrationEvent.CustomerId,
            CustomerCode = integrationEvent.CustomerCode,
            CustomerName = integrationEvent.CustomerName,
            CustomerEmail = integrationEvent.CustomerEmail,
            InvoiceDate = DateOnly.FromDateTime(integrationEvent.OccurredAtUtc),
            DueDate = integrationEvent.DpDueDate,
            Subtotal = subtotal,
            TaxPercent = 0,
            TaxAmount = 0,
            TotalAmount = subtotal,
            PaidAmount = 0,
            PaymentPercent = 0,
            Status = InvoiceStatuses.Issued,
            CreatedAtUtc = integrationEvent.OccurredAtUtc,
            UpdatedAtUtc = integrationEvent.OccurredAtUtc,
            Items = BuildInvoiceItems(integrationEvent.Items, subtotal),
            PaymentSchedules = BuildPaymentSchedules(subtotal, integrationEvent.DpPercentage, integrationEvent.DpDueDate, integrationEvent.TargetDate)
        };

        foreach (var item in invoice.Items)
        {
            item.InvoiceId = invoice.Id;
        }

        foreach (var schedule in invoice.PaymentSchedules)
        {
            schedule.InvoiceId = invoice.Id;
        }

        await db.Invoices.AddAsync(invoice, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static List<InvoiceItem> BuildInvoiceItems(IReadOnlyCollection<SalesOrderDpInvoiceItem> sourceItems, decimal subtotal)
    {
        if (sourceItems.Count == 0 || sourceItems.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Sales order items must contain positive quantities.");
        }

        var totalQty = sourceItems.Sum(item => item.Qty);
        var orderedItems = sourceItems.OrderBy(item => item.ProductPartNumber).ToArray();
        var remaining = subtotal;
        var invoiceItems = new List<InvoiceItem>();

        for (var index = 0; index < orderedItems.Length; index++)
        {
            var sourceItem = orderedItems[index];
            var lineTotal = index == orderedItems.Length - 1
                ? remaining
                : RoundMoney(subtotal * sourceItem.Qty / totalQty);
            var unitPrice = RoundMoney(lineTotal / sourceItem.Qty);
            lineTotal = index == orderedItems.Length - 1 ? remaining : RoundMoney(unitPrice * sourceItem.Qty);
            remaining = RoundMoney(remaining - lineTotal);

            invoiceItems.Add(new InvoiceItem
            {
                SalesOrderItemId = sourceItem.SalesOrderItemId,
                ProductId = sourceItem.ProductId,
                PartNumber = sourceItem.ProductPartNumber,
                Description = sourceItem.ProductDescription,
                Qty = sourceItem.Qty,
                UnitPrice = unitPrice,
                LineTotal = lineTotal
            });
        }

        return invoiceItems;
    }

    private static List<PaymentSchedule> BuildPaymentSchedules(decimal totalAmount, decimal dpPercentage, DateOnly dpDueDate, DateOnly? targetDate)
    {
        var schedules = new List<PaymentSchedule>
        {
            new()
            {
                Label = $"DP {dpPercentage:0.##}%",
                Percentage = dpPercentage,
                Amount = RoundMoney(totalAmount * dpPercentage / 100),
                DueDate = dpDueDate
            }
        };

        var remainingPercentage = RoundMoney(100 - dpPercentage);
        if (remainingPercentage > 0)
        {
            schedules.Add(new PaymentSchedule
            {
                Label = $"Pelunasan {remainingPercentage:0.##}%",
                Percentage = remainingPercentage,
                Amount = RoundMoney(totalAmount - schedules[0].Amount),
                DueDate = targetDate ?? dpDueDate.AddDays(30)
            });
        }

        return schedules;
    }

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static string GenerateNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..(prefix.Length + 24)].ToUpperInvariant();
    }
}
