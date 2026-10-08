using PJT_ERP.Identity.Api.Domain.Entities;

namespace PJT_ERP.Identity.Api.Application.Reports;

public interface IDailyReportService
{
    Task<DailyReportDto> CreateAsync(ReportActor actor, CreateReportRequest request, CancellationToken cancellationToken);
    Task<PagedResult<DailyReportDto>> GetMineAsync(ReportActor actor, int page, int pageSize, CancellationToken cancellationToken);
    Task<PagedResult<DailyReportDto>> GetAllAsync(ReportActor actor, DateOnly? from, DateOnly? to, string? role, string? employee, int page, int pageSize, CancellationToken cancellationToken);
    Task<DailyReportDto?> GetByIdAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken);
    Task<DailyReportDto?> UpdateAsync(ReportActor actor, Guid reportId, UpdateReportRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DailyReportAttachmentDto>?> AddAttachmentsAsync(ReportActor actor, Guid reportId, AddReportAttachmentsRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken);
    Task<DailyReportAttachment?> GetAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken);
}
