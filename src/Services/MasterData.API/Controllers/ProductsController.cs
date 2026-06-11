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
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering")]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await catalogService.CreateProductAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = product.Id }, product);
    }
}
