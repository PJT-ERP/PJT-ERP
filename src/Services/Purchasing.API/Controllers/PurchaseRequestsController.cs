using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Purchasing.Api.Application.PurchaseRequests;

namespace PJT_HIMTIKA.Purchasing.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/purchasing/purchase-requests")]
public sealed class PurchaseRequestsController(IPurchaseRequestService purchaseRequestService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Finance,Engineering,Purchasing")]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseRequestDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await purchaseRequestService.ListAsync(cancellationToken));
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
        var result = await purchaseRequestService.ReviewAsync(id, request, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
