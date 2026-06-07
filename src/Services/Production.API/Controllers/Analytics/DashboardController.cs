using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Analytics;

namespace PJT_ERP.Production.Api.Controllers.Analytics;

[ApiController]
[Authorize(Roles = "Admin,Owner")]
[Route("api/v1/analytics/dashboard")]
public sealed class DashboardController(IAnalyticsService analyticsService) : ControllerBase
{
    [HttpGet("owner")]
    public async Task<ActionResult<OwnerDashboardDto>> Owner(CancellationToken cancellationToken)
    {
        return Ok(await analyticsService.GetOwnerDashboardAsync(cancellationToken));
    }
}
