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
    [Authorize(Roles = "Admin,Owner,Engineering Supervisor")]
    public async Task<ActionResult<IReadOnlyCollection<QcInspectionDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inspectionService.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Owner,Engineering Supervisor")]
    public async Task<ActionResult<QcInspectionDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.GetAsync(id, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPut("{id:guid}/result")]
    [Authorize(Roles = "Admin,Engineering Supervisor")]
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

    [HttpPost("upload")]
    [Authorize(Roles = "Admin,Engineering Supervisor")]
    public async Task<ActionResult<UploadQcPhotosResponse>> UploadPhotos(
        [FromForm] IFormFileCollection files,
        CancellationToken cancellationToken)
    {
        if (files is null || files.Count == 0)
        {
            return BadRequest(new { message = "No files were uploaded." });
        }

        var urls = await inspectionService.UploadPhotosAsync(files, cancellationToken);
        return Ok(new UploadQcPhotosResponse { Urls = urls });
    }
}
