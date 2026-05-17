namespace PJT_ERP.MasterData.Api.Application.Catalog;

public interface ICatalogService
{
    Task<IReadOnlyCollection<CustomerDto>> ListCustomersAsync(CancellationToken cancellationToken);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ProductDto>> ListProductsAsync(CancellationToken cancellationToken);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken);
}
