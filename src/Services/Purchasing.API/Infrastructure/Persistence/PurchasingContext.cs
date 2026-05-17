using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Purchasing.Api.Domain.Entities;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Purchasing.Api.Infrastructure.Persistence;

public sealed class PurchasingContext(DbContextOptions<PurchasingContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestItem> PurchaseRequestItems => Set<PurchaseRequestItem>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PurchaseRequest>(builder =>
        {
            builder.ToTable("purchase_requests");
            builder.HasKey(request => request.Id);
            builder.HasIndex(request => request.PrNumber).IsUnique();
            builder.Property(request => request.PrNumber).HasMaxLength(100).HasColumnName("pr_number");
            builder.Property(request => request.RequestDate).HasColumnName("request_date");
            builder.Property(request => request.RequestedByUserId).HasColumnName("requested_by_user_id");
            builder.Property(request => request.RequesterName).HasMaxLength(160).HasColumnName("requester_name");
            builder.Property(request => request.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(request => request.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
            builder.Property(request => request.ReviewedAtUtc).HasColumnName("reviewed_at_utc");
            builder.Property(request => request.RejectionReason).HasColumnName("rejection_reason");
            builder.Property(request => request.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(request => request.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasMany(request => request.Items)
                .WithOne(item => item.PurchaseRequest)
                .HasForeignKey(item => item.PurchaseRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PurchaseRequestItem>(builder =>
        {
            builder.ToTable("purchase_request_items");
            builder.HasKey(item => item.Id);
            builder.Property(item => item.PurchaseRequestId).HasColumnName("purchase_request_id");
            builder.Property(item => item.ItemName).HasMaxLength(255).HasColumnName("item_name");
            builder.Property(item => item.Size).HasMaxLength(100).HasColumnName("size");
            builder.Property(item => item.Qty).HasColumnName("qty");
            builder.Property(item => item.SuggestedSupplier).HasMaxLength(255).HasColumnName("suggested_supplier");
            builder.Property(item => item.Notes).HasColumnName("notes");
            builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(item => item.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
