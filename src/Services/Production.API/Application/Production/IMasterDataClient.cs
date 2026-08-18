namespace PJT_ERP.Production.Api.Application.Production;

public record MasterDataCustomerDto(Guid Id, string Code, string Name, string? Email, bool IsActive);
public record MasterDataProductDto(Guid Id, string PartNumber, string Description, string Unit, string? MaterialSpec,
                                   bool IsActive);

public sealed record BomStockDto(
    Guid ProductId,
    string? ProductPartNumber,
    string? ProductDescription,
    IReadOnlyCollection<BomStockItemDto> Items);

public sealed record BomStockItemDto(
    Guid BomItemId,
    Guid InventoryItemId,
    string? InventoryItemCode,
    string InventoryItemName,
    [property: System.Text.Json.Serialization.JsonPropertyName("bomQuantity")] decimal BomQuantity,
    string Unit,
    string? Spec,
    int CurrentStock,
    string Note);

public record BulkDeductBomStockRequest(IReadOnlyCollection<DeductBomStockRequestItem> Items);
public record DeductBomStockRequestItem(Guid ProductId, int ProductionQuantity);

public record DeductCustomBomRequest(IReadOnlyCollection<DeductCustomBomRequestItem> Items);
public record DeductCustomBomRequestItem(Guid InventoryItemId, decimal Quantity);

public record CreateCustomerMasterDataRequest(string Code, string Name, string? Address, string? ContactPerson, string? Email, string? Phone);
public record CreateProductMasterDataRequest(string PartNumber, string Description, string Unit, string? MaterialSpec);

public interface IMasterDataClient
{
    Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken);
    Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken);
    Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken cancellationToken);
    Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken cancellationToken);
    Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken);
    Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken);
    Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken);
}
