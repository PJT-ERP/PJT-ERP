using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Quotations;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sales/quotations")]
public sealed class QuotationsController(IQuotationService quotationService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Engineering Worker,Purchasing")]
    public async Task<ActionResult<IReadOnlyCollection<QuotationDto>>> List(
        [FromQuery] string? status,
        [FromQuery] Guid? customerId,
        CancellationToken cancellationToken)
    {
        return Ok(await quotationService.ListAsync(status, customerId, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Engineering Worker,Purchasing")]
    public async Task<ActionResult<QuotationDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var quotation = await quotationService.GetAsync(id, cancellationToken);
        return quotation is null ? NotFound() : Ok(quotation);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> Create(CreateQuotationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = quotation.Id }, quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/assign-engineer")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering Reviewer")]
    public async Task<ActionResult<QuotationDto>> AssignEngineer(
        Guid id,
        AssignQuotationEngineerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.AssignEngineerAsync(id, request, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/design-submission")]
    [Authorize(Roles = "Admin,Engineering,Engineering Worker,Engineering Supervisor")]
    public async Task<ActionResult<QuotationDto>> SubmitDesign(
        Guid id,
        SubmitQuotationDesignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.SubmitDesignAsync(id, request, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/client-design-approval")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> ApproveClientDesign(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.ApproveClientDesignAsync(id, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/design-revision")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> RequestDesignRevision(
        Guid id,
        RequestQuotationRevisionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.RequestDesignRevisionAsync(id, request, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/pricing")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<QuotationDto>> SubmitPricing(
        Guid id,
        SubmitQuotationPricingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.SubmitPricingAsync(id, request, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/won")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> MarkWon(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.MarkWonAsync(id, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/lost")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> MarkLost(
        Guid id,
        MarkQuotationLostRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.MarkLostAsync(id, request, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/convert-to-sales-order")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult> ConvertToSalesOrder(
        Guid id,
        ConvertQuotationToSalesOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var salesOrder = await quotationService.ConvertToSalesOrderAsync(id, request, cancellationToken);
            return salesOrder is null ? NotFound() : Ok(salesOrder);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
