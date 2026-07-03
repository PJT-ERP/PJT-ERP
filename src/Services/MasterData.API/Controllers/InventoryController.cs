using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Catalog;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/master-data/inventory")]
public sealed class InventoryController(IInventoryService inventoryService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<InventoryItemDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await inventoryService.ListInventoryAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Purchasing,Engineering Worker,Engineering Supervisor")]
    public async Task<ActionResult<InventoryItemDto>> Create(CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var item = await inventoryService.CreateInventoryItemAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = item.Id }, item);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<InventoryItemDto>> Update(Guid id, CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var item = await inventoryService.UpdateInventoryItemAsync(id, request, cancellationToken);
            return Ok(item);
        }
        catch (Exception)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await inventoryService.DeleteInventoryItemAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("deduct-bom")]
    [Authorize(Roles = "Admin,Production")]
    public async Task<IActionResult> DeductBom(DeductBomStockRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await inventoryService.DeductBomStockAsync(request, cancellationToken);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
