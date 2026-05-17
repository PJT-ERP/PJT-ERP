using System.Text.Json;

namespace PJT_HIMTIKA.QC.Api.Application.Inspections;

public sealed record QcInspectionDto(
    Guid Id,
    string RefNo,
    Guid ProductionOrderId,
    string SpkNumber,
    string BarcodeUid,
    Guid? InspectorId,
    string? InspectorName,
    DateOnly? InspectionDate,
    int? SampleQty,
    string? SamplingMethod,
    string? MeasuringToolNo,
    string Status,
    string? Decision,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<QcVisualCheckDto> VisualChecks,
    IReadOnlyCollection<QcDimensionCheckDto> DimensionChecks);

public sealed record StartInspectionRequest(
    Guid InspectorId,
    string InspectorName,
    DateOnly InspectionDate,
    int SampleQty,
    string SamplingMethod,
    string MeasuringToolNo);

public sealed record CreateVisualCheckRequest(
    int QtyChecked,
    int QtyAccept,
    int QtyReject,
    int QtyRepair,
    int QtyScrap,
    string? NcRef,
    string? Remarks);

public sealed record QcVisualCheckDto(
    Guid Id,
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
    string Status);

public sealed record QcDimensionCheckDto(
    Guid Id,
    string SampleId,
    string Process,
    JsonElement DimensionData,
    Guid? OperatorId,
    string? OperatorName,
    string Status);

public sealed record CompleteInspectionRequest(string Decision);
