using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Owner")]
[Route("api/v1/production/dashboard")]
public sealed class DashboardController(IProductionQueryService queryService) : ControllerBase
{
    [HttpGet("executive")]
    public async Task<ActionResult<ExecutiveDashboardDto>> Executive(CancellationToken cancellationToken)
    {
        return Ok(await queryService.GetExecutiveDashboardAsync(cancellationToken));
    }
}
