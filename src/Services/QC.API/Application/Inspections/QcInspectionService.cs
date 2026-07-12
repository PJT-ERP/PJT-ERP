using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.QC.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Infrastructure.Security;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace PJT_ERP.QC.Api.Application.Inspections;

public sealed class QcInspectionService(QcContext db, IEventPublisher eventPublisher, IWebHostEnvironment? env = null) : IQcInspectionService
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
        inspection.ProductionPhotos = request.ProductionPhotos ?? new List<string>();
        inspection.QcPhotos = request.QcPhotos ?? new List<string>();
        inspection.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        inspection.Decision = decision;
        inspection.ReviewedByUserId = request.ReviewerUserId;
        inspection.ReviewerName = request.ReviewerName.Trim();
        inspection.ReviewedAtUtc = now;
        inspection.Status = decision;
        inspection.UpdatedAtUtc = now;

        await eventPublisher.PublishAsync(
            new QcCheckCompletedEvent(
                inspection.Id,
                inspection.ProductionOrderId,
                decision,
                now,
                inspection.ProductionPhotos,
                inspection.QcPhotos),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(inspection);
    }

    public async Task<IReadOnlyCollection<string>> UploadPhotosAsync(IFormFileCollection files, CancellationToken cancellationToken)
    {
        if (files is null || files.Count == 0)
        {
            return Array.Empty<string>();
        }

        var urls = new List<string>();
        var uploadsFolder = Path.Combine(
            env?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "qc-photos");

        Directory.CreateDirectory(uploadsFolder);

        foreach (var file in files)
        {
            if (file.Length == 0) continue;

            await FileUploadSecurityValidator.ValidateFileAsync(file, cancellationToken);

            var uniqueFileName = $"qc-{Guid.NewGuid():N}.webp";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            try
            {
                using var image = await Image.LoadAsync(file.OpenReadStream(), cancellationToken);
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(1200, 1200),
                    Mode = ResizeMode.Max
                }));

                var encoder = new WebpEncoder { Quality = 75 };
                await image.SaveAsWebpAsync(filePath, encoder, cancellationToken);
            }
            catch (UnknownImageFormatException)
            {
                throw new InvalidOperationException($"File '{file.FileName}' is not a valid or supported image format.");
            }

            urls.Add($"/qc-photos/{uniqueFileName}");
        }

        return urls;
    }

    private static void EnsureInspectionCanBeReviewed(QcInspection inspection)
    {
        if (inspection.Status == QcInspectionStatuses.WaitingProduction)
        {
            throw new InvalidOperationException("Production must be finished before QC can be reviewed.");
        }

        if (inspection.Status is QcInspectionStatuses.Go or QcInspectionStatuses.NoGo)
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

        if (request.QcPhotos == null || request.QcPhotos.Count == 0)
        {
            throw new InvalidOperationException("At least one QC photo must be provided.");
        }
    }

    private static string NormalizeDecision(string decision)
    {
        if (decision.Equals("Go", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Pass", StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.Go;
        }

        if (decision.Equals("NoGo", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("No Go", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Fail", StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionStatuses.NoGo;
        }

        throw new InvalidOperationException("QC decision must be Go or NoGo.");
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
            inspection.CustomerDrawingUrl,
            inspection.DesignReference,
            inspection.OrderQty,
            inspection.MaterialSpec,
            inspection.ProductionFinishedAtUtc,
            inspection.AssignedReviewerUserId,
            inspection.AssignedReviewerName,
            inspection.ProductionPhotos,
            inspection.QcPhotos,
            inspection.Notes,
            inspection.Status,
            inspection.Decision,
            inspection.ReviewedByUserId,
            inspection.ReviewerName,
            inspection.ReviewedAtUtc,
            inspection.UpdatedAtUtc);
    }
}
