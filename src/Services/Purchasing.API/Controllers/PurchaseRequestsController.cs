using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

namespace PJT_ERP.Purchasing.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/purchasing/purchase-requests")]
public sealed class PurchaseRequestsController(IPurchaseRequestService purchaseRequestService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Finance,Engineering,Purchasing,Owner,Sales Order")]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseRequestDto>>> List(
        [FromQuery] Guid? salesOrderId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        return Ok(await purchaseRequestService.ListAsync(salesOrderId, status, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Finance,Engineering,Purchasing,Owner,Sales Order")]
    public async Task<ActionResult<PurchaseRequestDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await purchaseRequestService.GetAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Engineering,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> Create(CreatePurchaseRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/review")]
    [Authorize(Roles = "Admin,Finance")]
    public async Task<ActionResult<PurchaseRequestDto>> Review(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.ReviewAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/items/{itemId:guid}/purchase-info")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> UpdatePurchaseInfo(
        Guid id,
        Guid itemId,
        UpdatePurchaseItemInfoRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.UpdatePurchaseItemInfoAsync(id, itemId, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
