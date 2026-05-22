using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.IntegrationEvents;

public sealed class SpkCreatedEventHandler(PurchasingContext db) : IIntegrationEventHandler<SpkCreatedEvent>
{
    public async Task Handle(SpkCreatedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var snapshot = await db.SalesOrderSnapshots
            .FirstOrDefaultAsync(order => order.SalesOrderId == integrationEvent.SalesOrderId, cancellationToken);

        var salesOrderNumber = integrationEvent.SalesOrderNumber ?? snapshot?.SalesOrderNumber ?? "";

        if (snapshot is null)
        {
            snapshot = new SalesOrderSnapshot
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderNumber = salesOrderNumber,
                ConfirmedAtUtc = integrationEvent.OccurredAtUtc,
                UpdatedAtUtc = integrationEvent.OccurredAtUtc
            };
            await db.SalesOrderSnapshots.AddAsync(snapshot, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(salesOrderNumber))
        {
            snapshot.SalesOrderNumber = salesOrderNumber;
            snapshot.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        }

        foreach (var item in ExpandItems(integrationEvent))
        {
            var requirement = await db.MaterialRequirements
                .FirstOrDefaultAsync(
                    existing =>
                        existing.ProductionOrderId == integrationEvent.ProductionOrderId
                        && existing.ProductId == item.ProductId,
                    cancellationToken);

            if (requirement is null)
            {
                requirement = new MaterialRequirement
                {
                    SalesOrderId = integrationEvent.SalesOrderId,
                    SalesOrderNumber = salesOrderNumber,
                    ProductionOrderId = integrationEvent.ProductionOrderId,
                    SalesOrderItemId = item.SalesOrderItemId,
                    SpkNumber = integrationEvent.SpkNumber,
                    BarcodeUid = integrationEvent.BarcodeValue,
                    ProductId = item.ProductId,
                    ProductPartNumber = item.ProductCode,
                    ProductDescription = item.ProductName,
                    MaterialSpec = item.MaterialSpec,
                    RequiredQty = Decimal.ToInt32(item.Quantity),
                    ProjectName = string.IsNullOrWhiteSpace(salesOrderNumber) ? integrationEvent.SpkNumber : salesOrderNumber,
                    Status = MaterialRequirementStatuses.Required,
                    UpdatedAtUtc = integrationEvent.OccurredAtUtc
                };
                await db.MaterialRequirements.AddAsync(requirement, cancellationToken);
            }
            else
            {
                requirement.SalesOrderId = integrationEvent.SalesOrderId;
                requirement.SalesOrderNumber = salesOrderNumber;
                requirement.SalesOrderItemId = item.SalesOrderItemId;
                requirement.SpkNumber = integrationEvent.SpkNumber;
                requirement.BarcodeUid = integrationEvent.BarcodeValue;
                requirement.ProductId = item.ProductId;
                requirement.ProductPartNumber = item.ProductCode;
                requirement.ProductDescription = item.ProductName;
                requirement.MaterialSpec = item.MaterialSpec;
                requirement.RequiredQty = Decimal.ToInt32(item.Quantity);
                requirement.ProjectName = string.IsNullOrWhiteSpace(salesOrderNumber) ? requirement.ProjectName : salesOrderNumber;
                requirement.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static IReadOnlyCollection<SpkCreatedItem> ExpandItems(SpkCreatedEvent integrationEvent)
    {
        if (integrationEvent.Items is { Count: > 0 })
        {
            return integrationEvent.Items;
        }

        return
        [
            new SpkCreatedItem(
                Guid.Empty,
                integrationEvent.ProductId,
                integrationEvent.Quantity,
                integrationEvent.ProductCode,
                integrationEvent.ProductName,
                integrationEvent.MaterialSpec)
        ];
    }
}
