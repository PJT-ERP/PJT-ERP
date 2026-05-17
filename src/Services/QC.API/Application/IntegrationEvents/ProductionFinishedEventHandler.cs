using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.QC.Api.Domain.Entities;
using PJT_HIMTIKA.QC.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.QC.Api.Application.IntegrationEvents;

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
                BarcodeUid = integrationEvent.BarcodeValue
            };
            await db.QcInspections.AddAsync(inspection, cancellationToken);
        }

        inspection.Status = QcInspectionStatuses.ReadyForInspection;
        inspection.ProductionFinishedAtUtc = integrationEvent.FinishedAtUtc;
        inspection.UpdatedAtUtc = integrationEvent.FinishedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
    }
}
