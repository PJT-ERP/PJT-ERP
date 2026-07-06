namespace PJT_ERP.MasterData.Api.Application.Catalog;

public record InventoryItemDto(
    Guid Id,
    string Code,
    string Name,
    string Category,
    string Unit,
    decimal CurrentStock,
    decimal MinStock,
    decimal MaxStock,
    decimal ReorderPoint,
    string Location,
    string SupplierName,
    decimal UnitPrice,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public record CreateInventoryItemRequest(
    string Code,
    string Name,
    string Category,
    string Unit,
    decimal CurrentStock,
    decimal MinStock,
    decimal MaxStock,
    decimal ReorderPoint,
    string Location,
    string SupplierName,
    decimal UnitPrice);

public record DeductBomStockRequest(
    Guid ProductId,
    int ProductionQuantity);

public record BulkDeductBomStockRequest(
    IReadOnlyCollection<DeductBomStockRequestItem> Items);

public record DeductBomStockRequestItem(
    Guid ProductId,
    int ProductionQuantity);

public interface IInventoryService
{
    Task<IReadOnlyCollection<InventoryItemDto>> ListInventoryAsync(CancellationToken cancellationToken);
    Task<InventoryItemDto> CreateInventoryItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken);
    Task<InventoryItemDto> UpdateInventoryItemAsync(Guid id, CreateInventoryItemRequest request, CancellationToken cancellationToken);
    Task DeleteInventoryItemAsync(Guid id, CancellationToken cancellationToken);
    Task DeductBomStockAsync(DeductBomStockRequest request, CancellationToken cancellationToken);
    Task DeductBomStockBulkAsync(BulkDeductBomStockRequest request, CancellationToken cancellationToken);
}
