namespace PJT_ERP.Identity.Api.Application.Reports;

public interface IDailyReportService
{
    Task<DailyReportDto> CreateAsync(ReportActor actor, CreateReportRequest request, CancellationToken cancellationToken = default);
    Task<PagedResult<DailyReportDto>> GetMineAsync(ReportActor actor, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<PagedResult<DailyReportDto>> GetAllAsync(ReportActor actor, DateTime? from, DateTime? to, string? role, string? employee, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<DailyReportDto?> GetByIdAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken = default);
    Task<DailyReportDto?> UpdateAsync(ReportActor actor, Guid reportId, UpdateReportRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DailyReportAttachmentDto>?> AddAttachmentsAsync(ReportActor actor, Guid reportId, AddReportAttachmentsRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken = default);
    Task<PJT_ERP.Identity.Api.Domain.Entities.DailyReportAttachment?> GetAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken = default);
}
