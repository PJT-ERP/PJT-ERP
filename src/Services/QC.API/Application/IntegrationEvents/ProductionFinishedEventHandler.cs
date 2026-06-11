using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.QC.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.QC.Api.Application.IntegrationEvents;

public sealed class ProductionFinishedEventHandler(QcContext db) : IIntegrationEventHandler<ProductionFinishedEvent>
{
    public async Task Handle(ProductionFinishedEvent integrationEvent, CancellationToken cancellationToken = default)
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
                PorNumber = integrationEvent.SpkNumber,
                CustomerDrawingUrl = integrationEvent.CustomerDrawingUrl,
                DesignReference = integrationEvent.DesignReference,
                AssignedReviewerUserId = integrationEvent.QcReviewerUserId,
                AssignedReviewerName = integrationEvent.QcReviewerName
            };
            await db.QcInspections.AddAsync(inspection, cancellationToken);
        }

        inspection.Status = QcInspectionStatuses.ReadyForInspection;
        inspection.AssignedReviewerUserId = integrationEvent.QcReviewerUserId ?? inspection.AssignedReviewerUserId;
        inspection.AssignedReviewerName = integrationEvent.QcReviewerName ?? inspection.AssignedReviewerName;
        inspection.CustomerDrawingUrl = integrationEvent.CustomerDrawingUrl ?? inspection.CustomerDrawingUrl;
        inspection.DesignReference = integrationEvent.DesignReference ?? inspection.DesignReference;
        inspection.ProductionFinishedAtUtc = integrationEvent.FinishedAtUtc;
        inspection.UpdatedAtUtc = integrationEvent.FinishedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
    }
}
