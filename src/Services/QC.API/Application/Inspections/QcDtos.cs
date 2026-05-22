namespace PJT_ERP.QC.Api.Application.Inspections;

public sealed record QcInspectionDto(
    Guid Id,
    string RefNo,
    string SalesOrderNumber,
    string? ProductName,
    string? ProductCode,
    string? DrawingRef,
    int? OrderQty,
    string? MaterialSpec,
    DateTime? ProductionFinishedAtUtc,
    Guid? AssignedReviewerUserId,
    string? AssignedReviewerName,
    string? QcImageUrl,
    string? Notes,
    string Status,
    string? Decision,
    Guid? ReviewedByUserId,
    string? ReviewerName,
    DateTime? ReviewedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UploadQcResultRequest(
    Guid ReviewerUserId,
    string ReviewerName,
    string QcImageUrl,
    string? Notes,
    string Decision);
