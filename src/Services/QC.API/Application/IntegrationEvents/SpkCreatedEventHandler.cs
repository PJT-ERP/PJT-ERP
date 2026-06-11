using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.QC.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.QC.Api.Application.IntegrationEvents;

public sealed class SpkCreatedEventHandler(QcContext db) : IIntegrationEventHandler<SpkCreatedEvent>
{
    public async Task Handle(SpkCreatedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        var inspection = await db.QcInspections
            .FirstOrDefaultAsync(item => item.ProductionOrderId == integrationEvent.ProductionOrderId, cancellationToken);

        if (inspection is null)
        {
            inspection = new QcInspection
            {
                ProductionOrderId = integrationEvent.ProductionOrderId,
                RefNo = $"QC-{integrationEvent.SpkNumber}",
                SpkNumber = integrationEvent.SpkNumber,
                BarcodeUid = integrationEvent.BarcodeValue,
                ProductCode = integrationEvent.ProductCode,
                ProductName = integrationEvent.ProductName,
                PorNumber = integrationEvent.SpkNumber,
                DrawingRef = integrationEvent.DrawingRef,
                CustomerDrawingUrl = integrationEvent.CustomerDrawingUrl,
                DesignReference = integrationEvent.DesignReference,
                OrderQty = Decimal.ToInt32(integrationEvent.Quantity),
                MaterialSpec = integrationEvent.MaterialSpec,
                AssignedReviewerUserId = integrationEvent.QcReviewerUserId,
                AssignedReviewerName = integrationEvent.QcReviewerName
            };
            await db.QcInspections.AddAsync(inspection, cancellationToken);
        }
        else
        {
            inspection.SpkNumber = integrationEvent.SpkNumber;
            inspection.BarcodeUid = integrationEvent.BarcodeValue;
            inspection.ProductCode = integrationEvent.ProductCode;
            inspection.ProductName = integrationEvent.ProductName;
            inspection.PorNumber = integrationEvent.SpkNumber;
            inspection.DrawingRef = integrationEvent.DrawingRef;
            inspection.CustomerDrawingUrl = integrationEvent.CustomerDrawingUrl ?? inspection.CustomerDrawingUrl;
            inspection.DesignReference = integrationEvent.DesignReference ?? inspection.DesignReference;
            inspection.OrderQty = Decimal.ToInt32(integrationEvent.Quantity);
            inspection.MaterialSpec = integrationEvent.MaterialSpec;
            inspection.AssignedReviewerUserId = integrationEvent.QcReviewerUserId;
            inspection.AssignedReviewerName = integrationEvent.QcReviewerName;
            inspection.UpdatedAtUtc = integrationEvent.OccurredAtUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
