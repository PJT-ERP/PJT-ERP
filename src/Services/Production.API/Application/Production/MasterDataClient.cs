using System.Net.Http.Json;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed class MasterDataClient(HttpClient httpClient) : IMasterDataClient
{
    public async Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var response = await httpClient.GetAsync($"api/v1/master-data/customers/{id}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<MasterDataCustomerDto>(cancellationToken: cancellationToken);
            }
            return null;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    public async Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var response = await httpClient.GetAsync($"api/v1/master-data/products/{id}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<MasterDataProductDto>(cancellationToken: cancellationToken);
            }
            return null;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}
