using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Production.Api.Application.Production;

namespace PJT_HIMTIKA.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Owner")]
[Route("api/v1/production/shop-floor")]
public sealed class ShopFloorController(IProductionService productionService) : ControllerBase
{
    [HttpPost("lookup")]
    public async Task<ActionResult<ProductionOrderDto>> Lookup(LookupProductionOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.GetProductionOrderByBarcodeAsync(request.BarcodeUid, cancellationToken);
            return order is null ? NotFound(new { message = "Barcode was not found." }) : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

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
