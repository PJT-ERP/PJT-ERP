using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Production.Api.Application.Production;

namespace PJT_HIMTIKA.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Owner")]
[Route("api/v1/production/dashboard")]
public sealed class DashboardController(IProductionService productionService) : ControllerBase
{
    [HttpGet("executive")]
    public async Task<ActionResult<ExecutiveDashboardDto>> Executive(CancellationToken cancellationToken)
    {
        return Ok(await productionService.GetExecutiveDashboardAsync(cancellationToken));
    }
}
