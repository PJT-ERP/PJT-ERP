using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Production.Api.Application.Production;

namespace PJT_HIMTIKA.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/sales-orders")]
public sealed class SalesOrdersController(IProductionService productionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await productionService.ListSalesOrdersAsync(cancellationToken));
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

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = "Admin,Sales Order")]
    public async Task<ActionResult<IReadOnlyCollection<ProductionOrderDto>>> Confirm(Guid id, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
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
}
