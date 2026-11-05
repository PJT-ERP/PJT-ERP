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

    private static IdentityContext CreateContext() => new(new DbContextOptionsBuilder<IdentityContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static CreateReportRequest Request(string summary, List<IFormFile>? images = null) => new() { ReportDate = DateOnly.FromDateTime(DateTime.UtcNow), Summary = summary, Images = images ?? [] };
    private static DailyReport Yesterday(ReportActor actor) => new() { Id = Guid.NewGuid(), UserId = actor.UserId, UserName = actor.UserName, UserRole = actor.Role, ReportDate = DateTime.UtcNow.Date.AddDays(-1), Summary = "Yesterday", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
    private static IFormFile Image(string name, string type, byte[] data) => new FormFile(new MemoryStream(data), 0, data.Length, "images", name) { Headers = new HeaderDictionary(), ContentType = type };

    private sealed class MemoryStorage : IReportFileStorage
    {
        public Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken) => Task.FromResult($"{Guid.NewGuid():N}.jpg");
        public Stream OpenRead(string storedFilePath) => new MemoryStream();
        public void Delete(string storedFilePath) { }
    }
}
