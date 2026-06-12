using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;

namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/payment-verifications")]
[Authorize(Roles = "Admin,Finance,Sales,Owner")]
public sealed class PaymentVerificationsController(IFinanceService financeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<PaymentVerificationRequestDto>>> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        return Ok(await financeService.ListPaymentVerificationsAsync(status, cancellationToken));
    }

    [HttpPost("invoices/{invoiceId:guid}")]
    [Authorize(Roles = "Admin,Finance,Sales")]
    public async Task<ActionResult<PaymentVerificationRequestDto>> SubmitPaymentProof(
        Guid invoiceId,
        SubmitPaymentProofRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var proofRequest = await financeService.SubmitPaymentProofAsync(invoiceId, request, cancellationToken);
            return proofRequest is null ? NotFound() : CreatedAtAction(nameof(List), new { status = proofRequest.Status }, proofRequest);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{requestId:guid}/verify")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<PaymentVerificationRequestDto>> Verify(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        try
        {
            var proofRequest = await financeService.VerifyPaymentProofAsync(requestId, cancellationToken);
            return proofRequest is null ? NotFound() : Ok(proofRequest);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{requestId:guid}/reject")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<PaymentVerificationRequestDto>> Reject(
        Guid requestId,
        RejectPaymentVerificationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var proofRequest = await financeService.RejectPaymentProofAsync(requestId, request, cancellationToken);
            return proofRequest is null ? NotFound() : Ok(proofRequest);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
