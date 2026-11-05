using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using System.Security.Claims;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

namespace PJT_ERP.Purchasing.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/purchasing/purchase-requests")]
public sealed class PurchaseRequestsController(IPurchaseRequestService purchaseRequestService) : ControllerBase
{
    [HttpGet("next-po-number")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Purchasing,Owner")]
    public async Task<ActionResult<string>> PreviewNextPoNumber(CancellationToken cancellationToken)
    {
        return Ok(await purchaseRequestService.PreviewNextPoNumberAsync(cancellationToken));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Finance,Engineering Supervisor,Purchasing,Owner,Sales,Sales Order")]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseRequestDto>>> List(
        [FromQuery] Guid? salesOrderId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        return Ok(await purchaseRequestService.ListAsync(salesOrderId, status, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Finance,Engineering Supervisor,Purchasing,Owner,Sales,Sales Order")]
    public async Task<ActionResult<PurchaseRequestDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await purchaseRequestService.GetAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Purchasing")]
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

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> Update(Guid id, UpdatePurchaseRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.UpdateAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/supervisor-review")]
    [Authorize(Roles = "Admin,Engineering Supervisor")]
    public Task<ActionResult<PurchaseRequestDto>> SupervisorReview(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        return ReviewWithStage(id, request with { ReviewStage = "Supervisor" }, cancellationToken);
    }

    [HttpPost("{id:guid}/finance-review")]
    [Authorize(Roles = "Admin,Finance")]
    public Task<ActionResult<PurchaseRequestDto>> FinanceReview(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        return FinanceApproval(id, new PurchaseRequestApprovalDecisionRequest(request.Decision, request.RejectionReason), cancellationToken);
    }

    [HttpPost("{id:guid}/finance-approval")]
    [Authorize(Roles = "Admin,Finance")]
    public Task<ActionResult<PurchaseRequestDto>> FinanceApproval(Guid id, PurchaseRequestApprovalDecisionRequest request, CancellationToken cancellationToken)
    {
        return ApprovalWithRole(id, request, PurchaseRequestApprovalRoles.Finance, cancellationToken);
    }

    [HttpPost("{id:guid}/owner-approval")]
    [Authorize(Roles = "Admin,Owner")]
    public Task<ActionResult<PurchaseRequestDto>> OwnerApproval(Guid id, PurchaseRequestApprovalDecisionRequest request, CancellationToken cancellationToken)
    {
        return ApprovalWithRole(id, request, PurchaseRequestApprovalRoles.Owner, cancellationToken);
    }

    [HttpPost("{id:guid}/review")]
    [Authorize(Roles = "Admin,Finance")]
    public Task<ActionResult<PurchaseRequestDto>> Review(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        return FinanceApproval(id, new PurchaseRequestApprovalDecisionRequest(request.Decision, request.RejectionReason), cancellationToken);
    }

    [HttpPost("{id:guid}/request-revision")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> RequestRevision(Guid id, RequestPrRevisionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.RequestRevisionAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<ActionResult<PurchaseRequestDto>> ReviewWithStage(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
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

    private async Task<ActionResult<PurchaseRequestDto>> ApprovalWithRole(Guid id, PurchaseRequestApprovalDecisionRequest request, string role, CancellationToken cancellationToken)
    {
        if (!TryGetAuthenticatedUserId(out var actorUserId)) return Unauthorized();
        try
        {
            var result = role == PurchaseRequestApprovalRoles.Finance
                ? await purchaseRequestService.FinanceApprovalAsync(id, request, actorUserId, cancellationToken)
                : await purchaseRequestService.OwnerApprovalAsync(id, request, actorUserId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private bool TryGetAuthenticatedUserId(out Guid userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out userId);
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

    [HttpPut("{id:guid}/items/{itemId:guid}/process")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> ProcessItem(
        Guid id,
        Guid itemId,
        ProcessPurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.ProcessPurchaseItemAsync(id, itemId, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/items/{itemId:guid}/reject")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> RejectItem(
        Guid id,
        Guid itemId,
        RejectPurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.RejectPurchaseItemAsync(id, itemId, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/items/{itemId:guid}/receive")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<PurchaseRequestDto>> ReceiveItem(
        Guid id,
        Guid itemId,
        ReceivePurchaseItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.ReceivePurchaseItemAsync(id, itemId, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
