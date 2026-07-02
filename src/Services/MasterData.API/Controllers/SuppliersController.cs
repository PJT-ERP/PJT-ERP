using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Catalog;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/master-data/suppliers")]
public sealed class SuppliersController(ICatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<SupplierDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await catalogService.ListSuppliersAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Owner,Purchasing")]
    public async Task<ActionResult<SupplierDto>> Create(CreateSupplierRequest request, CancellationToken cancellationToken)
    {
        var supplier = await catalogService.CreateSupplierAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{code}")]
    [Authorize(Roles = "Admin,Owner,Purchasing")]
    public async Task<ActionResult<SupplierDto>> Update(string code, UpdateSupplierRequest request, CancellationToken cancellationToken)
    {
        var supplier = await catalogService.UpdateSupplierAsync(code, request, cancellationToken);
        return supplier is null ? NotFound() : Ok(supplier);
    }

    [HttpDelete("{code}")]
    [Authorize(Roles = "Admin,Owner,Purchasing")]
    public async Task<IActionResult> Delete(string code, CancellationToken cancellationToken)
    {
        var deleted = await catalogService.DeleteSupplierAsync(code, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
