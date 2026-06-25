using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace PJT_ERP.Production.Api.Application.Analytics;

public sealed class AnalyticsService(ProductionContext dbContext) : IAnalyticsService
{
    public async Task<OwnerDashboardDto> GetOwnerDashboardAsync(CancellationToken cancellationToken)
    {
        var salesOrders = await dbContext.SalesOrders
            .Select(x => new { x.Status, x.CreatedAtUtc, x.CompletedAtUtc })
            .ToListAsync(cancellationToken);

        var done = salesOrders.Count(x => x.Status == "Completed");
        var inProgress = salesOrders.Count(x => 
            x.Status == "In Production" || 
            x.Status == "QC" || 
            x.Status == "Ready for Production" || 
            x.Status == "Engineering" ||
            x.Status == "Waiting Pricing" ||
            x.Status == "Draft");

        var today = DateTime.UtcNow.Date;
        var weeks = new List<WeeklyPerformanceMetricDto>();

        // Generate last 6 weeks
        for (int i = 5; i >= 0; i--)
        {
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek - (i * 7));
            var endOfWeek = startOfWeek.AddDays(7);
            var weekLabel = $"Week {startOfWeek.Day}/{startOfWeek.Month}";

            var completedThisWeek = salesOrders.Count(x => 
                x.Status == "Completed" && 
                x.CompletedAtUtc >= startOfWeek && 
                x.CompletedAtUtc < endOfWeek);

            // Mock QC rejection logic for now since QC is in a different service or table
            var rejectedThisWeek = 0; 
            var avgHours = completedThisWeek > 0 ? 24 : 0; // Mock avg hours for now

            weeks.Add(new WeeklyPerformanceMetricDto(weekLabel, completedThisWeek, rejectedThisWeek, avgHours));
        }

        var dashboard = new OwnerDashboardDto(
            SalesOrders: new OwnerSalesOrdersMetricDto(
                Done: done,
                InProgress: inProgress),
            QualityControl: new OwnerQualityControlMetricDto(
                Accept: done, // Fallback placeholder
                Reject: 0,
                Scrap: 0),
            WeeklyPerformance: weeks);

        return dashboard;
    }
}
