using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.QC.Api.Application.Inspections;

namespace PJT_ERP.QC.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/qc/inspections")]
public sealed class QcInspectionsController(IQcInspectionService inspectionService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Engineering Reviewer")]
    public async Task<ActionResult<IReadOnlyCollection<QcInspectionDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inspectionService.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Engineering Reviewer")]
    public async Task<ActionResult<QcInspectionDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.GetAsync(id, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPut("{id:guid}/result")]
    [Authorize(Roles = "Admin,Engineering Reviewer")]
    public async Task<ActionResult<QcInspectionDto>> UploadResult(
        Guid id,
        UploadQcResultRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var inspection = await inspectionService.UploadResultAsync(id, request, cancellationToken);
            return inspection is null ? NotFound() : Ok(inspection);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
