namespace PJT_ERP.Production.Api.Application.Analytics;

public interface IAnalyticsService
{
    Task<OwnerDashboardDto> GetOwnerDashboardAsync(CancellationToken cancellationToken);
}
