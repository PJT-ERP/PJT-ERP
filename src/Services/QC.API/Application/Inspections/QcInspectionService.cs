using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.QC.Api.Domain.Entities;
using PJT_HIMTIKA.QC.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.QC.Api.Application.Inspections;

public sealed class QcInspectionService(QcContext db, IEventPublisher eventPublisher) : IQcInspectionService
{
    public async Task<IReadOnlyCollection<QcInspectionDto>> ListAsync(CancellationToken cancellationToken)
    {
        var inspections = await IncludeChecks(db.QcInspections.AsNoTracking())
            .OrderByDescending(inspection => inspection.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return inspections.Select(ToDto).ToArray();
    }

    public async Task<QcInspectionDto?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections.AsNoTracking())
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return inspection is null ? null : ToDto(inspection);
    }

    public async Task<QcInspectionDto?> StartAsync(Guid id, StartInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (inspection is null)
        {
            return null;
        }

        inspection.InspectorId = request.InspectorId;
        inspection.InspectorName = request.InspectorName;
        inspection.InspectionDate = request.InspectionDate;
        inspection.SampleQty = request.SampleQty;
        inspection.SamplingMethod = request.SamplingMethod;
        inspection.MeasuringToolNo = request.MeasuringToolNo;
        inspection.Status = QcInspectionStatuses.InInspection;
        inspection.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(inspection);
    }

    public async Task<QcVisualCheckDto?> AddVisualCheckAsync(Guid inspectionId, CreateVisualCheckRequest request, CancellationToken cancellationToken)
    {
        var inspection = await db.QcInspections.FirstOrDefaultAsync(item => item.Id == inspectionId, cancellationToken);
        if (inspection is null)
        {
            return null;
        }

        var check = new QcVisualCheck
        {
            QcInspectionId = inspectionId,
            QtyChecked = request.QtyChecked,
            QtyAccept = request.QtyAccept,
            QtyReject = request.QtyReject,
            QtyRepair = request.QtyRepair,
            QtyScrap = request.QtyScrap,
            NcRef = request.NcRef,
            Remarks = request.Remarks
        };
        inspection.UpdatedAtUtc = DateTime.UtcNow;
        await db.QcVisualChecks.AddAsync(check, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(check);
    }

    public async Task<QcDimensionCheckDto?> AddDimensionCheckAsync(Guid inspectionId, CreateDimensionCheckRequest request, CancellationToken cancellationToken)
    {
        var inspection = await db.QcInspections.FirstOrDefaultAsync(item => item.Id == inspectionId, cancellationToken);
        if (inspection is null)
        {
            return null;
        }

        var check = new QcDimensionCheck
        {
            QcInspectionId = inspectionId,
            SampleId = request.SampleId,
            Process = request.Process,
            DimensionDataJson = request.DimensionData.GetRawText(),
            OperatorId = request.OperatorId,
            OperatorName = request.OperatorName,
            Status = request.Status
        };
        inspection.UpdatedAtUtc = DateTime.UtcNow;
        await db.QcDimensionChecks.AddAsync(check, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(check);
    }

    public async Task<QcInspectionDto?> SubmitAsync(Guid id, SubmitInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (inspection is null)
        {
            return null;
        }

        inspection.InspectionResult = request.InspectionResult;
        inspection.EngineeringRemarks = request.EngineeringRemarks;
        inspection.Status = QcInspectionStatuses.PendingOwnerReview;
        inspection.OwnerDecision = null;
        inspection.OwnerReviewedByUserId = null;
        inspection.OwnerReviewerName = null;
        inspection.OwnerReviewedAtUtc = null;
        inspection.OwnerReviewRemarks = null;
        inspection.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(inspection);
    }

    public async Task<QcInspectionDto?> ReviewAsync(Guid id, ReviewInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (inspection is null)
        {
            return null;
        }

        if (inspection.Status != QcInspectionStatuses.PendingOwnerReview)
        {
            throw new InvalidOperationException("Inspection must be submitted by Engineering before owner review.");
        }

        var normalizedDecision = NormalizeOwnerDecision(request.Decision);

        inspection.OwnerDecision = normalizedDecision;
        inspection.OwnerReviewedByUserId = request.OwnerReviewedByUserId;
        inspection.OwnerReviewerName = request.OwnerReviewerName;
        inspection.OwnerReviewedAtUtc = DateTime.UtcNow;
        inspection.OwnerReviewRemarks = request.Remarks;
        inspection.Status = normalizedDecision;
        inspection.UpdatedAtUtc = DateTime.UtcNow;

        await eventPublisher.PublishAsync(
            new QcCheckCompletedEvent(inspection.Id, inspection.ProductionOrderId, normalizedDecision, inspection.UpdatedAtUtc),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(inspection);
    }

    private static string NormalizeOwnerDecision(string decision)
    {
        if (decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.Approved;
        }

        if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.Rejected;
        }

        throw new InvalidOperationException("Owner decision must be Approve or Reject.");
    }

    private static IQueryable<QcInspection> IncludeChecks(IQueryable<QcInspection> query)
    {
        return query
            .Include(inspection => inspection.VisualChecks)
            .Include(inspection => inspection.DimensionChecks);
    }

    private static QcInspectionDto ToDto(QcInspection inspection)
    {
        return new QcInspectionDto(
            inspection.Id,
            inspection.RefNo,
            inspection.ProductionOrderId,
            inspection.SpkNumber,
            inspection.BarcodeUid,
            inspection.InspectorId,
            inspection.InspectorName,
            inspection.InspectionDate,
            inspection.SampleQty,
            inspection.SamplingMethod,
            inspection.MeasuringToolNo,
            inspection.Status,
            inspection.InspectionResult,
            inspection.EngineeringRemarks,
            inspection.OwnerDecision,
            inspection.OwnerReviewedByUserId,
            inspection.OwnerReviewerName,
            inspection.OwnerReviewedAtUtc,
            inspection.OwnerReviewRemarks,
            inspection.UpdatedAtUtc,
            inspection.VisualChecks.Select(ToDto).ToArray(),
            inspection.DimensionChecks.Select(ToDto).ToArray());
    }

    private static QcVisualCheckDto ToDto(QcVisualCheck check)
    {
        return new QcVisualCheckDto(
            check.Id,
            check.QtyChecked,
            check.QtyAccept,
            check.QtyReject,
            check.QtyRepair,
            check.QtyScrap,
            check.NcRef,
            check.Remarks);
    }

    private static QcDimensionCheckDto ToDto(QcDimensionCheck check)
    {
        return new QcDimensionCheckDto(
            check.Id,
            check.SampleId,
            check.Process,
            JsonSerializer.Deserialize<JsonElement>(check.DimensionDataJson),
            check.OperatorId,
            check.OperatorName,
            check.Status);
    }
}
