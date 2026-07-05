namespace PJT_ERP.MasterData.Api.Controllers;

public sealed record BomStockDto(
    Guid ProductId,
    string? PartNumber,
    string? Description,
    IReadOnlyCollection<BomStockItemDto> Items);

public sealed record BomStockItemDto(
    Guid InventoryItemId,
    string InventoryItemCode,
    string InventoryItemName,
    decimal BOMQuantity,
    decimal CurrentStock,
    string Unit);
