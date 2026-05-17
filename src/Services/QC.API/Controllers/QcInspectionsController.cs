using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.QC.Api.Application.Inspections;

namespace PJT_HIMTIKA.QC.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/qc/inspections")]
public sealed class QcInspectionsController(IQcInspectionService inspectionService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Engineering,Owner")]
    public async Task<ActionResult<IReadOnlyCollection<QcInspectionDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inspectionService.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Engineering,Owner")]
    public async Task<ActionResult<QcInspectionDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.GetAsync(id, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost("{id:guid}/start")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<QcInspectionDto>> Start(Guid id, StartInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.StartAsync(id, request, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost("{id:guid}/visual-checks")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<QcVisualCheckDto>> AddVisualCheck(Guid id, CreateVisualCheckRequest request, CancellationToken cancellationToken)
    {
        var check = await inspectionService.AddVisualCheckAsync(id, request, cancellationToken);
        return check is null ? NotFound() : Ok(check);
    }

    [HttpPost("{id:guid}/dimension-checks")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<QcDimensionCheckDto>> AddDimensionCheck(Guid id, CreateDimensionCheckRequest request, CancellationToken cancellationToken)
    {
        var check = await inspectionService.AddDimensionCheckAsync(id, request, cancellationToken);
        return check is null ? NotFound() : Ok(check);
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<QcInspectionDto>> Submit(Guid id, SubmitInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.SubmitAsync(id, request, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost("{id:guid}/review")]
    [Authorize(Roles = "Admin,Owner")]
    public async Task<ActionResult<QcInspectionDto>> Review(Guid id, ReviewInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.ReviewAsync(id, request, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }
}
