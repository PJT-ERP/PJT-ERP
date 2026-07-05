using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Catalog;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/master-data/products")]
public sealed class ProductsController(ICatalogService catalogService, IInventoryService inventoryService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await catalogService.ListProductsAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var product = await catalogService.GetProductAsync(id, cancellationToken);
        if (product is null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Engineering Worker,Purchasing")]
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
    [Authorize(Roles = "Admin,Owner,Engineering Worker,Engineering Supervisor,Purchasing")]
    public async Task<ActionResult> UpdateBom(Guid id, UpdateProductBomRequest request, CancellationToken cancellationToken)
    {
        await catalogService.UpdateProductBomAsync(id, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("bom-stock")]
    public async Task<ActionResult<IReadOnlyCollection<BomStockDto>>> GetBomStock([FromQuery] string ids, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return Ok(Array.Empty<BomStockDto>());

        var productIds = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Guid.Parse)
            .ToList();

        var inventoryItems = await inventoryService.ListInventoryAsync(cancellationToken);
        var results = new List<BomStockDto>();

        foreach (var productId in productIds)
        {
            var product = await catalogService.GetProductAsync(productId, cancellationToken);
            if (product?.BomItems is null || product.BomItems.Count == 0)
            {
                results.Add(new BomStockDto(productId, product?.PartNumber, product?.Description, Array.Empty<BomStockItemDto>()));
                continue;
            }

            var bomStockItems = product.BomItems.Select(bom =>
            {
                var inv = inventoryItems.FirstOrDefault(i => i.Id == bom.InventoryItemId);
                return new BomStockItemDto(
                    bom.InventoryItemId,
                    inv?.Code ?? "",
                    inv?.Name ?? bom.InventoryItemId.ToString(),
                    bom.Quantity,
                    inv?.CurrentStock ?? 0,
                    inv?.Unit ?? "");
            }).ToList();

            results.Add(new BomStockDto(productId, product.PartNumber, product.Description, bomStockItems));
        }

        return Ok(results);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Owner")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await catalogService.DeleteProductAsync(id, cancellationToken);
        return NoContent();
    }
}
