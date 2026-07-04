using Microsoft.AspNetCore.Http;

namespace PJT_ERP.QC.Api.Application.Inspections;

public sealed record QcInspectionDto(
    Guid Id,
    string RefNo,
    string SalesOrderNumber,
    string? ProductName,
    string? ProductCode,
    string? DrawingRef,
    string? CustomerDrawingUrl,
    string? DesignReference,
    int? OrderQty,
    string? MaterialSpec,
    DateTime? ProductionFinishedAtUtc,
    Guid? AssignedReviewerUserId,
    string? AssignedReviewerName,
    List<string> ProductionPhotos,
    List<string> QcPhotos,
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
    List<string> ProductionPhotos,
    List<string> QcPhotos,
    string? Notes,
    string Decision);

public sealed record UploadQcPhotosRequest
{
    public List<IFormFile> Files { get; init; } = new();
}

public sealed record UploadQcPhotosResponse
{
    public required IReadOnlyCollection<string> Urls { get; init; }
}
