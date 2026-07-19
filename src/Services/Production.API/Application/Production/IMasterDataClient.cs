namespace PJT_ERP.Production.Api.Application.Production;

public record MasterDataCustomerDto(Guid Id, string Code, string Name, string? Email, bool IsActive);
public record MasterDataProductDto(Guid Id, string PartNumber, string Description, string Unit, string? MaterialSpec,
                                   bool IsActive);

public record BulkDeductBomStockRequest(IReadOnlyCollection<DeductBomStockRequestItem> Items);
public record DeductBomStockRequestItem(Guid ProductId, int ProductionQuantity);

public record CreateCustomerMasterDataRequest(string Code, string Name, string? Address, string? ContactPerson, string? Email, string? Phone);
public record CreateProductMasterDataRequest(string PartNumber, string Description, string Unit, string? MaterialSpec);

public interface IMasterDataClient
{
    Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken);
    Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken);
    Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken cancellationToken);
    Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken cancellationToken);
    Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken);
    Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken);
}
