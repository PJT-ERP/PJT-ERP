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
    [Authorize(Roles = "Admin,Owner,Sales Order,Finance,Engineering,Engineering Worker,Purchasing")]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await productionService.ListSalesOrdersAsync(cancellationToken));
    }

    [HttpGet("{id:guid}/progress")]
    [Authorize(Roles = "Admin,Owner,Sales Order,Finance,Engineering,Engineering Worker,Purchasing")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> GetProgress(Guid id, CancellationToken cancellationToken)
    {
        var progress = await productionService.GetSalesOrderProgressAsync(id, cancellationToken);
        return progress is null ? NotFound() : Ok(progress);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> Create(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.CreateSalesOrderAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/engineers")]
    [Authorize(Roles = "Admin,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> AssignEngineers(
        Guid id,
        AssignSalesOrderEngineersRequest request,
        CancellationToken cancellationToken)
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
    [Authorize(Roles = "Admin,Engineering Reviewer")]
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

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = "Admin,Sales Order")]
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
    [Authorize(Roles = "Admin,Engineering Worker")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> UploadEngineeringDrawing(
        Guid id,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await productionService.UploadEngineeringDrawingAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/start")]
    [Authorize(Roles = "Admin,Engineering Worker")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> StartProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await productionService.StartProductionAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/finish")]
    [Authorize(Roles = "Admin,Engineering Worker")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> FinishProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await productionService.FinishProductionAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
