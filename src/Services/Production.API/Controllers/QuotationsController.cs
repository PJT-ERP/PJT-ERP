using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PJT_ERP.Production.Api.Application.Quotations;
using PJT_ERP.Production.Api.Domain.Entities;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sales/quotations")]
public sealed class QuotationsController(IQuotationService quotationService, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering Supervisor,Engineering,Purchasing")]
    public async Task<ActionResult<IReadOnlyCollection<QuotationDto>>> List(
        [FromQuery] string? status,
        [FromQuery] Guid? customerId,
        CancellationToken cancellationToken)
    {
        var quotations = await quotationService.ListAsync(status, customerId, cancellationToken);
        if (User.IsInRole("Engineering") && !User.IsInRole("Admin"))
        {
            var userId = ReadUserId();
            if (!userId.HasValue) return Forbid();
            return Ok(quotations.Where(item =>
                item.AssignedEngineerId == userId.Value
                && item.EngineeringReviewRequired
                && item.Status is QuotationStatuses.PendingDesign or QuotationStatuses.DesignReview).ToList());
        }
        return Ok(quotations);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering Supervisor,Engineering,Purchasing")]
    public async Task<ActionResult<QuotationDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var quotation = await quotationService.GetAsync(id, cancellationToken);
        if (quotation is null) return NotFound();
        if (User.IsInRole("Engineering") && !User.IsInRole("Admin") && quotation.AssignedEngineerId != ReadUserId()) return Forbid();
        return Ok(quotation);
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
    [Authorize(Roles = "Admin,Engineering Supervisor")]
    public async Task<ActionResult<QuotationDto>> AssignEngineer(
        Guid id,
        AssignQuotationEngineerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var engineer = await FindActiveEngineerAsync(request.EngineerId, cancellationToken);
            if (engineer is null)
            {
                return BadRequest(new { message = "Selected user must be an active Engineering user." });
            }

            var quotation = await quotationService.AssignEngineerAsync(
                id,
                request with { EngineerName = engineer.Name },
                cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = $"Identity service is unavailable: {ex.Message}" });
        }
    }

    private async Task<IdentityEngineerDto?> FindActiveEngineerAsync(Guid engineerId, CancellationToken cancellationToken)
    {
        if (engineerId == Guid.Empty) return null;

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/users");
        if (Request.Headers.Authorization.FirstOrDefault() is { Length: > 0 } authorization)
        {
            request.Headers.TryAddWithoutValidation("Authorization", authorization);
        }
        else if (Request.Cookies.TryGetValue("access_token", out var cookieToken) && !string.IsNullOrWhiteSpace(cookieToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cookieToken);
        }
        using var response = await httpClientFactory.CreateClient("IdentityApi").SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadFromJsonAsync<IdentityEngineerDto[]>(cancellationToken: cancellationToken);
        return users?.FirstOrDefault(user =>
            user.UserId == engineerId
            && string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase)
            && user.Roles.Contains("Engineering", StringComparer.OrdinalIgnoreCase));
    }

    private sealed record IdentityEngineerDto(Guid UserId, string Name, string[] Roles, string Status);

    [HttpPost("{id:guid}/design-submission")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<QuotationDto>> SubmitDesign(
        Guid id,
        SubmitQuotationDesignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = ReadUserId();
            if (!User.IsInRole("Admin") && !userId.HasValue) return Forbid();
            var authenticatedRequest = User.IsInRole("Admin") ? request : request with { EngineerId = userId!.Value };
            var quotation = await quotationService.SubmitDesignAsync(id, authenticatedRequest, cancellationToken);
            return quotation is null ? NotFound() : Ok(quotation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/supervisor-design-approval")]
    [Authorize(Roles = "Admin,Engineering Supervisor")]
    public async Task<ActionResult<QuotationDto>> ApproveDesignBySupervisor(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.ApproveDesignBySupervisorAsync(id, cancellationToken);
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
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering Supervisor")]
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

    private Guid? ReadUserId()
    {
        // JwtBearer normally maps `sub` to NameIdentifier. Keep the original
        // JWT subject as a fallback as well so authorization/filtering uses
        // the same Identity UserAccount.Id even when inbound claim mapping is
        // disabled by a host or gateway configuration.
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subject, out var userId) ? userId : null;
    }

    [HttpPost("{id:guid}/price-revision")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<QuotationDto>> RequestPriceRevision(
        Guid id,
        RequestQuotationRevisionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var quotation = await quotationService.RequestPriceRevisionAsync(id, request, cancellationToken);
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
        CancellationToken cancellationToken)
    {
        try
        {
            var salesOrder = await quotationService.ConvertToSalesOrderAsync(id, cancellationToken);
            return salesOrder is null ? NotFound() : Ok(salesOrder);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
