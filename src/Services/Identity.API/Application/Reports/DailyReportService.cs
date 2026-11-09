using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed class DailyReportService(IdentityContext db, IReportFileStorage fileStorage, IReportSalesOrderLookup? salesOrderLookup = null) : IDailyReportService
{
    private const int MaxTasks = 20;
    private const int MaxTaskLength = 500;
    private const int MaxCaptionLength = 500;
    private const int MaxAttachments = 5;

    public async Task<DailyReportDto> CreateAsync(ReportActor actor, CreateReportRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        ValidateReportDate(request.ReportDate);
        await ValidateSummaryAndTasksAsync(request.Summary, request.Tasks, cancellationToken);
        ValidateAttachmentRequest(request.Images, request.AttachmentCaptions, request.Tasks.Sum(task => task.Images.Count));
        foreach (var task in request.Tasks) ValidateAttachmentRequest(task.Images, task.AttachmentCaptions, 0);
        if (request.Images.Count > 0) throw new DailyReportValidationException("Upload images on an activity.");

        if (request.Tasks.Any(task => task.Id.HasValue)) throw new DailyReportValidationException("New activities must not specify existing IDs.");
        var reportDate = DateTime.SpecifyKind(request.ReportDate!.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        if (await db.DailyReports.AnyAsync(report => report.UserId == actor.UserId && report.ReportDate == reportDate, cancellationToken))
            throw new DuplicateDailyReportException();

        var now = DateTime.UtcNow;
        var report = new DailyReport
        {
            Id = Guid.NewGuid(), UserId = actor.UserId, UserName = actor.UserName, UserRole = actor.Role,
            ReportDate = reportDate, Summary = request.Summary.Trim(), CreatedAtUtc = now, UpdatedAtUtc = now,
            Tasks = await BuildTasksAsync(request.Tasks, cancellationToken)
        };
        var stored = new List<DailyReportAttachment>();
        try
        {
            for (var index = 0; index < request.Tasks.Count; index++)
            {
                var input = request.Tasks[index];
                stored.AddRange(await StoreImagesAsync(report.Id, report.Tasks[index].Id, input.Images, input.AttachmentCaptions, cancellationToken));
            }
            report.Attachments = stored;
            db.DailyReports.Add(report);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            foreach (var attachment in stored) fileStorage.Delete(attachment.StoredFilePath);
            throw;
        }
        return ToDto(report);
    }

    public async Task<IReadOnlyList<ReportUserDto>> GetTaggableUsersAsync(CancellationToken cancellationToken)
        => await db.UserAccounts.AsNoTracking().Where(user => user.Status == "Active").OrderBy(user => user.Name)
            .Select(user => new ReportUserDto(user.Id, user.Name, user.Role)).ToListAsync(cancellationToken);

    public async Task<PagedResult<DailyReportDto>> GetMentionedAsync(ReportActor actor, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db.DailyReports.AsNoTracking().Where(report => report.Tasks.Any(task => task.TaggedUserIds.Contains(actor.UserId)));
        return await ToPagedAsync(query, page, pageSize, cancellationToken, actor.UserId);
    }

    public async Task<PagedResult<DailyReportDto>> GetMineAsync(ReportActor actor, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db.DailyReports.AsNoTracking().Where(report => report.UserId == actor.UserId);
        return await ToPagedAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<PagedResult<DailyReportDto>> GetAllAsync(ReportActor actor, DateOnly? from, DateOnly? to, string? role, string? employee, int page, int pageSize, CancellationToken cancellationToken, string? salesOrder = null, string? status = null)
    {
        if (!actor.IsOwner) throw new UnauthorizedAccessException();
        if (from is not null && to is not null && from > to) throw new DailyReportValidationException("The start date cannot be after the end date.");
        var query = db.DailyReports.AsNoTracking().AsQueryable();
        if (from is not null) query = query.Where(report => report.ReportDate >= DateTime.SpecifyKind(from.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc));
        if (to is not null) query = query.Where(report => report.ReportDate <= DateTime.SpecifyKind(to.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc));
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(report => report.UserRole == role.Trim());
        if (!string.IsNullOrWhiteSpace(employee)) query = query.Where(report => EF.Functions.ILike(report.UserName, $"%{employee.Trim()}%"));
        var salesOrderPattern = string.IsNullOrWhiteSpace(salesOrder) ? null : $"%{salesOrder.Trim()}%";
        if (salesOrderPattern is not null || !string.IsNullOrWhiteSpace(status))
            query = query.Where(report => report.Tasks.Any(task =>
                (salesOrderPattern == null || (task.SalesOrderNumber != null && EF.Functions.ILike(task.SalesOrderNumber, salesOrderPattern))) &&
                (string.IsNullOrWhiteSpace(status) || task.Status == status)));
        return await ToPagedAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<DailyReportDto?> GetByIdAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken)
    {
        var report = await FindReadableAsync(actor, reportId, false, cancellationToken);
        return report is null ? null : ToDto(report, !actor.IsOwner && report.UserId != actor.UserId ? actor.UserId : null);
    }

    public async Task<DailyReportDto?> UpdateAsync(ReportActor actor, Guid reportId, UpdateReportRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        await ValidateSummaryAndTasksAsync(request.Summary, request.Tasks, cancellationToken);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return null;
        report.Summary = request.Summary.Trim();
        report.UpdatedAtUtc = DateTime.UtcNow;

        var requestedIds = request.Tasks.Where(task => task.Id.HasValue).Select(task => task.Id!.Value).ToArray();
        if (requestedIds.Distinct().Count() != requestedIds.Length || requestedIds.Any(id => report.Tasks.All(task => task.Id != id)))
            throw new DailyReportValidationException("Invalid activity ID.");
        var removedTasks = report.Tasks.Where(task => !requestedIds.Contains(task.Id)).ToArray();
        if (request.RemovedAttachmentIds.Any(id => report.Attachments.All(image => image.Id != id)))
            throw new DailyReportValidationException("Invalid attachment ID.");
        var removedImages = report.Attachments.Where(image => request.RemovedAttachmentIds.Contains(image.Id) || removedTasks.Any(task => task.Id == image.TaskId)).ToArray();
        ValidateAttachmentRequest(request.Tasks.SelectMany(task => task.Images).ToArray(), [], report.Attachments.Count - removedImages.Length);
        foreach (var task in request.Tasks) ValidateAttachmentRequest(task.Images, task.AttachmentCaptions, 0);
        db.DailyReportAttachments.RemoveRange(removedImages);
        foreach (var image in removedImages) report.Attachments.Remove(image);
        db.DailyReportTasks.RemoveRange(removedTasks);
        foreach (var task in removedTasks) report.Tasks.Remove(task);
        var updated = await BuildTasksAsync(request.Tasks, cancellationToken);
        foreach (var task in updated)
        {
            var existing = report.Tasks.SingleOrDefault(item => item.Id == task.Id);
            if (existing is null) { task.DailyReportId = report.Id; report.Tasks.Add(task); db.DailyReportTasks.Add(task); }
            else
            {
                existing.Description = task.Description; existing.Target = task.Target; existing.Status = task.Status; existing.Result = task.Result;
                existing.SalesOrderId = task.SalesOrderId; existing.SalesOrderNumber = task.SalesOrderNumber;
                existing.TaggedUserIds = task.TaggedUserIds; existing.TaggedUserNames = task.TaggedUserNames; existing.SortOrder = task.SortOrder;
            }
        }
        var uploaded = new List<DailyReportAttachment>();
        try
        {
            for (var index = 0; index < request.Tasks.Count; index++)
                uploaded.AddRange(await StoreImagesAsync(report.Id, updated[index].Id, request.Tasks[index].Images, request.Tasks[index].AttachmentCaptions, cancellationToken));
            report.Attachments.AddRange(uploaded);
            db.DailyReportAttachments.AddRange(uploaded);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch { foreach (var image in uploaded) fileStorage.Delete(image.StoredFilePath); throw; }
        foreach (var image in removedImages) fileStorage.Delete(image.StoredFilePath);
        return ToDto(report);
    }

    public async Task<bool> DeleteAsync(ReportActor actor, Guid reportId, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return false;
        db.DailyReports.Remove(report);
        await db.SaveChangesAsync(cancellationToken);
        foreach (var attachment in report.Attachments) fileStorage.Delete(attachment.StoredFilePath);
        return true;
    }

    public async Task<IReadOnlyList<DailyReportAttachmentDto>?> AddAttachmentsAsync(ReportActor actor, Guid reportId, AddReportAttachmentsRequest request, CancellationToken cancellationToken)
    {
        RejectOwnerWrite(actor);
        var report = await FindWritableAsync(actor, reportId, cancellationToken);
        if (report is null) return null;
        if (request.TaskId is null || report.Tasks.All(task => task.Id != request.TaskId))
            throw new DailyReportValidationException("Choose an activity in this report for the images.");
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
                    Id = Guid.NewGuid(), DailyReportId = report.Id, TaskId = request.TaskId, StoredFilePath = storedPath,
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
        db.DailyReportAttachments.Remove(attachment);
        report!.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        fileStorage.Delete(attachment.StoredFilePath);
        return true;
    }

    public async Task<DailyReportAttachment?> GetAttachmentAsync(ReportActor actor, Guid reportId, Guid attachmentId, CancellationToken cancellationToken)
    {
        var report = await FindReadableAsync(actor, reportId, true, cancellationToken);
        return report?.Attachments.SingleOrDefault(attachment => attachment.Id == attachmentId &&
            (actor.IsOwner || report.UserId == actor.UserId || report.Tasks.Any(task => task.Id == attachment.TaskId && task.TaggedUserIds.Contains(actor.UserId))));
    }

    private async Task<DailyReport?> FindReadableAsync(ReportActor actor, Guid reportId, bool tracked, CancellationToken cancellationToken)
    {
        IQueryable<DailyReport> query = tracked ? db.DailyReports : db.DailyReports.AsNoTracking();
        query = query.Include(report => report.Tasks).Include(report => report.Attachments);
        if (!actor.IsOwner) query = query.Where(report => report.UserId == actor.UserId || report.Tasks.Any(task => task.TaggedUserIds.Contains(actor.UserId)));
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

    private static async Task<PagedResult<DailyReportDto>> ToPagedAsync(IQueryable<DailyReport> query, int page, int pageSize, CancellationToken cancellationToken, Guid? mentionedUserId = null)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 50);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Include(report => report.Tasks).Include(report => report.Attachments)
            .OrderByDescending(report => report.ReportDate).ThenByDescending(report => report.CreatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PagedResult<DailyReportDto>(items.Select(item => ToDto(item, mentionedUserId)).ToArray(), page, pageSize, total);
    }

    private static DailyReportDto ToDto(DailyReport report, Guid? mentionedUserId = null)
    {
        var tasks = report.Tasks.Where(task => mentionedUserId is null || task.TaggedUserIds.Contains(mentionedUserId.Value)).OrderBy(task => task.SortOrder).ToArray();
        var taskIds = tasks.Select(task => task.Id).ToArray();
        return new(report.Id, report.UserId, report.UserName, report.UserRole, report.ReportDate,
            mentionedUserId is null ? report.Summary : "",
            tasks.Select(task => new DailyReportTaskDto(task.Id, task.Description, task.SortOrder, task.Target, task.Status, task.Result,
                task.SalesOrderId, task.SalesOrderNumber, task.TaggedUserIds.Select((id, index) => new ReportUserDto(id, task.TaggedUserNames.ElementAtOrDefault(index) ?? "User", "")).ToArray())).ToArray(),
            report.Attachments.Where(image => mentionedUserId is null || (image.TaskId.HasValue && taskIds.Contains(image.TaskId.Value)))
                .OrderBy(image => image.CreatedAtUtc).Select(ToDto).ToArray(), report.CreatedAtUtc, report.UpdatedAtUtc);
    }
    private static DailyReportAttachmentDto ToDto(DailyReportAttachment attachment) => new(attachment.Id, attachment.OriginalFileName, attachment.ContentType, attachment.FileSizeBytes, attachment.Caption, attachment.CreatedAtUtc, attachment.TaskId);
    private static void RejectOwnerWrite(ReportActor actor) { if (actor.IsOwner) throw new UnauthorizedAccessException(); }
    private static void ValidateReportDate(DateOnly? date) { if (date is null || date.Value != DateOnly.FromDateTime(DateTime.UtcNow)) throw new DailyReportValidationException("A daily report can only be created for today."); }
    private async Task ValidateSummaryAndTasksAsync(string summary, IReadOnlyList<ReportTaskRequest> tasks, CancellationToken cancellationToken)
    {
        if (summary.Length > 2000) throw new DailyReportValidationException("Summary must not exceed 2000 characters.");
        if (tasks.Count is < 1 or > MaxTasks) throw new DailyReportValidationException("Isi 1 sampai 20 aktivitas.");
        foreach (var task in tasks)
        {
            if (string.IsNullOrWhiteSpace(task.Description) || task.Description.Trim().Length > MaxTaskLength || task.Target.Length > 500 || task.Result.Length > 2000)
                throw new DailyReportValidationException("Uraian wajib diisi (maksimal 500 karakter), target maksimal 500, hasil maksimal 2000.");
            if (task.Status is not ("Selesai" or "On Progress" or "Pending")) throw new DailyReportValidationException("Status aktivitas tidak valid.");
            if (task.SalesOrderId == Guid.Empty || (task.SalesOrderId.HasValue && string.IsNullOrWhiteSpace(task.SalesOrderNumber)) || task.SalesOrderNumber?.Length > 100)
                throw new DailyReportValidationException("SO tidak valid.");
            if (task.TaggedUserIds.Count > 100) throw new DailyReportValidationException("Maksimal 100 user per aktivitas.");
        }
        var ids = tasks.SelectMany(task => task.TaggedUserIds).Distinct().ToArray();
        if (await db.UserAccounts.CountAsync(user => ids.Contains(user.Id) && user.Status == "Active", cancellationToken) != ids.Length)
            throw new DailyReportValidationException("User yang ditag harus merupakan user aktif.");
    }
    private async Task<List<DailyReportTask>> BuildTasksAsync(IReadOnlyList<ReportTaskRequest> tasks, CancellationToken cancellationToken)
    {
        var ids = tasks.SelectMany(task => task.TaggedUserIds).Distinct().ToArray();
        var users = await db.UserAccounts.Where(user => ids.Contains(user.Id)).ToDictionaryAsync(user => user.Id, user => user.Name, cancellationToken);
        var orderNumbers = new Dictionary<Guid, string>();
        foreach (var id in tasks.Where(task => task.SalesOrderId.HasValue).Select(task => task.SalesOrderId!.Value).Distinct())
            orderNumbers[id] = salesOrderLookup is null ? throw new DailyReportValidationException("SO lookup is unavailable.") : await salesOrderLookup.GetNumberAsync(id, cancellationToken);
        return tasks.Select((task, index) => new DailyReportTask
        {
            Id = task.Id ?? Guid.NewGuid(), Description = task.Description.Trim(), Target = task.Target.Trim(), Status = task.Status, Result = task.Result.Trim(),
            SalesOrderId = task.SalesOrderId, SalesOrderNumber = task.SalesOrderId.HasValue ? orderNumbers[task.SalesOrderId.Value] : null,
            TaggedUserIds = task.TaggedUserIds.Distinct().ToArray(), TaggedUserNames = task.TaggedUserIds.Distinct().Select(id => users[id]).ToArray(), SortOrder = index
        }).ToList();
    }
    private async Task<List<DailyReportAttachment>> StoreImagesAsync(Guid reportId, Guid taskId, IReadOnlyList<IFormFile> files, IReadOnlyList<string?> captions, CancellationToken cancellationToken)
    {
        var stored = new List<DailyReportAttachment>();
        try
        {
            for (var index = 0; index < files.Count; index++)
            {
                var file = files[index];
                var path = await fileStorage.SaveAsync(file, cancellationToken);
                stored.Add(new DailyReportAttachment { Id = Guid.NewGuid(), DailyReportId = reportId, TaskId = taskId, StoredFilePath = path,
                    OriginalFileName = Path.GetFileName(file.FileName), ContentType = file.ContentType, FileSizeBytes = file.Length,
                    Caption = GetCaption(captions, index), CreatedAtUtc = DateTime.UtcNow });
            }
            return stored;
        }
        catch { foreach (var image in stored) fileStorage.Delete(image.StoredFilePath); throw; }
    }
    private static void ValidateAttachmentRequest(IReadOnlyCollection<IFormFile> images, IReadOnlyList<string?> captions, int existingCount)
    {
        if (images.Count == 0 && captions.Count > 0) throw new DailyReportValidationException("Captions require an uploaded image.");
        if (images.Count + existingCount > MaxAttachments || captions.Count > images.Count || captions.Any(caption => caption?.Trim().Length > MaxCaptionLength)) throw new DailyReportValidationException("A report supports up to 5 images with captions of up to 500 characters.");
    }
    private static string? GetCaption(IReadOnlyList<string?> captions, int index) => index < captions.Count && !string.IsNullOrWhiteSpace(captions[index]) ? captions[index]!.Trim() : null;
}
