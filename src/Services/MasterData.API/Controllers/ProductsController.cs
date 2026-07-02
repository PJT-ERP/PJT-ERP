using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Catalog;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/master-data/products")]
public sealed class ProductsController(ICatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await catalogService.ListProductsAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering Worker,Purchasing")]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await catalogService.CreateProductAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = product.Id }, product);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering Worker,Purchasing")]
    public async Task<ActionResult<ProductDto>> Update(Guid id, CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await catalogService.UpdateProductAsync(id, request, cancellationToken);
        return Ok(product);
    }

    [HttpPut("{id}/bom")]
    [Authorize(Roles = "Admin,Engineering Worker,Purchasing")]
    public async Task<ActionResult> UpdateBom(Guid id, UpdateProductBomRequest request, CancellationToken cancellationToken)
    {
        await catalogService.UpdateProductBomAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await catalogService.DeleteProductAsync(id, cancellationToken);
        return NoContent();
    }
}
