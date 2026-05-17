using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Identity.Api.Domain.Entities;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;

namespace PJT_HIMTIKA.Identity.Api.Infrastructure.Persistence;

public sealed class IdentityContext(DbContextOptions<IdentityContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();

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
            builder.Property(user => user.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(user => user.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.Ignore(user => user.IsActive);
            builder.Ignore(user => user.RoleList);
        });
    }
}
