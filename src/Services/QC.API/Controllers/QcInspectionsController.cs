using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.QC.Api.Application.Inspections;

namespace PJT_HIMTIKA.QC.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,QC")]
[Route("api/v1/qc/inspections")]
public sealed class QcInspectionsController(IQcInspectionService inspectionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<QcInspectionDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inspectionService.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QcInspectionDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.GetAsync(id, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<ActionResult<QcInspectionDto>> Start(Guid id, StartInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.StartAsync(id, request, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost("{id:guid}/visual-checks")]
    public async Task<ActionResult<QcVisualCheckDto>> AddVisualCheck(Guid id, CreateVisualCheckRequest request, CancellationToken cancellationToken)
    {
        var check = await inspectionService.AddVisualCheckAsync(id, request, cancellationToken);
        return check is null ? NotFound() : Ok(check);
    }

    [HttpPost("{id:guid}/dimension-checks")]
    public async Task<ActionResult<QcDimensionCheckDto>> AddDimensionCheck(Guid id, CreateDimensionCheckRequest request, CancellationToken cancellationToken)
    {
        var check = await inspectionService.AddDimensionCheckAsync(id, request, cancellationToken);
        return check is null ? NotFound() : Ok(check);
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<QcInspectionDto>> Complete(Guid id, CompleteInspectionRequest request, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.CompleteAsync(id, request, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }
}
