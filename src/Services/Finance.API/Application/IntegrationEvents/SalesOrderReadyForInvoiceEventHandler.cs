using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Finance.Api.Application.IntegrationEvents;

public sealed class SalesOrderReadyForInvoiceEventHandler(FinanceContext db) : IIntegrationEventHandler<SalesOrderReadyForInvoiceEvent>
{
    public async Task Handle(SalesOrderReadyForInvoiceEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var candidate = await db.InvoiceCandidates
            .Include(existing => existing.Items)
            .FirstOrDefaultAsync(existing => existing.SalesOrderId == integrationEvent.SalesOrderId, cancellationToken);

        if (candidate is null)
        {
            candidate = new InvoiceCandidate
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                CreatedAtUtc = DateTime.UtcNow
            };
            await db.InvoiceCandidates.AddAsync(candidate, cancellationToken);
        }

        if (candidate.Status == InvoiceCandidateStatuses.Invoiced)
        {
            return;
        }

        candidate.SalesOrderNumber = integrationEvent.SalesOrderNumber;
        candidate.CustomerId = integrationEvent.CustomerId;
        candidate.CustomerCode = integrationEvent.CustomerCode;
        candidate.CustomerName = integrationEvent.CustomerName;
        candidate.CustomerEmail = integrationEvent.CustomerEmail;
        candidate.TargetDate = integrationEvent.TargetDate;
        candidate.CompletedAtUtc = integrationEvent.CompletedAtUtc;
        candidate.UpdatedAtUtc = DateTime.UtcNow;

        foreach (var item in integrationEvent.Items)
        {
            var existingItem = candidate.Items.FirstOrDefault(i => i.SalesOrderItemId == item.SalesOrderItemId);
            if (existingItem != null)
            {
                existingItem.ProductId = item.ProductId;
                existingItem.ProductPartNumber = item.ProductPartNumber;
                existingItem.ProductDescription = item.ProductDescription;
                existingItem.Qty = item.Qty;
                existingItem.UnitPrice = item.UnitPrice;
            }
            else
            {
                candidate.Items.Add(new InvoiceCandidateItem
                {
                    SalesOrderId = integrationEvent.SalesOrderId,
                    SalesOrderItemId = item.SalesOrderItemId,
                    ProductId = item.ProductId,
                    ProductPartNumber = item.ProductPartNumber,
                    ProductDescription = item.ProductDescription,
                    Qty = item.Qty,
                    UnitPrice = item.UnitPrice
                });
            }
        }

        var incomingIds = integrationEvent.Items.Select(i => i.SalesOrderItemId).ToHashSet();
        var itemsToRemove = candidate.Items.Where(i => !incomingIds.Contains(i.SalesOrderItemId)).ToList();
        foreach (var toRemove in itemsToRemove)
        {
            candidate.Items.Remove(toRemove);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
