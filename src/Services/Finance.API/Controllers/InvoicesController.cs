using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Finance.Api.Application.Finance;

namespace PJT_ERP.Finance.Api.Controllers;

[ApiController]
[Route("api/v1/finance/invoices")]
[Authorize(Roles = "Admin,Finance,Owner,Sales")]
public sealed class InvoicesController(IFinanceService financeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceDto>>> List(
        [FromQuery] Guid? customerId,
        [FromQuery] DateOnly? dueFrom,
        [FromQuery] DateOnly? dueTo,
        [FromQuery] string? status,
        [FromQuery] string? sortBy,
        CancellationToken cancellationToken)
    {
        return Ok(await financeService.ListInvoicesAsync(customerId, dueFrom, dueTo, status, sortBy, cancellationToken));
    }

    [HttpGet("{invoiceId:guid}")]
    public async Task<ActionResult<InvoiceDto>> Get(Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await financeService.GetInvoiceAsync(invoiceId, cancellationToken);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpGet("{invoiceId:guid}/pdf")]
    [Authorize(Roles = "Admin,Finance,Owner,Sales")]
    public async Task<ActionResult> GetPdf(Guid invoiceId, [FromQuery] bool inline = false, CancellationToken cancellationToken = default)
    {
        var invoice = await financeService.GetInvoiceAsync(invoiceId, cancellationToken);
        if (invoice is null)
        {
            return NotFound();
        }

        var pdfBytes = PdfGeneratorService.GenerateInvoicePdf(invoice);
        if (inline)
        {
            return File(pdfBytes, "application/pdf");
        }
        return File(pdfBytes, "application/pdf", $"Invoice-{invoice.InvoiceNumber}.pdf");
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<InvoiceDto>> Create(CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var invoice = await financeService.CreateInvoiceAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { invoiceId = invoice.Id }, invoice);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{invoiceId:guid}/payments")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<InvoiceDto>> RecordPayment(
        Guid invoiceId,
        RecordPaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var invoice = await financeService.RecordPaymentAsync(invoiceId, request, cancellationToken);
            return invoice is null ? NotFound() : Ok(invoice);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{invoiceId:guid}/collection-letters")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<InvoiceDto>> CreateCollectionLetter(
        Guid invoiceId,
        CreateCollectionLetterRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var invoice = await financeService.CreateCollectionLetterAsync(invoiceId, request, cancellationToken);
            return invoice is null ? NotFound() : Ok(invoice);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
