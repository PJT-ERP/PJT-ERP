using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/dashboard")]
public sealed class DashboardController(IProductionQueryService queryService) : ControllerBase
{
    [HttpGet("executive")]
    [Authorize(Roles = "Admin,Owner")]
    public async Task<ActionResult<ExecutiveDashboardDto>> Executive(CancellationToken cancellationToken)
    {
        return Ok(await queryService.GetExecutiveDashboardAsync(cancellationToken));
    }

    [HttpGet("counters")]
    public async Task<ActionResult<DashboardCountersDto>> Counters(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdString, out var parsed) ? parsed : null;
        var userRole = User.FindFirstValue(System.Security.Claims.ClaimTypes.Role) ?? "";
        
        return Ok(await queryService.GetDashboardCountersAsync(userId, userRole, cancellationToken));
    }
}
