using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/production/tracking")]
public sealed class PublicTrackingController(IProductionQueryService queryService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PublicProductionTrackingDto>> GetByQuery(
        [FromQuery] string code,
        CancellationToken cancellationToken)
    {
        return await GetTracking(code, cancellationToken);
    }

    [HttpGet("{trackingCode}")]
    public async Task<ActionResult<PublicProductionTrackingDto>> GetByPath(
        string trackingCode,
        CancellationToken cancellationToken)
    {
        return await GetTracking(trackingCode, cancellationToken);
    }

    private async Task<ActionResult<PublicProductionTrackingDto>> GetTracking(
        string trackingCode,
        CancellationToken cancellationToken)
    {
        try
        {
            var tracking = await queryService.GetPublicTrackingAsync(trackingCode, cancellationToken);
            return tracking is null
                ? NotFound(new { message = "Production tracking was not found." })
                : Ok(tracking);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
