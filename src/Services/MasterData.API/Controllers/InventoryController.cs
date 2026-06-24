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
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<InventoryItemDto>> Create(CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var item = await inventoryService.CreateInventoryItemAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = item.Id }, item);
    }
}
