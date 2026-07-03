using Microsoft.EntityFrameworkCore;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;

namespace PJT_ERP.MasterData.Api.Application.Catalog;

public sealed class InventoryService(MasterDataContext db) : IInventoryService
{
    public async Task<IReadOnlyCollection<InventoryItemDto>> ListInventoryAsync(CancellationToken cancellationToken)
    {
        return await db.InventoryItems
            .AsNoTracking()
            .OrderBy(item => item.Code)
            .Select(item => new InventoryItemDto(
                item.Id,
                item.Code,
                item.Name,
                item.Category,
                item.Unit,
                item.CurrentStock,
                item.MinStock,
                item.MaxStock,
                item.ReorderPoint,
                item.Location,
                item.SupplierName,
                item.UnitPrice,
                item.CreatedAtUtc,
                item.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<InventoryItemDto> CreateInventoryItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? await GenerateSequentialCodeAsync("MAT-", db.InventoryItems.Where(i => i.Code.StartsWith("MAT-")).Select(i => i.Code), cancellationToken)
            : request.Code.Trim().ToUpperInvariant();

        var item = new InventoryItem
        {
            Code = code,
            Name = request.Name.Trim(),
            Category = request.Category,
            Unit = request.Unit,
            CurrentStock = request.CurrentStock,
            MinStock = request.MinStock,
            MaxStock = request.MaxStock,
            ReorderPoint = request.ReorderPoint,
            Location = request.Location,
            SupplierName = request.SupplierName,
            UnitPrice = request.UnitPrice
        };

        await db.InventoryItems.AddAsync(item, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new InventoryItemDto(
            item.Id,
            item.Code,
            item.Name,
            item.Category,
            item.Unit,
            item.CurrentStock,
            item.MinStock,
            item.MaxStock,
            item.ReorderPoint,
            item.Location,
            item.SupplierName,
            item.UnitPrice,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }

    public async Task<InventoryItemDto> UpdateInventoryItemAsync(Guid id, CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var item = await db.InventoryItems.FindAsync(new object[] { id }, cancellationToken);
        if (item == null)
        {
            throw new Exception("Inventory item not found");
        }

        item.Name = request.Name.Trim();
        item.Category = request.Category;
        item.Unit = request.Unit;
        item.CurrentStock = request.CurrentStock;
        item.MinStock = request.MinStock;
        item.MaxStock = request.MaxStock;
        item.ReorderPoint = request.ReorderPoint;
        item.Location = request.Location;
        item.SupplierName = request.SupplierName;
        item.UnitPrice = request.UnitPrice;
        
        await db.SaveChangesAsync(cancellationToken);

        return new InventoryItemDto(
            item.Id,
            item.Code,
            item.Name,
            item.Category,
            item.Unit,
            item.CurrentStock,
            item.MinStock,
            item.MaxStock,
            item.ReorderPoint,
            item.Location,
            item.SupplierName,
            item.UnitPrice,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }

    public async Task DeleteInventoryItemAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await db.InventoryItems.FindAsync(new object[] { id }, cancellationToken);
        if (item != null)
        {
            db.InventoryItems.Remove(item);
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task DeductBomStockAsync(DeductBomStockRequest request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(p => p.BomItems)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new Exception($"Product with ID {request.ProductId} not found.");

        if (product.BomItems.Count == 0)
        {
            return; // Nothing to deduct
        }

        var missingMaterials = new List<string>();
        var itemsToUpdate = new List<(InventoryItem item, decimal quantityToDeduct)>();

        foreach (var bomItem in product.BomItems)
        {
            var requiredQuantity = bomItem.Quantity * request.ProductionQuantity;
            
            var inventoryItem = await db.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == bomItem.InventoryItemId, cancellationToken);

            if (inventoryItem == null)
            {
                missingMaterials.Add($"Unknown Material ID {bomItem.InventoryItemId} (Not found in inventory)");
                continue;
            }

            if (inventoryItem.CurrentStock < requiredQuantity)
            {
                missingMaterials.Add($"{inventoryItem.Name} (Required: {requiredQuantity}, In Stock: {inventoryItem.CurrentStock})");
            }
            else
            {
                itemsToUpdate.Add((inventoryItem, requiredQuantity));
            }
        }

        if (missingMaterials.Count > 0)
        {
            var message = "Insufficient stock for production. Please create a Material Request (PR) first for: " + string.Join(", ", missingMaterials);
            throw new Exception(message);
        }

        foreach (var (item, quantity) in itemsToUpdate)
        {
            item.CurrentStock -= quantity;
            item.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> GenerateSequentialCodeAsync(string prefix, IQueryable<string> existingCodesQuery, CancellationToken cancellationToken)
    {
        var existingCodes = await existingCodesQuery.ToListAsync(cancellationToken);
        
        var max = 0;
        foreach (var code in existingCodes)
        {
            if (code.Length <= prefix.Length) continue;
            var numberStr = code[prefix.Length..];
            if (int.TryParse(numberStr, out var number) && number > max)
            {
                max = number;
            }
        }

        return $"{prefix}{(max + 1):000}";
    }
}
