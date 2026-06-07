using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.QC.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.QC.Api.Application.Inspections;

public sealed class QcInspectionService(QcContext db, IEventPublisher eventPublisher) : IQcInspectionService
{
    public async Task<IReadOnlyCollection<QcInspectionDto>> ListAsync(CancellationToken cancellationToken)
    {
        var inspections = await db.QcInspections
            .AsNoTracking()
            .OrderByDescending(inspection => inspection.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return inspections.Select(ToDto).ToArray();
    }

    public async Task<QcInspectionDto?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await db.QcInspections
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return inspection is null ? null : ToDto(inspection);
    }

    public async Task<QcInspectionDto?> UploadResultAsync(Guid id, UploadQcResultRequest request, CancellationToken cancellationToken)
    {
        var inspection = await db.QcInspections.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (inspection is null)
        {
            return null;
        }

        EnsureInspectionCanBeReviewed(inspection);
        EnsureAssignedReviewer(inspection, request.ReviewerUserId);
        ValidateUploadRequest(request);

        var decision = NormalizeDecision(request.Decision);
        var now = DateTime.UtcNow;
        inspection.QcImageUrl = request.QcImageUrl.Trim();
        inspection.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        inspection.Decision = decision;
        inspection.ReviewedByUserId = request.ReviewerUserId;
        inspection.ReviewerName = request.ReviewerName.Trim();
        inspection.ReviewedAtUtc = now;
        inspection.Status = decision;
        inspection.UpdatedAtUtc = now;

        await eventPublisher.PublishAsync(
            new QcCheckCompletedEvent(inspection.Id, inspection.ProductionOrderId, decision, now),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(inspection);
    }

    private static void EnsureInspectionCanBeReviewed(QcInspection inspection)
    {
        if (inspection.Status == QcInspectionStatuses.WaitingProduction)
        {
            throw new InvalidOperationException("Production must be finished before QC can be reviewed.");
        }

        if (inspection.Status is QcInspectionStatuses.Approved or QcInspectionStatuses.Rejected)
        {
            throw new InvalidOperationException("Reviewed QC inspections cannot be changed.");
        }
    }

    private static void EnsureAssignedReviewer(QcInspection inspection, Guid reviewerUserId)
    {
        if (inspection.AssignedReviewerUserId.HasValue && inspection.AssignedReviewerUserId.Value != reviewerUserId)
        {
            throw new InvalidOperationException("Only the assigned QC reviewer can approve or reject this inspection.");
        }
    }

    private static void ValidateUploadRequest(UploadQcResultRequest request)
    {
        if (request.ReviewerUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Reviewer user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ReviewerName))
        {
            throw new InvalidOperationException("Reviewer name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.QcImageUrl)
            || !Uri.TryCreate(request.QcImageUrl.Trim(), UriKind.Absolute, out var imageUri)
            || imageUri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("QC image URL must be a valid HTTP or HTTPS link.");
        }
    }

    private static string NormalizeDecision(string decision)
    {
        if (decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(QcInspectionStatuses.Approved, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.Approved;
        }

        if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(QcInspectionStatuses.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.Rejected;
        }

        throw new InvalidOperationException("QC decision must be Approve or Reject.");
    }

    private static QcInspectionDto ToDto(QcInspection inspection)
    {
        return new QcInspectionDto(
            inspection.Id,
            inspection.RefNo,
            inspection.PorNumber ?? inspection.SpkNumber,
            inspection.ProductName,
            inspection.ProductCode,
            inspection.DrawingRef,
            inspection.OrderQty,
            inspection.MaterialSpec,
            inspection.ProductionFinishedAtUtc,
            inspection.AssignedReviewerUserId,
            inspection.AssignedReviewerName,
            inspection.QcImageUrl,
            inspection.Notes,
            inspection.Status,
            inspection.Decision,
            inspection.ReviewedByUserId,
            inspection.ReviewerName,
            inspection.ReviewedAtUtc,
            inspection.UpdatedAtUtc);
    }
}
