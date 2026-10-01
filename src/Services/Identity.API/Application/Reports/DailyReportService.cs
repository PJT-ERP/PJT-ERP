using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;

namespace PJT_ERP.Identity.Api.Application.Reports;

public sealed class DailyReportService(IdentityContext dbContext, IWebHostEnvironment environment) : IDailyReportService
{
    public async Task<DailyReportDto> CreateReportAsync(Guid userId, CreateReportRequest request, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.UserAccounts.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null) throw new Exception("User not found");

        string? photoUrl = null;
        if (request.Photo is not null && request.Photo.Length > 0)
        {
            var uploadsFolder = Path.Combine(environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "reports");
            Directory.CreateDirectory(uploadsFolder);
            var uniqueFileName = $"{Guid.NewGuid()}_{request.Photo.FileName}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);
            
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Photo.CopyToAsync(stream, cancellationToken);
            }
            photoUrl = $"/uploads/reports/{uniqueFileName}";
        }

        var report = new DailyReport
        {
            UserId = user.Id,
            UserName = user.Name,
            UserRole = user.Role,
            Description = request.Description,
            PhotoUrl = photoUrl,
            ReportDate = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.DailyReports.Add(report);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(report);
    }

    public async Task<IReadOnlyCollection<DailyReportDto>> GetMyReportsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var reports = await dbContext.DailyReports
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.ReportDate)
            .ToListAsync(cancellationToken);

        return reports.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyCollection<DailyReportDto>> GetAllReportsAsync(CancellationToken cancellationToken = default)
    {
        var reports = await dbContext.DailyReports
            .AsNoTracking()
            .OrderByDescending(r => r.ReportDate)
            .ToListAsync(cancellationToken);

        return reports.Select(MapToDto).ToList();
    }

    private static DailyReportDto MapToDto(DailyReport report) => new()
    {
        Id = report.Id,
        UserId = report.UserId,
        UserName = report.UserName,
        UserRole = report.UserRole,
        Description = report.Description,
        PhotoUrl = report.PhotoUrl,
        ReportDate = report.ReportDate,
        CreatedAtUtc = report.CreatedAtUtc
    };
}
