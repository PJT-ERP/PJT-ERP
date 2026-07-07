using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using System.Net.Http.Headers;

using Microsoft.AspNetCore.Http;
using System.Net.Http.Headers;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed class MasterDataClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor) : IMasterDataClient
{
    private void AttachAuthorizationHeader()
    {
        var authHeader = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    public async Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            AttachAuthorizationHeader();
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
            AttachAuthorizationHeader();
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

    public async Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var request = new { ProductId = productId, ProductionQuantity = quantity };
        var response =
            await httpClient.PostAsJsonAsync("api/v1/master-data/inventory/deduct-bom", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string errorMessage = $"Failed to deduct BOM stock due to insufficient inventory or unauthorized access. Status Code: {response.StatusCode}";
            try
            {
                if (response.Content.Headers.ContentType?.MediaType == "application/json")
                {
                    var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(cancellationToken: cancellationToken);
                    if (error != null && !string.IsNullOrWhiteSpace(error.Message))
                    {
                        errorMessage = error.Message;
                    }
                }
                else
                {
                    var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (!string.IsNullOrWhiteSpace(rawContent) && rawContent.Length < 200)
                    {
                        errorMessage = rawContent;
                    }
                }
            }
            catch
            {
                // Ignored, fallback to default error message
            }
            throw new InvalidOperationException(errorMessage);
        }
    }

    public async Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var request = new { Items = items };
        var response =
            await httpClient.PostAsJsonAsync("api/v1/master-data/inventory/deduct-bom-bulk", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string errorMessage = $"Failed to deduct BOM stock due to insufficient inventory or unauthorized access. Status Code: {response.StatusCode}";
            try
            {
                if (response.Content.Headers.ContentType?.MediaType == "application/json")
                {
                    var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(cancellationToken: cancellationToken);
                    if (error != null && !string.IsNullOrWhiteSpace(error.Message))
                    {
                        errorMessage = error.Message;
                    }
                }
                else
                {
                    var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (!string.IsNullOrWhiteSpace(rawContent) && rawContent.Length < 200)
                    {
                        errorMessage = rawContent;
                    }
                }
            }
            catch
            {
                // Ignored, fallback to default error message
            }
            throw new InvalidOperationException(errorMessage);
        }
    }

    private record ErrorResponse(string Message);
}
