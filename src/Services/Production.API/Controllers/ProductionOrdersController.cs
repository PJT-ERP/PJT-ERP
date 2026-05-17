using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Production.Api.Application.Production;

namespace PJT_HIMTIKA.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/orders")]
public sealed class ProductionOrdersController(IProductionService productionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductionOrderDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await productionService.ListProductionOrdersAsync(cancellationToken));
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
