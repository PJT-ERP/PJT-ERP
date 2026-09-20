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
    [Authorize(Roles = "Admin,Owner,QC")]
    public async Task<ActionResult<IReadOnlyCollection<QcInspectionDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inspectionService.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Owner,QC")]
    public async Task<ActionResult<QcInspectionDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var inspection = await inspectionService.GetAsync(id, cancellationToken);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPut("{id:guid}/result")]
    [Authorize(Roles = "Admin,QC")]
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
    [Authorize(Roles = "Admin,QC")]
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

    [HttpGet("/qc-photos/{fileName}")]
    [Authorize(Roles = "Admin,QC,QC Inspector,Owner,Production,Engineering")]
    public IActionResult GetQcPhoto(string fileName, [FromServices] IWebHostEnvironment env)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return BadRequest(new { message = "File name is required." });
        }

        var safeFileName = Path.GetFileName(fileName);
        var uploadsFolder = Path.Combine(
            env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "qc-photos");

        var filePath = Path.Combine(uploadsFolder, safeFileName);
        var fullPath = Path.GetFullPath(filePath);
        var baseDir = Path.GetFullPath(uploadsFolder);

        if (!fullPath.StartsWith(baseDir + Path.DirectorySeparatorChar, StringComparison.Ordinal) && !fullPath.Equals(baseDir, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid path traversal attempt." });
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new { message = "QC photo file not found." });
        }

        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".webp" => "image/webp",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };

        Response.Headers.Append("X-Content-Type-Options", "nosniff");
        Response.Headers.Append("Content-Security-Policy", "default-src 'none'; sandbox");
        Response.Headers.Append("Cache-Control", "private, no-cache, no-store, must-revalidate");

        return PhysicalFile(fullPath, contentType);
    }
}

