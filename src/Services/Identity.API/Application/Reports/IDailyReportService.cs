namespace PJT_ERP.Identity.Api.Application.Reports;

public interface IDailyReportService
{
    Task<DailyReportDto> CreateReportAsync(Guid userId, CreateReportRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<DailyReportDto>> GetMyReportsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<DailyReportDto>> GetAllReportsAsync(CancellationToken cancellationToken = default);
}
