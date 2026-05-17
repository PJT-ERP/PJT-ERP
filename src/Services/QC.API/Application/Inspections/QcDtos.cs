using System.Text.Json;

namespace PJT_ERP.QC.Api.Application.Inspections;

public sealed record QcInspectionDto(
    Guid Id,
    string RefNo,
    Guid ProductionOrderId,
    string SpkNumber,
    string BarcodeUid,
    string? ProductName,
    string? ProductCode,
    string? PorNumber,
    string? DrawingRef,
    int? OrderQty,
    string? MaterialSpec,
    Guid? InspectorId,
    string? InspectorName,
    DateOnly? InspectionDate,
    int? SampleQty,
    string? SamplingMethod,
    string? MeasuringToolNo,
    string Status,
    string? InspectionResult,
    string? DefectNotes,
    string? FormRemarks,
    string? OwnerDecision,
    Guid? OwnerReviewedByUserId,
    string? OwnerReviewerName,
    DateTime? OwnerReviewedAtUtc,
    string? OwnerReviewRemarks,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<QcVisualCheckDto> VisualChecks,
    IReadOnlyCollection<QcDimensionCheckDto> DimensionChecks);

public sealed record ScanInspectionRequest(string BarcodeUid);

public sealed record StartInspectionRequest(
    Guid InspectorId,
    string InspectorName,
    DateOnly InspectionDate,
    int SampleQty,
    string SamplingMethod,
    string MeasuringToolNo,
    string? ProductName = null,
    string? ProductCode = null,
    string? PorNumber = null,
    string? DrawingRef = null,
    int? OrderQty = null,
    string? MaterialSpec = null);

public sealed record CreateVisualCheckRequest(
    int QtyChecked,
    int QtyAccept,
    int QtyReject,
    int QtyRepair,
    int QtyScrap,
    string? NcRef,
    string? Remarks,
    DateOnly? CheckDate = null);

public sealed record QcVisualCheckDto(
    Guid Id,
    DateOnly? CheckDate,
    int QtyChecked,
    int QtyAccept,
    int QtyReject,
    int QtyRepair,
    int QtyScrap,
    string? NcRef,
    string? Remarks);

public sealed record CreateDimensionCheckRequest(
    string SampleId,
    string Process,
    JsonElement DimensionData,
    Guid? OperatorId,
    string? OperatorName,
    string Status,
    DateOnly? CheckDate = null);

public sealed record UploadQcFormRequest(
    Guid InspectorId,
    string InspectorName,
    DateOnly InspectionDate,
    int SampleQty,
    string SamplingMethod,
    string MeasuringToolNo,
    string InspectionResult,
    string? DefectNotes,
    string? FormRemarks,
    bool SubmitForOwnerReview,
    IReadOnlyCollection<CreateVisualCheckRequest> VisualChecks,
    IReadOnlyCollection<CreateDimensionCheckRequest> DimensionChecks,
    string? ProductName = null,
    string? ProductCode = null,
    string? PorNumber = null,
    string? DrawingRef = null,
    int? OrderQty = null,
    string? MaterialSpec = null);

public sealed record QcDimensionCheckDto(
    Guid Id,
    DateOnly? CheckDate,
    string SampleId,
    string Process,
    JsonElement DimensionData,
    Guid? OperatorId,
    string? OperatorName,
    string Status);

public sealed record SubmitInspectionRequest(string InspectionResult, string? FormRemarks, string? DefectNotes = null);

public sealed record ReviewInspectionRequest(
    Guid OwnerReviewedByUserId,
    string OwnerReviewerName,
    string Decision,
    string? Remarks);
