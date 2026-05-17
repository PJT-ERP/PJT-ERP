using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/orders")]
public sealed class ProductionOrdersController(IProductionService productionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductionOrderDto>>> List(
        [FromQuery] Guid? salesOrderId,
        CancellationToken cancellationToken)
    {
        return Ok(await productionService.ListProductionOrdersAsync(salesOrderId, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductionOrderDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var order = await productionService.GetProductionOrderAsync(id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPut("{id:guid}/engineering-drawing")]
    [Authorize(Roles = "Admin,Engineering")]
    public async Task<ActionResult<ProductionOrderDto>> UploadEngineeringDrawing(
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
}
