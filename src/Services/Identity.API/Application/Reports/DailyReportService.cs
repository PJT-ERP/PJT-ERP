using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed class DailyReportService(IdentityContext db, IReportFileStorage fileStorage) : IDailyReportService
{
    private const int MaxTasks = 20;
    private const int MaxTaskLength = 500;
    private const int MaxCaptionLength = 500;
    private const int MaxAttachments = 5;

    public async Task<DailyReportDto> CreateAsync(ReportActor actor, CreateReportRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        ValidateReportDate(request.ReportDate);
        ValidateSummaryAndTasks(request.Summary, request.Tasks);
        ValidateAttachmentRequest(request.Images, request.AttachmentCaptions, 0);

        var reportDate = DateTime.SpecifyKind(request.ReportDate!.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        if (await db.DailyReports.AnyAsync(report => report.UserId == actor.UserId && report.ReportDate == reportDate, cancellationToken))
            throw new DuplicateDailyReportException();

        var now = DateTime.UtcNow;
        var report = new DailyReport
        {
            Id = Guid.NewGuid(), UserId = actor.UserId, UserName = actor.UserName, UserRole = actor.Role,
            ReportDate = reportDate, Summary = request.Summary.Trim(), CreatedAtUtc = now, UpdatedAtUtc = now,
            Tasks = request.Tasks.Where(task => !string.IsNullOrWhiteSpace(task)).Select((task, index) => new DailyReportTask
            { Id = Guid.NewGuid(), Description = task.Trim(), SortOrder = index }).ToList()
        };
        db.DailyReports.Add(report);
        await db.SaveChangesAsync(cancellationToken);
        if (request.Images.Count > 0)
            await AddAttachmentsAsync(actor, report.Id, new AddReportAttachmentsRequest { Images = request.Images, AttachmentCaptions = request.AttachmentCaptions }, cancellationToken);
        return (await GetByIdAsync(actor, report.Id, cancellationToken))!;
    }

    public async Task<PagedResult<DailyReportDto>> GetMineAsync(ReportActor actor, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db.DailyReports.AsNoTracking().Where(report => report.UserId == actor.UserId);
        return await ToPagedAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<PagedResult<DailyReportDto>> GetAllAsync(ReportActor actor, DateOnly? from, DateOnly? to, string? role, string? employee, int page, int pageSize, CancellationToken cancellationToken)
    {
        if (!actor.IsOwner) throw new UnauthorizedAccessException();
        if (from is not null && to is not null && from > to) throw new DailyReportValidationException("The start date cannot be after the end date.");
        var query = db.DailyReports.AsNoTracking().AsQueryable();
        if (from is not null) query = query.Where(report => report.ReportDate >= DateTime.SpecifyKind(from.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc));
        if (to is not null) query = query.Where(report => report.ReportDate <= DateTime.SpecifyKind(to.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc));
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(report => report.UserRole == role.Trim());
        if (!string.IsNullOrWhiteSpace(employee)) query = query.Where(report => EF.Functions.ILike(report.UserName, $"%{employee.Trim()}%"));
        return await ToPagedAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<DailyReportDto?> GetByIdAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken)
    {
        var report = await FindReadableAsync(actor, reportId, false, cancellationToken);
        return report is null ? null : ToDto(report);
    }

    public async Task<DailyReportDto?> UpdateAsync(ReportActor actor, Guid reportId, UpdateReportRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        ValidateSummaryAndTasks(request.Summary, request.Tasks);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return null;
        report.Summary = request.Summary.Trim();
        report.UpdatedAtUtc = DateTime.UtcNow;
        db.DailyReportTasks.RemoveRange(report.Tasks);
        report.Tasks = request.Tasks.Where(task => !string.IsNullOrWhiteSpace(task)).Select((task, index) => new DailyReportTask
        { Id = Guid.NewGuid(), DailyReportId = report.Id, Description = task.Trim(), SortOrder = index }).ToList();
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(report);
    }

    public async Task<bool> DeleteAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return false;
        foreach (var attachment in report.Attachments) fileStorage.Delete(attachment.StoredFilePath);
        db.DailyReports.Remove(report);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<DailyReportAttachmentDto>?> AddAttachmentsAsync(ReportActor actor, Guid reportId, AddReportAttachmentsRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return null;
        ValidateAttachmentRequest(request.Images, request.AttachmentCaptions, report.Attachments.Count);
        var storedPaths = new List<string>();
        try
        {
            foreach (var (file, index) in request.Images.Select((file, index) => (file, index)))
            {
                var storedPath = await fileStorage.SaveAsync(file, cancellationToken);
                storedPaths.Add(storedPath);
                var attachment = new DailyReportAttachment
                {
                    Id = Guid.NewGuid(), DailyReportId = report.Id, StoredFilePath = storedPath,
                    OriginalFileName = Path.GetFileName(file.FileName), ContentType = file.ContentType,
                    FileSizeBytes = file.Length, Caption = GetCaption(request.AttachmentCaptions, index), CreatedAtUtc = DateTime.UtcNow
                };
                report.Attachments.Add(attachment);
                db.DailyReportAttachments.Add(attachment);
            }
            report.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            foreach (var path in storedPaths) fileStorage.Delete(path);
            throw;
        }
        return report.Attachments.Select(ToDto).ToArray();
    }

    public async Task<bool> DeleteAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        var attachment = report?.Attachments.SingleOrDefault(item => item.Id == attachmentId);
        if (attachment is null) return false;
        fileStorage.Delete(attachment.StoredFilePath);
        db.DailyReportAttachments.Remove(attachment);
        report!.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<DailyReportAttachment?> GetAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken)
    {
        var report = await FindReadableAsync(actor, reportId, true, cancellationToken);
        return report?.Attachments.SingleOrDefault(attachment => attachment.Id == attachmentId);
    }

    private async Task<DailyReport?> FindReadableAsync(ReportActor actor, Guid reportId, bool tracked, CancellationToken cancellationToken)
    {
        IQueryable<DailyReport> query = tracked ? db.DailyReports : db.DailyReports.AsNoTracking();
        query = query.Include(report => report.Tasks).Include(report => report.Attachments);
        if (!actor.IsOwner) query = query.Where(report => report.UserId == actor.UserId);
        return await query.SingleOrDefaultAsync(report => report.Id == reportId, cancellationToken);
    }

    private async Task<DailyReport?> FindWritableAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken)
    {
        var report = await db.DailyReports.Include(item => item.Tasks).Include(item => item.Attachments)
            .SingleOrDefaultAsync(item => item.Id == reportId && item.UserId == actor.UserId, cancellationToken);
        if (report is not null && report.ReportDate.Date != DateTime.UtcNow.Date)
            throw new DailyReportValidationException("Reports can only be changed or deleted on their report date.");
        return report;
    }

    private static async Task<PagedResult<DailyReportDto>> ToPagedAsync(IQueryable<DailyReport> query, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 50);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Include(report => report.Tasks).Include(report => report.Attachments)
            .OrderByDescending(report => report.ReportDate).ThenByDescending(report => report.CreatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PagedResult<DailyReportDto>(items.Select(ToDto).ToArray(), page, pageSize, total);
    }

    private static DailyReportDto ToDto(DailyReport report) => new(report.Id, report.UserId, report.UserName, report.UserRole, report.ReportDate,
        report.Summary, report.Tasks.OrderBy(task => task.SortOrder).Select(task => new DailyReportTaskDto(task.Id, task.Description, task.SortOrder)).ToArray(),
        report.Attachments.OrderBy(attachment => attachment.CreatedAtUtc).Select(ToDto).ToArray(), report.CreatedAtUtc, report.UpdatedAtUtc);
    private static DailyReportAttachmentDto ToDto(DailyReportAttachment attachment) => new(attachment.Id, attachment.OriginalFileName, attachment.ContentType, attachment.FileSizeBytes, attachment.Caption, attachment.CreatedAtUtc);
    private static void RejectOwnerWrite(ReportActor actor) { if (actor.IsOwner) throw new UnauthorizedAccessException(); }
    private static void ValidateReportDate(DateOnly? date) { if (date is null || date.Value != DateOnly.FromDateTime(DateTime.UtcNow)) throw new DailyReportValidationException("A daily report can only be created for today."); }
    private static void ValidateSummaryAndTasks(string summary, IEnumerable<string> tasks)
    {
        if (string.IsNullOrWhiteSpace(summary) || summary.Trim().Length > 2000) throw new DailyReportValidationException("Summary is required and must not exceed 2000 characters.");
        var values = tasks.Where(task => !string.IsNullOrWhiteSpace(task)).ToArray();
        if (values.Length > MaxTasks || values.Any(task => task.Trim().Length > MaxTaskLength)) throw new DailyReportValidationException("A report supports up to 20 tasks of 500 characters each.");
    }
    private static void ValidateAttachmentRequest(IReadOnlyCollection<IFormFile> images, IReadOnlyList<string?> captions, int existingCount)
    {
        if (images.Count == 0 && captions.Count > 0) throw new DailyReportValidationException("Captions require an uploaded image.");
        if (images.Count + existingCount > MaxAttachments || captions.Count > images.Count || captions.Any(caption => caption?.Trim().Length > MaxCaptionLength)) throw new DailyReportValidationException("A report supports up to 5 images with captions of up to 500 characters.");
    }
    private static string? GetCaption(IReadOnlyList<string?> captions, int index) => index < captions.Count && !string.IsNullOrWhiteSpace(captions[index]) ? captions[index]!.Trim() : null;
}
