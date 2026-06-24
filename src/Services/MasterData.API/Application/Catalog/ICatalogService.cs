namespace PJT_ERP.MasterData.Api.Application.Catalog;

public interface ICatalogService
{
    Task<IReadOnlyCollection<CustomerDto>> ListCustomersAsync(CancellationToken cancellationToken);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken);
    Task<CustomerDto?> UpdateCustomerAsync(string code, UpdateCustomerRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteCustomerAsync(string code, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ProductDto>> ListProductsAsync(CancellationToken cancellationToken);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default);
    Task UpdateProductBomAsync(Guid id, UpdateProductBomRequest request, CancellationToken cancellationToken = default);
    Task DeleteProductAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<SupplierDto>> ListSuppliersAsync(CancellationToken cancellationToken);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken cancellationToken);
    Task<SupplierDto?> UpdateSupplierAsync(string code, UpdateSupplierRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteSupplierAsync(string code, CancellationToken cancellationToken);
}
