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
}
