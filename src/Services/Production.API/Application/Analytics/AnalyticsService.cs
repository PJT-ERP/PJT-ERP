using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace PJT_ERP.Production.Api.Application.Analytics;

public sealed class AnalyticsService(ProductionContext dbContext) : IAnalyticsService
{
    public async Task<OwnerDashboardDto> GetOwnerDashboardAsync(CancellationToken cancellationToken)
    {
        var salesOrders = await dbContext.SalesOrders
            .Select(x => new { x.Id, x.Status, x.CreatedAtUtc, x.UpdatedAtUtc })
            .ToListAsync(cancellationToken);

        var productionOrders = await dbContext.ProductionOrders
            .Select(x => new { x.SalesOrderId, x.QcDecision, x.StartedAtUtc, x.FinishedAtUtc, x.UpdatedAtUtc })
            .ToListAsync(cancellationToken);

        var done = salesOrders.Count(x => x.Status == "Completed");
        var inProgress = salesOrders.Count(x => 
            x.Status == "InProduction" || 
            x.Status == "QC" || 
            x.Status == "Ready for Production" || 
            x.Status == "PendingDesign" ||
            x.Status == "WaitingApproval" ||
            x.Status == "Draft");

        var today = DateTime.UtcNow.Date;
        var weeks = new List<WeeklyPerformanceMetricDto>();

        // Calculate Accept/Reject/Scrap
        var acceptCount = productionOrders.Count(p => p.QcDecision == "Go" || p.QcDecision == "Accept");
        var rejectCount = productionOrders.Count(p => p.QcDecision == "NoGo" || p.QcDecision == "Reject");
        var scrapCount = productionOrders.Count(p => p.QcDecision == "Scrap");

        // Generate last 6 weeks
        for (int i = 5; i >= 0; i--)
        {
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek - (i * 7));
            var endOfWeek = startOfWeek.AddDays(7);
            var weekLabel = $"Week {startOfWeek.Day}/{startOfWeek.Month}";

            // Find SalesOrders completed this week
            var completedSOsThisWeek = salesOrders.Where(x => 
                x.Status == "Completed" && 
                x.UpdatedAtUtc >= startOfWeek && 
                x.UpdatedAtUtc < endOfWeek).ToList();

            var completedThisWeek = completedSOsThisWeek.Count;

            // Find ProductionOrders rejected this week
            var rejectedThisWeek = productionOrders.Count(p => 
                (p.QcDecision == "NoGo" || p.QcDecision == "Reject") && 
                p.UpdatedAtUtc >= startOfWeek && 
                p.UpdatedAtUtc < endOfWeek);
            
            // Calculate avg hours for completed production orders this week
            var completedPosThisWeek = productionOrders.Where(p => 
                (p.QcDecision == "Go" || p.QcDecision == "Accept") && 
                p.FinishedAtUtc.HasValue && p.StartedAtUtc.HasValue &&
                p.UpdatedAtUtc >= startOfWeek && 
                p.UpdatedAtUtc < endOfWeek).ToList();

            var avgHours = 0;
            if (completedPosThisWeek.Count > 0)
            {
                var totalHours = completedPosThisWeek.Sum(p => (p.FinishedAtUtc!.Value - p.StartedAtUtc!.Value).TotalHours);
                avgHours = (int)Math.Round(totalHours / completedPosThisWeek.Count);
            }

            weeks.Add(new WeeklyPerformanceMetricDto(weekLabel, completedThisWeek, rejectedThisWeek, avgHours));
        }

        var dashboard = new OwnerDashboardDto(
            SalesOrders: new OwnerSalesOrdersMetricDto(
                Done: done,
                InProgress: inProgress),
            QualityControl: new OwnerQualityControlMetricDto(
                Accept: acceptCount,
                Reject: rejectCount,
                Scrap: scrapCount),
            WeeklyPerformance: weeks);

        return dashboard;
    }
}
