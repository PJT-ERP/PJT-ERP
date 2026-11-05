using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence;

public sealed class IdentityContext(DbContextOptions<IdentityContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<DailyReport> DailyReports => Set<DailyReport>();
    public DbSet<DailyReportTask> DailyReportTasks => Set<DailyReportTask>();
    public DbSet<DailyReportAttachment> DailyReportAttachments => Set<DailyReportAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccount>(builder =>
        {
            builder.ToTable("user_accounts");
            builder.HasKey(user => user.Id);
            builder.HasIndex(user => user.Email).IsUnique();
            builder.Property(user => user.Id).HasColumnName("id");
            builder.Property(user => user.Name).HasMaxLength(255).HasColumnName("name");
            builder.Property(user => user.Email).HasMaxLength(160).HasColumnName("email");
            builder.Property(user => user.Role).HasMaxLength(120).HasColumnName("role");
            builder.Property(user => user.Department).HasMaxLength(80).HasColumnName("department");
            builder.Property(user => user.JoinDateUtc).HasColumnName("join_date_utc");
            builder.Property(user => user.LastActiveAtUtc).HasColumnName("last_active_at_utc");
            builder.Property(user => user.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(user => user.PasswordHash).HasMaxLength(255).HasColumnName("password_hash");
            builder.Property(user => user.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(user => user.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.Ignore(user => user.IsActive);
            builder.Ignore(user => user.RoleList);
        });

        modelBuilder.Entity<DailyReport>(builder =>
        {
            builder.ToTable("daily_reports");
            builder.HasKey(report => report.Id);
            builder.HasIndex(report => new { report.UserId, report.ReportDate }).IsUnique();
            builder.Property(report => report.UserName).HasMaxLength(255).IsRequired();
            builder.Property(report => report.UserRole).HasMaxLength(120).IsRequired();
            builder.Property(report => report.Summary).HasMaxLength(2000).IsRequired();
            builder.HasMany(report => report.Tasks).WithOne(task => task.DailyReport).HasForeignKey(task => task.DailyReportId).OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(report => report.Attachments).WithOne(attachment => attachment.DailyReport).HasForeignKey(attachment => attachment.DailyReportId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DailyReportTask>(builder =>
        {
            builder.ToTable("daily_report_tasks");
            builder.HasKey(task => task.Id);
            builder.Property(task => task.Description).HasMaxLength(500).IsRequired();
        });

        modelBuilder.Entity<DailyReportAttachment>(builder =>
        {
            builder.ToTable("daily_report_attachments");
            builder.HasKey(attachment => attachment.Id);
            builder.Property(attachment => attachment.StoredFilePath).HasMaxLength(255).IsRequired();
            builder.Property(attachment => attachment.OriginalFileName).HasMaxLength(255).IsRequired();
            builder.Property(attachment => attachment.ContentType).HasMaxLength(100).IsRequired();
            builder.Property(attachment => attachment.Caption).HasMaxLength(500);
        });
    }
}
