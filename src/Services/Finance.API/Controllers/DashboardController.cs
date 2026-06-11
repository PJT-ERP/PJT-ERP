using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;

namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/dashboard")]
[Authorize(Roles = "Admin,Finance,Owner")]
public sealed class DashboardController(IFinanceService financeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FinanceDashboardDto>> Get(
        [FromQuery] Guid? customerId,
        CancellationToken cancellationToken)
    {
        return Ok(await financeService.GetDashboardAsync(customerId, cancellationToken));
    }
}
