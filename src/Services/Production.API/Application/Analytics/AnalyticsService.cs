namespace PJT_ERP.Production.Api.Application.Analytics;

public sealed class AnalyticsService : IAnalyticsService
{
    public Task<OwnerDashboardDto> GetOwnerDashboardAsync(CancellationToken cancellationToken)
    {
        var dashboard = new OwnerDashboardDto(
            SalesOrders: new OwnerSalesOrdersMetricDto(
                Done: 128,
                InProgress: 34),
            QualityControl: new OwnerQualityControlMetricDto(
                Accept: 116,
                Reject: 9,
                Scrap: 3));

        return Task.FromResult(dashboard);
    }
}
