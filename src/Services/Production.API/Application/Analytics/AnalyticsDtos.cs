namespace PJT_ERP.Production.Api.Application.Analytics;

public sealed record OwnerDashboardDto(
    OwnerSalesOrdersMetricDto SalesOrders,
    OwnerQualityControlMetricDto QualityControl,
    IReadOnlyList<WeeklyPerformanceMetricDto> WeeklyPerformance);

public sealed record OwnerSalesOrdersMetricDto(
    int Done,
    int InProgress);

public sealed record OwnerQualityControlMetricDto(
    int Accept,
    int Reject,
    int Scrap);

public sealed record WeeklyPerformanceMetricDto(
    string Week,
    int Completed,
    int Rejected,
    int AvgHours);
