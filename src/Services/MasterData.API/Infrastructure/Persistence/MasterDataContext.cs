using Microsoft.EntityFrameworkCore;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Infrastructure.Persistence;

public sealed class MasterDataContext(DbContextOptions<MasterDataContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(builder =>
        {
            builder.ToTable("customers");
            builder.HasKey(customer => customer.Id);
            builder.HasIndex(customer => customer.Code).IsUnique();
            builder.Property(customer => customer.Code).HasMaxLength(40).HasColumnName("code");
            builder.Property(customer => customer.Name).HasMaxLength(160).HasColumnName("name");
            builder.Property(customer => customer.Address).HasMaxLength(400).HasColumnName("address");
            builder.Property(customer => customer.ContactPerson).HasMaxLength(120).HasColumnName("contact_person");
            builder.Property(customer => customer.IsActive).HasColumnName("is_active");
            builder.Property(customer => customer.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(customer => customer.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<Product>(builder =>
        {
            builder.ToTable("products");
            builder.HasKey(product => product.Id);
            builder.HasIndex(product => product.PartNumber).IsUnique();
            builder.Property(product => product.PartNumber).HasMaxLength(100).HasColumnName("part_number");
            builder.Property(product => product.Description).HasColumnName("description");
            builder.Property(product => product.Unit).HasMaxLength(24).HasColumnName("unit");
            builder.Property(product => product.MaterialSpec).HasMaxLength(255).HasColumnName("material_spec");
            builder.Property(product => product.IsActive).HasColumnName("is_active");
            builder.Property(product => product.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(product => product.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
