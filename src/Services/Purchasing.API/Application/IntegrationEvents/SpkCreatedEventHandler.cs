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

        if (snapshot is null)
        {
            snapshot = new SalesOrderSnapshot
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderNumber = "",
                ConfirmedAtUtc = integrationEvent.OccurredAtUtc,
                UpdatedAtUtc = integrationEvent.OccurredAtUtc
            };
            await db.SalesOrderSnapshots.AddAsync(snapshot, cancellationToken);
        }

        var requirement = await db.MaterialRequirements
            .FirstOrDefaultAsync(item => item.ProductionOrderId == integrationEvent.ProductionOrderId, cancellationToken);

        if (requirement is null)
        {
            requirement = new MaterialRequirement
            {
                SalesOrderId = integrationEvent.SalesOrderId,
                SalesOrderNumber = snapshot.SalesOrderNumber,
                ProductionOrderId = integrationEvent.ProductionOrderId,
                SpkNumber = integrationEvent.SpkNumber,
                BarcodeUid = integrationEvent.BarcodeValue,
                ProductId = integrationEvent.ProductId,
                ProductPartNumber = integrationEvent.ProductCode,
                ProductDescription = integrationEvent.ProductName,
                MaterialSpec = integrationEvent.MaterialSpec,
                RequiredQty = Decimal.ToInt32(integrationEvent.Quantity),
                ProjectName = string.IsNullOrWhiteSpace(snapshot.SalesOrderNumber) ? integrationEvent.SpkNumber : snapshot.SalesOrderNumber,
                Status = MaterialRequirementStatuses.Required,
                UpdatedAtUtc = integrationEvent.OccurredAtUtc
            };
            await db.MaterialRequirements.AddAsync(requirement, cancellationToken);
        }
        else
        {
            requirement.SalesOrderId = integrationEvent.SalesOrderId;
            requirement.SalesOrderNumber = snapshot.SalesOrderNumber;
            requirement.SpkNumber = integrationEvent.SpkNumber;
            requirement.BarcodeUid = integrationEvent.BarcodeValue;
            requirement.ProductId = integrationEvent.ProductId;
            requirement.ProductPartNumber = integrationEvent.ProductCode;
            requirement.ProductDescription = integrationEvent.ProductName;
            requirement.MaterialSpec = integrationEvent.MaterialSpec;
            requirement.RequiredQty = Decimal.ToInt32(integrationEvent.Quantity);
            requirement.ProjectName = string.IsNullOrWhiteSpace(snapshot.SalesOrderNumber) ? requirement.ProjectName : snapshot.SalesOrderNumber;
            requirement.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
