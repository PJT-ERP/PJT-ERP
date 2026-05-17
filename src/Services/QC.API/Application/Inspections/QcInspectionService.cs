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

    public async Task<QcInspectionDto?> ScanAsync(ScanInspectionRequest request, CancellationToken cancellationToken)
    {
        var scannedValue = request.BarcodeUid.Trim();
        if (string.IsNullOrWhiteSpace(scannedValue))
        {
            throw new InvalidOperationException("Barcode or QR value is required.");
        }

        var inspection = await IncludeChecks(db.QcInspections.AsNoTracking())
            .FirstOrDefaultAsync(
                item => item.BarcodeUid == scannedValue
                    || item.SpkNumber == scannedValue
                    || item.RefNo == scannedValue,
                cancellationToken);

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

        EnsureInspectionCanBeEdited(inspection);
        ApplyInspectionHeader(inspection, request);
        ClearOwnerReview(inspection);
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

        EnsureInspectionCanBeEdited(inspection);
        ValidateVisualCheck(request);

        var check = new QcVisualCheck
        {
            QcInspectionId = inspectionId,
            QtyChecked = request.QtyChecked,
            QtyAccept = request.QtyAccept,
            QtyReject = request.QtyReject,
            QtyRepair = request.QtyRepair,
            QtyScrap = request.QtyScrap,
            NcRef = request.NcRef,
            Remarks = request.Remarks,
            CheckDate = request.CheckDate
        };
        ClearOwnerReview(inspection);
        inspection.Status = QcInspectionStatuses.InInspection;
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

        EnsureInspectionCanBeEdited(inspection);
        ValidateDimensionCheck(request);

        var check = new QcDimensionCheck
        {
            QcInspectionId = inspectionId,
            SampleId = request.SampleId,
            Process = request.Process,
            DimensionDataJson = request.DimensionData.GetRawText(),
            OperatorId = request.OperatorId,
            OperatorName = request.OperatorName,
            Status = request.Status,
            CheckDate = request.CheckDate
        };
        ClearOwnerReview(inspection);
        inspection.Status = QcInspectionStatuses.InInspection;
        inspection.UpdatedAtUtc = DateTime.UtcNow;
        await db.QcDimensionChecks.AddAsync(check, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(check);
    }

    public async Task<QcInspectionDto?> UploadFormAsync(Guid id, UploadQcFormRequest request, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (inspection is null)
        {
            return null;
        }

        EnsureInspectionCanBeEdited(inspection);

        var now = DateTime.UtcNow;
        var inspectionResult = NormalizeInspectionResult(request.InspectionResult);
        var visualChecks = request.VisualChecks ?? Array.Empty<CreateVisualCheckRequest>();
        var dimensionChecks = request.DimensionChecks ?? Array.Empty<CreateDimensionCheckRequest>();

        foreach (var visualCheck in visualChecks)
        {
            ValidateVisualCheck(visualCheck);
        }

        foreach (var dimensionCheck in dimensionChecks)
        {
            ValidateDimensionCheck(dimensionCheck);
        }

        if (request.SubmitForOwnerReview && visualChecks.Count + dimensionChecks.Count == 0)
        {
            throw new InvalidOperationException("At least one visual or dimension check is required before owner review.");
        }

        if (request.SubmitForOwnerReview)
        {
            EnsureDefectNotesWhenNeeded(inspectionResult, request.DefectNotes);
        }

        ApplyInspectionHeader(inspection, request);
        ApplyChecksheetHeader(inspection, request);
        ClearOwnerReview(inspection);
        inspection.InspectionResult = inspectionResult;
        inspection.DefectNotes = request.DefectNotes;
        inspection.FormRemarks = request.FormRemarks;
        inspection.Status = request.SubmitForOwnerReview
            ? QcInspectionStatuses.PendingOwnerReview
            : QcInspectionStatuses.InInspection;
        inspection.UpdatedAtUtc = now;

        var existingVisualChecks = inspection.VisualChecks.ToArray();
        var existingDimensionChecks = inspection.DimensionChecks.ToArray();
        if (existingVisualChecks.Length > 0)
        {
            db.QcVisualChecks.RemoveRange(existingVisualChecks);
        }

        if (existingDimensionChecks.Length > 0)
        {
            db.QcDimensionChecks.RemoveRange(existingDimensionChecks);
        }

        var newVisualChecks = visualChecks.Select(visualCheck => new QcVisualCheck
            {
                QcInspectionId = inspection.Id,
                QtyChecked = visualCheck.QtyChecked,
                QtyAccept = visualCheck.QtyAccept,
                QtyReject = visualCheck.QtyReject,
                QtyRepair = visualCheck.QtyRepair,
                QtyScrap = visualCheck.QtyScrap,
                NcRef = visualCheck.NcRef,
                Remarks = visualCheck.Remarks,
                CheckDate = visualCheck.CheckDate,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            })
            .ToArray();

        var newDimensionChecks = dimensionChecks.Select(dimensionCheck => new QcDimensionCheck
            {
                QcInspectionId = inspection.Id,
                SampleId = dimensionCheck.SampleId,
                Process = dimensionCheck.Process,
                DimensionDataJson = dimensionCheck.DimensionData.GetRawText(),
                OperatorId = dimensionCheck.OperatorId,
                OperatorName = dimensionCheck.OperatorName,
                Status = dimensionCheck.Status,
                CheckDate = dimensionCheck.CheckDate,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            })
            .ToArray();

        if (newVisualChecks.Length > 0)
        {
            await db.QcVisualChecks.AddRangeAsync(newVisualChecks, cancellationToken);
        }

        if (newDimensionChecks.Length > 0)
        {
            await db.QcDimensionChecks.AddRangeAsync(newDimensionChecks, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        inspection.VisualChecks = [.. newVisualChecks];
        inspection.DimensionChecks = [.. newDimensionChecks];
        return ToDto(inspection);
    }

    public async Task<QcInspectionDto?> SubmitAsync(Guid id, SubmitInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await IncludeChecks(db.QcInspections)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (inspection is null)
        {
            return null;
        }

        EnsureInspectionCanBeSubmitted(inspection);
        var inspectionResult = NormalizeInspectionResult(request.InspectionResult);
        var defectNotes = request.DefectNotes ?? inspection.DefectNotes;
        EnsureDefectNotesWhenNeeded(inspectionResult, defectNotes);

        inspection.InspectionResult = inspectionResult;
        inspection.DefectNotes = defectNotes;
        inspection.FormRemarks = request.FormRemarks ?? inspection.FormRemarks;
        inspection.Status = QcInspectionStatuses.PendingOwnerReview;
        ClearOwnerReview(inspection);
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
            throw new InvalidOperationException("Inspection must be submitted for owner review before final approval.");
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

    private static void ApplyInspectionHeader(QcInspection inspection, StartInspectionRequest request)
    {
        ValidateInspectionHeader(request.InspectorName, request.SampleQty, request.SamplingMethod, request.MeasuringToolNo);
        inspection.InspectorId = request.InspectorId;
        inspection.InspectorName = request.InspectorName.Trim();
        inspection.InspectionDate = request.InspectionDate;
        inspection.SampleQty = request.SampleQty;
        inspection.SamplingMethod = request.SamplingMethod.Trim();
        inspection.MeasuringToolNo = request.MeasuringToolNo.Trim();
        ApplyChecksheetHeader(
            inspection,
            request.ProductName,
            request.ProductCode,
            request.PorNumber,
            request.DrawingRef,
            request.OrderQty,
            request.MaterialSpec);
    }

    private static void ApplyInspectionHeader(QcInspection inspection, UploadQcFormRequest request)
    {
        ValidateInspectionHeader(request.InspectorName, request.SampleQty, request.SamplingMethod, request.MeasuringToolNo);
        inspection.InspectorId = request.InspectorId;
        inspection.InspectorName = request.InspectorName.Trim();
        inspection.InspectionDate = request.InspectionDate;
        inspection.SampleQty = request.SampleQty;
        inspection.SamplingMethod = request.SamplingMethod.Trim();
        inspection.MeasuringToolNo = request.MeasuringToolNo.Trim();
    }

    private static void ApplyChecksheetHeader(QcInspection inspection, UploadQcFormRequest request)
    {
        ApplyChecksheetHeader(
            inspection,
            request.ProductName,
            request.ProductCode,
            request.PorNumber,
            request.DrawingRef,
            request.OrderQty,
            request.MaterialSpec);
    }

    private static void ApplyChecksheetHeader(
        QcInspection inspection,
        string? productName,
        string? productCode,
        string? porNumber,
        string? drawingRef,
        int? orderQty,
        string? materialSpec)
    {
        inspection.ProductName = CoalesceSheetValue(productName, inspection.ProductName);
        inspection.ProductCode = CoalesceSheetValue(productCode, inspection.ProductCode);
        inspection.PorNumber = CoalesceSheetValue(porNumber, inspection.PorNumber ?? inspection.SpkNumber);
        inspection.DrawingRef = CoalesceSheetValue(drawingRef, inspection.DrawingRef);
        inspection.OrderQty = orderQty is > 0 ? orderQty : inspection.OrderQty;
        inspection.MaterialSpec = CoalesceSheetValue(materialSpec, inspection.MaterialSpec);
    }

    private static string? CoalesceSheetValue(string? incomingValue, string? currentValue)
    {
        return string.IsNullOrWhiteSpace(incomingValue) ? currentValue : incomingValue.Trim();
    }

    private static void ValidateInspectionHeader(string inspectorName, int sampleQty, string samplingMethod, string measuringToolNo)
    {
        if (string.IsNullOrWhiteSpace(inspectorName))
        {
            throw new InvalidOperationException("Inspector name is required.");
        }

        if (sampleQty <= 0)
        {
            throw new InvalidOperationException("Sample quantity must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(samplingMethod))
        {
            throw new InvalidOperationException("Sampling method is required.");
        }

        if (string.IsNullOrWhiteSpace(measuringToolNo))
        {
            throw new InvalidOperationException("Measuring tool number is required.");
        }
    }

    private static void ValidateVisualCheck(CreateVisualCheckRequest request)
    {
        if (request.QtyChecked <= 0)
        {
            throw new InvalidOperationException("Visual check quantity must be greater than zero.");
        }

        if (request.QtyAccept < 0 || request.QtyReject < 0 || request.QtyRepair < 0 || request.QtyScrap < 0)
        {
            throw new InvalidOperationException("Visual check quantities cannot be negative.");
        }

        var totalResultQty = request.QtyAccept + request.QtyReject + request.QtyRepair + request.QtyScrap;
        if (request.QtyChecked != totalResultQty)
        {
            throw new InvalidOperationException("Visual check quantity must equal accept + reject + repair + scrap.");
        }

        var defectiveQty = request.QtyReject + request.QtyRepair + request.QtyScrap;
        if (defectiveQty > 0 && string.IsNullOrWhiteSpace(request.Remarks) && string.IsNullOrWhiteSpace(request.NcRef))
        {
            throw new InvalidOperationException("Visual defects require remarks or an NC reference.");
        }
    }

    private static void ValidateDimensionCheck(CreateDimensionCheckRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SampleId))
        {
            throw new InvalidOperationException("Sample ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Process))
        {
            throw new InvalidOperationException("Process is required.");
        }

        if (request.DimensionData.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            throw new InvalidOperationException("Dimension data is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new InvalidOperationException("Dimension check status is required.");
        }
    }

    private static void EnsureInspectionCanBeEdited(QcInspection inspection)
    {
        if (inspection.Status == QcInspectionStatuses.WaitingProduction)
        {
            throw new InvalidOperationException("Production must be finished before QC can be uploaded.");
        }

        if (inspection.Status is QcInspectionStatuses.Approved or QcInspectionStatuses.Rejected)
        {
            throw new InvalidOperationException("Reviewed QC inspections cannot be edited.");
        }
    }

    private static void EnsureInspectionCanBeSubmitted(QcInspection inspection)
    {
        EnsureInspectionCanBeEdited(inspection);

        if (inspection.VisualChecks.Count + inspection.DimensionChecks.Count == 0)
        {
            throw new InvalidOperationException("At least one visual or dimension check is required before owner review.");
        }
    }

    private static string NormalizeInspectionResult(string result)
    {
        if (result.Equals(QcInspectionResults.Accept, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionResults.Accept;
        }

        if (result.Equals(QcInspectionResults.Reject, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionResults.Reject;
        }

        if (result.Equals(QcInspectionResults.Repair, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionResults.Repair;
        }

        if (result.Equals(QcInspectionResults.Scrap, StringComparison.OrdinalIgnoreCase))
        {
            return QcInspectionResults.Scrap;
        }

        throw new InvalidOperationException("Inspection result must be Accept, Reject, Repair, or Scrap.");
    }

    private static void EnsureDefectNotesWhenNeeded(string inspectionResult, string? defectNotes)
    {
        if (inspectionResult != QcInspectionResults.Accept && string.IsNullOrWhiteSpace(defectNotes))
        {
            throw new InvalidOperationException("Defect notes are required when inspection result is Reject, Repair, or Scrap.");
        }
    }

    private static void ClearOwnerReview(QcInspection inspection)
    {
        inspection.OwnerDecision = null;
        inspection.OwnerReviewedByUserId = null;
        inspection.OwnerReviewerName = null;
        inspection.OwnerReviewedAtUtc = null;
        inspection.OwnerReviewRemarks = null;
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
            inspection.ProductName,
            inspection.ProductCode,
            inspection.PorNumber,
            inspection.DrawingRef,
            inspection.OrderQty,
            inspection.MaterialSpec,
            inspection.InspectorId,
            inspection.InspectorName,
            inspection.InspectionDate,
            inspection.SampleQty,
            inspection.SamplingMethod,
            inspection.MeasuringToolNo,
            inspection.Status,
            inspection.InspectionResult,
            inspection.DefectNotes,
            inspection.FormRemarks,
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
            check.CheckDate,
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
            check.CheckDate,
            check.SampleId,
            check.Process,
            JsonSerializer.Deserialize<JsonElement>(check.DimensionDataJson),
            check.OperatorId,
            check.OperatorName,
            check.Status);
    }
}
