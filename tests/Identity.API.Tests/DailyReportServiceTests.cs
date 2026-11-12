using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using PJT_ERP.Identity.Api.Application.Reports;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;

namespace Identity.API.Tests;

public sealed class DailyReportServiceTests
{
    private static readonly ReportActor UserA = new(Guid.NewGuid(), "User A", "Sales");
    private static readonly ReportActor UserB = new(Guid.NewGuid(), "User B", "Finance");
    private static readonly ReportActor Owner = new(Guid.NewGuid(), "Owner", "Owner");

    [Fact]
    public async Task CreateAsync_CreatesReport_WithAndWithoutImages()
    {
        await using var context = CreateContext();
        var service = new DailyReportService(context, new MemoryStorage());
        var created = await service.CreateAsync(UserA, Request("Work completed"), CancellationToken.None);
        Assert.Equal("Work completed", created.Summary);

        await using var secondContext = CreateContext();
        var secondService = new DailyReportService(secondContext, new MemoryStorage());
        var image = Image("photo.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF, 0x00]);
        var nextUser = new ReportActor(Guid.NewGuid(), "User C", "Sales");
        var withImage = await secondService.CreateAsync(nextUser, Request("With image", [image]), CancellationToken.None);
        Assert.Single(withImage.Attachments);
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateReportForTheSameDay()
    {
        await using var context = CreateContext();
        var service = new DailyReportService(context, new MemoryStorage());
        await service.CreateAsync(UserA, Request("First"), CancellationToken.None);
        await Assert.ThrowsAsync<DuplicateDailyReportException>(() => service.CreateAsync(UserA, Request("Second"), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAndDelete_RejectReportsFromAnotherDay()
    {
        await using var context = CreateContext();
        var report = Yesterday(UserA);
        context.DailyReports.Add(report);
        await context.SaveChangesAsync();
        var service = new DailyReportService(context, new MemoryStorage());
        await Assert.ThrowsAsync<DailyReportValidationException>(() => service.UpdateAsync(UserA, report.Id, new UpdateReportRequest { Summary = "Changed" }, CancellationToken.None));
        await Assert.ThrowsAsync<DailyReportValidationException>(() => service.DeleteAsync(UserA, report.Id, CancellationToken.None));
    }

    [Fact]
    public async Task OwnerIsBlockedFromEveryWriteOperation()
    {
        await using var context = CreateContext();
        var service = new DailyReportService(context, new MemoryStorage());
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreateAsync(Owner, Request("Blocked"), CancellationToken.None));
    }

    [Fact]
    public async Task UserCannotReadAnotherUsersReportOrAttachment()
    {
        await using var context = CreateContext();
        var report = Yesterday(UserA);
        report.Attachments.Add(new DailyReportAttachment { Id = Guid.NewGuid(), DailyReportId = report.Id, StoredFilePath = "file.jpg", OriginalFileName = "file.jpg", ContentType = "image/jpeg", FileSizeBytes = 3, CreatedAtUtc = DateTime.UtcNow });
        context.DailyReports.Add(report);
        await context.SaveChangesAsync();
        var service = new DailyReportService(context, new MemoryStorage());
        Assert.Null(await service.GetByIdAsync(UserB, report.Id, CancellationToken.None));
        Assert.Null(await service.GetAttachmentAsync(UserB, report.Id, report.Attachments[0].Id, CancellationToken.None));
    }

    [Fact]
    public async Task AttachmentValidation_RejectsFakeJpgWrongMimeOversizeAndMoreThanFive()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        try
        {
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DailyReportUploads:RootPath"] = root }).Build();
            var environment = new Mock<IWebHostEnvironment>(); environment.SetupGet(item => item.ContentRootPath).Returns(root);
            var storage = new LocalReportFileStorage(configuration, environment.Object);
            await Assert.ThrowsAsync<DailyReportValidationException>(() => storage.SaveAsync(Image("fake.jpg", "image/jpeg", [0x4D, 0x5A]), CancellationToken.None));
            await Assert.ThrowsAsync<DailyReportValidationException>(() => storage.SaveAsync(Image("wrong.jpg", "application/octet-stream", [0xFF, 0xD8, 0xFF]), CancellationToken.None));
            await Assert.ThrowsAsync<DailyReportValidationException>(() => storage.SaveAsync(Image("large.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]), CancellationToken.None));

            await using var context = CreateContext();
            var service = new DailyReportService(context, new MemoryStorage());
            var images = Enumerable.Range(0, 6).Select(index => Image($"{index}.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])).ToList();
            await Assert.ThrowsAsync<DailyReportValidationException>(() => service.CreateAsync(UserA, Request("Too many", images), CancellationToken.None));
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }

    [Fact]
    public async Task MentionedUser_OnlySeesTaggedActivityAndItsImages_AndCannotWrite()
    {
        await using var db = CreateContext();
        db.UserAccounts.Add(new UserAccount { Id = UserB.UserId, Name = UserB.UserName });
        await db.SaveChangesAsync();
        var service = new DailyReportService(db, new MemoryStorage());
        var created = await service.CreateAsync(UserA, new CreateReportRequest
        {
            ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Summary = "Private summary",
            Tasks = [new() { Description = "Shared", TaggedUserIds = [UserB.UserId], Images = [Image("shared.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])] },
                new() { Description = "Private", Images = [Image("private.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])] }]
        }, CancellationToken.None);
        // A pre-existing report-level image must never become visible through a tag.
        var legacy = new DailyReportAttachment { Id = Guid.NewGuid(), DailyReportId = created.Id, StoredFilePath = "legacy.jpg", OriginalFileName = "legacy.jpg", ContentType = "image/jpeg" };
        db.DailyReportAttachments.Add(legacy); await db.SaveChangesAsync();
        var visible = await service.GetByIdAsync(UserB, created.Id, CancellationToken.None);
        Assert.NotNull(visible); Assert.Empty(visible.Summary);
        Assert.Equal("Shared", Assert.Single(visible.Tasks).Description);
        Assert.Equal("shared.jpg", Assert.Single(visible.Attachments).OriginalFileName);
        Assert.NotNull(await service.GetAttachmentAsync(UserB, created.Id, visible.Attachments[0].Id, CancellationToken.None));
        Assert.Null(await service.GetAttachmentAsync(UserB, created.Id, created.Attachments.Single(image => image.OriginalFileName == "private.jpg").Id, CancellationToken.None));
        Assert.Null(await service.GetAttachmentAsync(UserB, created.Id, legacy.Id, CancellationToken.None));
        var mentioned = await service.GetMentionedAsync(UserB, 1, 10, CancellationToken.None);
        Assert.Single(Assert.Single(mentioned.Items).Tasks);
        Assert.Empty((await service.GetMineAsync(UserB, 1, 10, CancellationToken.None)).Items);
        Assert.Null(await service.UpdateAsync(UserB, created.Id, new UpdateReportRequest { Tasks = [new() { Description = "Unauthorized" }] }, CancellationToken.None));
        Assert.False(await service.DeleteAsync(UserB, created.Id, CancellationToken.None));
        Assert.False(await service.DeleteAttachmentAsync(UserB, created.Id, visible.Attachments[0].Id, CancellationToken.None));
        Assert.Null(await service.AddAttachmentsAsync(UserB, created.Id, new AddReportAttachmentsRequest { TaskId = visible.Tasks[0].Id }, CancellationToken.None));
        var ownerView = await service.GetByIdAsync(Owner, created.Id, CancellationToken.None);
        Assert.Equal(2, ownerView!.Tasks.Count); Assert.Equal(3, ownerView.Attachments.Count); Assert.Equal("Private summary", ownerView.Summary);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateAsync(Owner, created.Id, new UpdateReportRequest(), CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteAsync(Owner, created.Id, CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.AddAttachmentsAsync(Owner, created.Id, new AddReportAttachmentsRequest(), CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteAttachmentAsync(Owner, created.Id, visible.Attachments[0].Id, CancellationToken.None));
        await service.UpdateAsync(UserA, created.Id, new UpdateReportRequest { Tasks = created.Tasks.Select(task => new ReportTaskRequest { Id = task.Id, Description = task.Description }).ToList() }, CancellationToken.None);
        Assert.Null(await service.GetByIdAsync(UserB, created.Id, CancellationToken.None));
        Assert.Null(await service.GetAttachmentAsync(UserB, created.Id, visible.Attachments[0].Id, CancellationToken.None));
        Assert.Empty((await service.GetMentionedAsync(UserB, 1, 10, CancellationToken.None)).Items);
    }

    [Fact]
    public async Task Update_PreservesActivityIdsAndPhotos_AndRemovesDeletedActivityPhotos()
    {
        await using var db = CreateContext();
        var storage = new MemoryStorage();
        var service = new DailyReportService(db, storage);
        var report = await service.CreateAsync(UserA, new CreateReportRequest { ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Tasks = [
            new() { Description = "Keep", Images = [Image("keep.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])] },
            new() { Description = "Remove", Images = [Image("remove.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])] }] }, CancellationToken.None);
        var keep = report.Tasks[0];
        var updated = await service.UpdateAsync(UserA, report.Id, new UpdateReportRequest { Tasks = [
            new() { Id = keep.Id, Description = "Updated", Status = "Selesai" },
            new() { Description = "Added", Images = [Image("added.jpg", "image/jpeg", [0xFF, 0xD8, 0xFF])] }] }, CancellationToken.None);
        Assert.Equal(keep.Id, updated!.Tasks[0].Id);
        Assert.Equal("Selesai", updated.Tasks[0].Status);
        Assert.Equal(2, updated.Attachments.Count);
        Assert.Contains(updated.Attachments, image => image.Id == report.Attachments.Single(item => item.TaskId == keep.Id).Id);
        Assert.DoesNotContain(updated.Attachments, image => image.OriginalFileName == "remove.jpg");
        Assert.Single(storage.Deleted);
        db.ChangeTracker.Clear();
        var reloaded = await service.GetByIdAsync(UserA, report.Id, CancellationToken.None);
        Assert.Equal(2, reloaded!.Tasks.Count); Assert.Equal(2, reloaded.Attachments.Count);
    }

    [Fact]
    public async Task Create_InvalidSecondUpload_DoesNotPersistPartialReportOrLeaveFirstFile()
    {
        await using var db = CreateContext();
        var storage = new MemoryStorage { FailOnSave = 2 };
        var service = new DailyReportService(db, storage);
        await Assert.ThrowsAsync<DailyReportValidationException>(() => service.CreateAsync(UserA, new CreateReportRequest
        {
            ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Tasks = [new() { Description = "First", Images = [Image("one.jpg", "image/jpeg", [1])] }, new() { Description = "Second", Images = [Image("two.jpg", "image/jpeg", [1])] }]
        }, CancellationToken.None));
        Assert.Empty(await db.DailyReports.ToListAsync()); Assert.Single(storage.Deleted);
    }

    [Fact]
    public async Task Validation_RejectsUnknownTagsStatusAndForeignActivityIds()
    {
        await using var db = CreateContext(); var service = new DailyReportService(db, new MemoryStorage());
        foreach (var task in new ReportTaskRequest[] { new() { Description = "" }, new() { Description = "Task", Status = "Invalid" }, new() { Description = "Task", TaggedUserIds = [Guid.NewGuid()] } })
            await Assert.ThrowsAsync<DailyReportValidationException>(() => service.CreateAsync(UserA, new CreateReportRequest { ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Tasks = [task] }, CancellationToken.None));
        var report = await service.CreateAsync(UserA, Request(""), CancellationToken.None);
        await Assert.ThrowsAsync<DailyReportValidationException>(() => service.UpdateAsync(UserA, report.Id, new UpdateReportRequest { Tasks = [new() { Id = Guid.NewGuid(), Description = "Foreign ID" }] }, CancellationToken.None));
        await Assert.ThrowsAsync<DailyReportValidationException>(() => service.AddAttachmentsAsync(UserA, report.Id, new AddReportAttachmentsRequest { TaskId = Guid.NewGuid(), Images = [Image("bad.jpg", "image/jpeg", [1])] }, CancellationToken.None));
    }

    [Fact]
    public async Task SalesOrderNumber_IsResolvedByServer_AndDoesNotTrustSubmittedLabel()
    {
        await using var db = CreateContext(); var lookup = new Mock<IReportSalesOrderLookup>(); var id = Guid.NewGuid();
        lookup.Setup(item => item.GetNumberAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync("SO-001");
        var service = new DailyReportService(db, new MemoryStorage(), lookup.Object);
        var report = await service.CreateAsync(UserA, new CreateReportRequest { ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Tasks = [new() { Description = "Follow up", SalesOrderId = id, SalesOrderNumber = "Forged label" }] }, CancellationToken.None);
        Assert.Equal(id, report.Tasks[0].SalesOrderId); Assert.Equal("SO-001", report.Tasks[0].SalesOrderNumber);
    }

    private static IdentityContext CreateContext() => new(new DbContextOptionsBuilder<IdentityContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static CreateReportRequest Request(string summary, List<IFormFile>? images = null) => new() { ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Summary = summary, Tasks = [new ReportTaskRequest { Description = "Daily activity", Images = images ?? [] }] };
    private static DailyReport Yesterday(ReportActor actor) => new() { Id = Guid.NewGuid(), UserId = actor.UserId, UserName = actor.UserName, UserRole = actor.Role, ReportDate = DateTime.UtcNow.Date.AddDays(-1), Summary = "Yesterday", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
    private static IFormFile Image(string name, string type, byte[] data) => new FormFile(new MemoryStream(data), 0, data.Length, "images", name) { Headers = new HeaderDictionary(), ContentType = type };

    private sealed class MemoryStorage : IReportFileStorage
    {
        public List<string> Deleted { get; } = [];
        public int FailOnSave { get; init; }
        private int saves;
        public Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken)
        {
            if (++saves == FailOnSave) throw new DailyReportValidationException("Invalid image");
            return Task.FromResult($"{Guid.NewGuid():N}.jpg");
        }
        public Stream OpenRead(string storedFilePath) => new MemoryStream();
        public void Delete(string storedFilePath) { Deleted.Add(storedFilePath); }
    }
}
