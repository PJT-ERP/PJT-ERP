using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Owner,Sales Order,Finance,Engineering,Engineering Worker,Purchasing")]
[Route("api/v1/production/tracking")]
public sealed class ShopFloorController(IProductionService productionService) : ControllerBase
{
    [HttpPost("lookup")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> Lookup(LookupSalesOrderTrackingRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await productionService.GetSalesOrderTrackingByCodeAsync(request.TrackingCode, cancellationToken);
            return order is null ? NotFound(new { message = "Sales order tracking was not found." }) : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
