namespace PJT_ERP.Production.Api.Application.Production;

public record MasterDataCustomerDto(Guid Id, string Code, string Name, string? Email, bool IsActive);
public record MasterDataProductDto(Guid Id, string PartNumber, string Description, string Unit, string? MaterialSpec,
                                   bool IsActive);

public record BulkDeductBomStockRequest(IReadOnlyCollection<DeductBomStockRequestItem> Items);
public record DeductBomStockRequestItem(Guid ProductId, int ProductionQuantity);

public interface IMasterDataClient
{
    Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken);
    Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken);
    Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken);
    Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken);
}
