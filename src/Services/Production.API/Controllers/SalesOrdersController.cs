using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/sales-orders")]
public sealed class SalesOrdersController(IProductionService productionService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await productionService.ListSalesOrdersAsync(cancellationToken));
    }

    [HttpGet("{id:guid}/progress")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> GetProgress(Guid id, CancellationToken cancellationToken)
    {
        var progress = await productionService.GetSalesOrderProgressAsync(id, cancellationToken);
        return progress is null ? NotFound() : Ok(progress);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> Create(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.CreateSalesOrderAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"[DEBUG] InvalidOperationException: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/engineers")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Owner,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> AssignEngineers(Guid id, AssignSalesOrderEngineersRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.AssignSalesOrderEngineersAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/design-status")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateDesignStatus(
        Guid id,
        UpdateSalesOrderDesignStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.UpdateSalesOrderDesignStatusAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/customer-drawing")]
    [Authorize(Roles = "Admin,Sales,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateCustomerDrawing(
        Guid id,
        UpdateCustomerDrawingUrlRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.UpdateCustomerDrawingUrlAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/items")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateItems(
        Guid id,
        UpdateSalesOrderItemsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.UpdateSalesOrderItemsAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/pricing")]
    [Authorize(Roles = "Admin,Finance,Owner")]
    public async Task<ActionResult<SalesOrderDto>> SetPricing(
        Guid id,
        SetSalesOrderPricingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.SetSalesOrderPricingAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/submit-design")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> SubmitDesign(
        Guid id,
        SubmitSalesOrderDesignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.SubmitSalesOrderDesignAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> Confirm(Guid id, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await productionService.ConfirmSalesOrderAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/engineering-drawing")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> UploadEngineeringDrawing(
        Guid id,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.UploadEngineeringDrawingAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/material-requests")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> SubmitMaterialRequest(
        Guid id,
        SubmitProductionMaterialRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.SubmitMaterialRequestAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/start")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> StartProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.StartProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/finish")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> FinishProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.FinishProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/pause")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> PauseProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.PauseProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/resume")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> ResumeProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionService.ResumeProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
