using System.Net.Http.Headers;

namespace PJT_ERP.Identity.Api.Application.Reports;

public interface IReportSalesOrderLookup
{
    Task<string> GetNumberAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class ReportSalesOrderLookup(HttpClient client, IHttpContextAccessor accessor) : IReportSalesOrderLookup
{
    private sealed record SalesOrderReference(Guid Id, string SoNumber);
    public async Task<string> GetNumberAsync(Guid id, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/v1/production/sales-orders/report-options?id={id}");
        var authorization = accessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!AuthenticationHeaderValue.TryParse(authorization, out var header)) throw new UnauthorizedAccessException();
        request.Headers.Authorization = header;
        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) throw new DailyReportValidationException("SO belum dapat diverifikasi. Silakan coba lagi.");
            var options = await response.Content.ReadFromJsonAsync<List<SalesOrderReference>>(cancellationToken);
            return options?.SingleOrDefault(item => item.Id == id)?.SoNumber
                ?? throw new DailyReportValidationException("SO tidak ditemukan. Pilih ulang SO terkait.");
        }
        catch (HttpRequestException) { throw new DailyReportValidationException("Layanan SO tidak dapat dihubungi. Silakan coba lagi."); }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested) { throw new DailyReportValidationException("Verifikasi SO terlalu lama. Silakan coba lagi."); }
    }
}
