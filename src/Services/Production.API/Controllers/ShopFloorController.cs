using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Production.Api.Application.Production;

namespace PJT_HIMTIKA.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Production")]
[Route("api/v1/production/shop-floor")]
public sealed class ShopFloorController(IProductionService productionService) : ControllerBase
{
    [HttpPost("scan")]
    public async Task<ActionResult<ProductionOrderDto>> Scan(ScanProductionOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.ScanAsync(request, cancellationToken);
            return order is null ? NotFound(new { message = "Barcode was not found." }) : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
