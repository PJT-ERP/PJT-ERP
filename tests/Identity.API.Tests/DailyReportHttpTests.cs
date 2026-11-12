using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PJT_ERP.Identity.Api.Application.Reports;
using PJT_ERP.Identity.Api.Controllers;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;

namespace Identity.API.Tests;

public sealed class DailyReportHttpTests
{
    [Fact]
    public async Task MultipartCreateAndUpdate_BindOptionalSummaryStructuredActivitiesAndPhotos()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("test", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(DailyReportsController).Assembly);
        var database = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<IdentityContext>(options => options.UseInMemoryDatabase(database));
        builder.Services.AddScoped<IDailyReportService, DailyReportService>();
        builder.Services.AddSingleton<IReportFileStorage, TestStorage>();
        await using var app = builder.Build();
        app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        await app.StartAsync();
        try
        {
            var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            using var client = new HttpClient { BaseAddress = new Uri(address) };
            using var create = Form("Initial work");
            create.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM-dd")), "reportDate");
            using var response = await client.PostAsync("/api/v1/reports", create);
            Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
            var report = (await response.Content.ReadFromJsonAsync<DailyReportDto>())!;
            Assert.Empty(report.Summary); Assert.Single(report.Tasks); Assert.Single(report.Attachments);
            Assert.Equal(report.Tasks[0].Id, report.Attachments[0].TaskId);
            using var update = Form("Updated work");
            update.Add(new StringContent(report.Tasks[0].Id.ToString()), "tasks[0].id");
            update.Add(new StringContent(report.Attachments[0].Id.ToString()), "removedAttachmentIds");
            using var updatedResponse = await client.PutAsync($"/api/v1/reports/{report.Id}", update);
            Assert.True(updatedResponse.IsSuccessStatusCode, await updatedResponse.Content.ReadAsStringAsync());
            var updated = (await updatedResponse.Content.ReadFromJsonAsync<DailyReportDto>())!;
            Assert.Equal("Updated work", updated.Tasks[0].Description);
            Assert.Equal(report.Tasks[0].Id, updated.Tasks[0].Id);
            Assert.Single(updated.Attachments); Assert.NotEqual(report.Attachments[0].Id, updated.Attachments[0].Id);
            // Owner is a different user and must be able to read reports without a tag.
            using var ownerListRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/reports");
            ownerListRequest.Headers.Add("X-Test-Role", "Owner");
            using var ownerListResponse = await client.SendAsync(ownerListRequest);
            Assert.True(ownerListResponse.IsSuccessStatusCode, await ownerListResponse.Content.ReadAsStringAsync());
            var ownerReports = (await ownerListResponse.Content.ReadFromJsonAsync<PagedResult<DailyReportDto>>())!;
            Assert.Equal(report.Id, Assert.Single(ownerReports.Items).Id);
            using var ownerDetailRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/reports/{report.Id}");
            ownerDetailRequest.Headers.Add("X-Test-Role", "Owner");
            using var ownerDetailResponse = await client.SendAsync(ownerDetailRequest);
            Assert.True(ownerDetailResponse.IsSuccessStatusCode, await ownerDetailResponse.Content.ReadAsStringAsync());
            var ownerDetail = (await ownerDetailResponse.Content.ReadFromJsonAsync<DailyReportDto>())!;
            Assert.Single(ownerDetail.Tasks); Assert.Single(ownerDetail.Attachments);
            using var ownerRequest = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/reports/{report.Id}");
            ownerRequest.Headers.Add("X-Test-Role", "Owner");
            using var forbidden = await client.SendAsync(ownerRequest);
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }
        finally { await app.StopAsync(); }
    }

    [Fact]
    public void PostgresMigrationAndMentionQuery_CanBeGeneratedWithoutConnectingToDatabase()
    {
        using var db = new IdentityContext(new DbContextOptionsBuilder<IdentityContext>().UseNpgsql("Host=localhost;Database=unused;Username=unused").Options);
        var script = db.GetService<IMigrator>().GenerateScript("20261002000000_AddDailyReports", "20261107000000_AddReportActivities");
        Assert.Contains("uuid[]", script); Assert.Contains("TaskId", script); Assert.Contains("FOREIGN KEY", script);
        var userId = Guid.NewGuid();
        var sql = db.DailyReports.Where(report => report.Tasks.Any(task => task.TaggedUserIds.Contains(userId))).ToQueryString();
        Assert.Contains("TaggedUserIds", sql);
    }

    private static MultipartFormDataContent Form(string description)
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(""), "summary");
        form.Add(new StringContent(description), "tasks[0].description");
        form.Add(new StringContent("Pending"), "tasks[0].status");
        var image = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0]);
        image.Headers.ContentType = new("image/jpeg");
        form.Add(image, "tasks[0].images", "photo.jpg");
        form.Add(new StringContent("Evidence"), "tasks[0].attachmentCaptions");
        return form;
    }
    private sealed class TestStorage : IReportFileStorage
    {
        public Task<string> SaveAsync(Microsoft.AspNetCore.Http.IFormFile file, CancellationToken cancellationToken) => Task.FromResult(Guid.NewGuid().ToString());
        public Stream OpenRead(string storedFilePath) => new MemoryStream();
        public void Delete(string storedFilePath) { }
    }
    private sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, Request.Headers["X-Test-Role"].FirstOrDefault() == "Owner" ? "22222222-2222-2222-2222-222222222222" : "11111111-1111-1111-1111-111111111111"), new Claim(ClaimTypes.Name, "Test User"), new Claim(ClaimTypes.Role, Request.Headers["X-Test-Role"].FirstOrDefault() ?? "Sales") };
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, "test")), "test")));
        }
    }
}
