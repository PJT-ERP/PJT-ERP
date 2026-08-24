using System.Net.Http.Json;
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

    public async Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var response = await httpClient.PostAsJsonAsync("api/v1/master-data/customers", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<MasterDataCustomerDto>(cancellationToken: cancellationToken);
        return result ?? throw new InvalidOperationException("Failed to create customer.");
    }

    public async Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var response = await httpClient.PostAsJsonAsync("api/v1/master-data/products", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<MasterDataProductDto>(cancellationToken: cancellationToken);
        return result ?? throw new InvalidOperationException("Failed to create product.");
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
            }
            throw new InvalidOperationException(errorMessage);
        }
    }

    public async Task DeductBomStockBulkAsync(IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var request = new { Items = items, Reason = reason };
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
            }
            throw new InvalidOperationException(errorMessage);
        }
    }

    public async Task DeductCustomBomAsync(IReadOnlyCollection<DeductCustomBomRequestItem> items, string reason, CancellationToken cancellationToken)
    {
        AttachAuthorizationHeader();
        var request = new { Items = items, Reason = reason };
        var response =
            await httpClient.PostAsJsonAsync("api/v1/master-data/inventory/deduct-custom-bom", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string errorMessage = $"Failed to deduct custom BOM stock due to insufficient inventory or unauthorized access. Status Code: {response.StatusCode}";
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
            }
            throw new InvalidOperationException(errorMessage);
        }
    }

    public async Task<IReadOnlyCollection<BomStockDto>> GetBomStockAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken)
    {
        try
        {
            AttachAuthorizationHeader();
            var idsParam = string.Join(",", productIds);
            if (string.IsNullOrWhiteSpace(idsParam))
            {
                return Array.Empty<BomStockDto>();
            }
            
            var response = await httpClient.GetAsync($"api/v1/master-data/products/bom-stock?ids={idsParam}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<IReadOnlyCollection<BomStockDto>>(
                    cancellationToken: cancellationToken) ?? Array.Empty<BomStockDto>();
            }
            return Array.Empty<BomStockDto>();
        }
        catch (HttpRequestException)
        {
            return Array.Empty<BomStockDto>();
        }
    }

    private record ErrorResponse(string Message);
}
