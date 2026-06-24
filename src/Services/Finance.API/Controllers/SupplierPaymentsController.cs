using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;

namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/supplier-payments")]
[Authorize(Roles = "Admin,Finance,Purchasing,Owner")]
public sealed class SupplierPaymentsController(IFinanceService financeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<SupplierPaymentDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await financeService.ListSupplierPaymentsAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<SupplierPaymentDto>> SubmitPayment(
        [FromForm] SubmitSupplierPaymentFormRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var payment = await financeService.SubmitSupplierPaymentAsync(request, cancellationToken);
            return payment is null ? BadRequest() : CreatedAtAction(nameof(List), null, payment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
