using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;

namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/invoice-candidates")]
[Authorize(Roles = "Admin,Finance,Owner,Sales")]
public sealed class InvoiceCandidatesController(IFinanceService financeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceCandidateDto>>> List(
        [FromQuery] Guid? customerId,
        CancellationToken cancellationToken)
    {
        return Ok(await financeService.ListInvoiceCandidatesAsync(customerId, cancellationToken));
    }
}
