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
    IReadOnlyCollection<DeductBomStockRequestItem> Items,
    string? Reason = null);

public record DeductBomStockRequestItem(
    Guid ProductId,
    int ProductionQuantity);

public record DeductCustomBomRequest(
    IReadOnlyCollection<DeductCustomBomRequestItem> Items,
    string? Reason = null);

public record DeductCustomBomRequestItem(
    Guid InventoryItemId,
    decimal Quantity);

public record MutateStockRequest(
    string Type,
    decimal Quantity,
    string Reason);

public record StockMutationLogDto(
    Guid Id,
    Guid InventoryItemId,
    string ItemCode,
    string ItemName,
    string MutationType,
    decimal Quantity,
    string Reason,
    DateTime CreatedAtUtc);

public interface IInventoryService
{
    Task<IReadOnlyCollection<InventoryItemDto>> ListInventoryAsync(CancellationToken cancellationToken);
    Task<InventoryItemDto> CreateInventoryItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken);
    Task<InventoryItemDto> UpdateInventoryItemAsync(Guid id, CreateInventoryItemRequest request, CancellationToken cancellationToken);
    Task DeleteInventoryItemAsync(Guid id, CancellationToken cancellationToken);
    Task DeductBomStockAsync(DeductBomStockRequest request, CancellationToken cancellationToken);
    Task DeductBomStockBulkAsync(BulkDeductBomStockRequest request, CancellationToken cancellationToken);
    Task DeductCustomBomAsync(DeductCustomBomRequest request, CancellationToken cancellationToken);
    Task MutateStockAsync(Guid id, MutateStockRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StockMutationLogDto>> ListMutationsAsync(CancellationToken cancellationToken);
}
