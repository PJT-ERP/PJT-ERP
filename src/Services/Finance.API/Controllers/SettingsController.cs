using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;
using Microsoft.AspNetCore.Authorization;
namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/settings")]
[Authorize(Roles = "Admin,Finance,Owner")]
public class SettingsController(IFinanceService financeService) : ControllerBase
{
    [HttpGet("opening-balance")]
    public async Task<ActionResult<decimal>> GetOpeningBalance(CancellationToken cancellationToken)
    {
        var balance = await financeService.GetOpeningBalanceAsync(cancellationToken);
        return Ok(balance);
    }

    [HttpPut("opening-balance")]
    [Authorize(Roles = "Admin,Finance")] 
    public async Task<IActionResult> UpdateOpeningBalance([FromBody] UpdateOpeningBalanceRequest request, CancellationToken cancellationToken)
    {
        await financeService.UpdateOpeningBalanceAsync(request.OpeningBalance, cancellationToken);
        return NoContent();
    }

    [HttpGet("monthly-target")]
    public async Task<ActionResult<decimal>> GetMonthlyTarget(CancellationToken cancellationToken)
    {
        var target = await financeService.GetMonthlyTargetAsync(cancellationToken);
        return Ok(target);
    }

    [HttpPut("monthly-target")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<IActionResult> UpdateMonthlyTarget([FromBody] UpdateMonthlyTargetRequest request, CancellationToken cancellationToken)
    {
        await financeService.UpdateMonthlyTargetAsync(request.MonthlyTarget, cancellationToken);
        return NoContent();
    }
}

public class UpdateOpeningBalanceRequest
{
    public decimal OpeningBalance { get; set; }
}

public class UpdateMonthlyTargetRequest
{
    public decimal MonthlyTarget { get; set; }
}
