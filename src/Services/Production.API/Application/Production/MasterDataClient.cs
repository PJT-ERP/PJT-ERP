using System.Net.Http.Json;

using Microsoft.AspNetCore.Http;
using System.Net.Http.Headers;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed class MasterDataClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor) : IMasterDataClient
{
    public async Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var response = await httpClient.GetAsync($"api/v1/master-data/customers/{id}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<MasterDataCustomerDto>(
                    cancellationToken: cancellationToken);
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
                return await response.Content.ReadFromJsonAsync<MasterDataProductDto>(
                    cancellationToken: cancellationToken);
            }
            return null;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private void SetAuthorizationHeader()
    {
        var token = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(token) && token.StartsWith("Bearer "))
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Substring("Bearer ".Length).Trim());
        }
    }

    public async Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken)
    {
        SetAuthorizationHeader();
        var request = new { ProductId = productId, ProductionQuantity = quantity };
        var response =
            await httpClient.PostAsJsonAsync("api/v1/master-data/inventory/deduct-bom", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            ErrorResponse? error = null;
            try
            {
                if (response.Content.Headers.ContentType?.MediaType == "application/json")
                {
                    error =
                        await response.Content.ReadFromJsonAsync<ErrorResponse>(cancellationToken: cancellationToken);
                }
            }
            catch (System.Text.Json.JsonException)
            {
                // Ignored, fallback to default error message
            }

            var errorMessage =
                error?.Message ??
                $"Failed to deduct BOM stock due to insufficient inventory or unauthorized access. Status Code: {response.StatusCode}";
            throw new InvalidOperationException(errorMessage);
        }
    }

    private record ErrorResponse(string Message);
}
