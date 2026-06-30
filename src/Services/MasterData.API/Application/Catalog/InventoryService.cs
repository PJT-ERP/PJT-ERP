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
        var item = new InventoryItem
        {
            Code = request.Code.Trim().ToUpperInvariant(),
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
}
