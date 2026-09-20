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
        [FromForm] SubmitPaymentProofFormRequest request,
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

    [HttpGet("/proofs/{fileName}")]
    [Authorize(Roles = "Admin,Finance,Owner,Sales,Sales Order,Purchasing")]
    public IActionResult GetPaymentProof(string fileName, [FromServices] IWebHostEnvironment env)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return BadRequest(new { message = "File name is required." });
        }

        var safeFileName = Path.GetFileName(fileName);
        var uploadsFolder = Path.Combine(
            env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "proofs");

        var filePath = Path.Combine(uploadsFolder, safeFileName);
        var fullPath = Path.GetFullPath(filePath);
        var baseDir = Path.GetFullPath(uploadsFolder);

        if (!fullPath.StartsWith(baseDir + Path.DirectorySeparatorChar, StringComparison.Ordinal) && !fullPath.Equals(baseDir, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid path traversal attempt." });
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new { message = "Payment proof file not found." });
        }

        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        Response.Headers.Append("X-Content-Type-Options", "nosniff");
        Response.Headers.Append("Content-Security-Policy", "default-src 'none'; sandbox");
        Response.Headers.Append("Cache-Control", "private, no-cache, no-store, must-revalidate");

        return PhysicalFile(fullPath, contentType);
    }
}

