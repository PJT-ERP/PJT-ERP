using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Identity.Api.Application.Reports;

namespace PJT_ERP.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public sealed class DailyReportsController(IDailyReportService service) : ControllerBase
{
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateReportRequest request, CancellationToken cancellationToken)
        => await ExecuteWriteAsync(async actor => (object)await service.CreateAsync(actor, request, cancellationToken));

    [HttpGet("me")]
    public async Task<IActionResult> Mine([FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
        => await ExecuteReadAsync(async actor => (object)await service.GetMineAsync(actor, page, pageSize, cancellationToken));

    [HttpGet]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> All([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? role, [FromQuery] string? employee, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
        => await ExecuteReadAsync(async actor => (object)await service.GetAllAsync(actor, from, to, role, employee, page, pageSize, cancellationToken));

    [HttpGet("{reportId:guid}")]
    public async Task<IActionResult> Get(Guid reportId, CancellationToken cancellationToken)
        => await ExecuteReadAsync(async actor => (object?)await service.GetByIdAsync(actor, reportId, cancellationToken), notFoundWhenNull: true);

    [HttpPut("{reportId:guid}")]
    public async Task<IActionResult> Update(Guid reportId, [FromBody] UpdateReportRequest request, CancellationToken cancellationToken)
        => await ExecuteWriteAsync(async actor => (object?)await service.UpdateAsync(actor, reportId, request, cancellationToken), notFoundWhenNull: true);

    [HttpDelete("{reportId:guid}")]
    public async Task<IActionResult> Delete(Guid reportId, CancellationToken cancellationToken)
        => await ExecuteWriteAsync(async actor => await service.DeleteAsync(actor, reportId, cancellationToken) ? new object() : null, notFoundWhenNull: true, noContent: true);

    [HttpPost("{reportId:guid}/attachments")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddAttachments(Guid reportId, [FromForm] AddReportAttachmentsRequest request, CancellationToken cancellationToken)
        => await ExecuteWriteAsync(async actor => (object?)await service.AddAttachmentsAsync(actor, reportId, request, cancellationToken), notFoundWhenNull: true);

    [HttpDelete("{reportId:guid}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(Guid reportId, Guid attachmentId, CancellationToken cancellationToken)
        => await ExecuteWriteAsync(async actor => await service.DeleteAttachmentAsync(actor, reportId, attachmentId, cancellationToken) ? new object() : null, notFoundWhenNull: true, noContent: true);

    [HttpGet("{reportId:guid}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> GetAttachment(Guid reportId, Guid attachmentId, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor, out var error)) return error!;
        try
        {
            var attachment = await service.GetAttachmentAsync(actor!, reportId, attachmentId, cancellationToken);
            if (attachment is null) return NotFound();
            var storage = HttpContext.RequestServices.GetRequiredService<IReportFileStorage>();
            Response.Headers.Append("X-Content-Type-Options", "nosniff");
            return File(storage.OpenRead(attachment.StoredFilePath), attachment.ContentType, enableRangeProcessing: false);
        }
        catch (FileNotFoundException) { return NotFound(); }
    }

    private async Task<IActionResult> ExecuteReadAsync(Func<ReportActor, Task<object?>> action, bool notFoundWhenNull = false)
    {
        if (!TryGetActor(out var actor, out var error)) return error!;
        try
        {
            var result = await action(actor!);
            return result is null && notFoundWhenNull ? NotFound() : Ok(result);
        }
        catch (DailyReportValidationException exception) { return BadRequest(new { message = exception.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    private async Task<IActionResult> ExecuteWriteAsync(Func<ReportActor, Task<object?>> action, bool notFoundWhenNull = false, bool noContent = false)
    {
        if (!TryGetActor(out var actor, out var error)) return error!;
        if (actor!.IsOwner) return Forbid();
        try
        {
            var result = await action(actor);
            if (result is null && notFoundWhenNull) return NotFound();
            return noContent ? NoContent() : Ok(result);
        }
        catch (DuplicateDailyReportException exception) { return Conflict(new { message = exception.Message }); }
        catch (DailyReportValidationException exception) { return BadRequest(new { message = exception.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    private bool TryGetActor(out ReportActor? actor, out IActionResult? error)
    {
        actor = null;
        error = null;
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var name = User.FindFirstValue(ClaimTypes.Name);
        var roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();
        if (!Guid.TryParse(id, out var userId) || string.IsNullOrWhiteSpace(name) || roles.Length == 0)
        {
            error = Unauthorized(new { message = "The authentication token is missing required user claims." });
            return false;
        }
        actor = new ReportActor(userId, name, roles.FirstOrDefault(role => string.Equals(role, "Owner", StringComparison.OrdinalIgnoreCase)) ?? roles[0]);
        return true;
    }
}
