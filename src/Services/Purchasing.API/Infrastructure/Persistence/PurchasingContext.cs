using Microsoft.EntityFrameworkCore;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Infrastructure.Persistence;

public sealed class PurchasingContext(DbContextOptions<PurchasingContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<SalesOrderSnapshot> SalesOrderSnapshots => Set<SalesOrderSnapshot>();
    public DbSet<MaterialRequirement> MaterialRequirements => Set<MaterialRequirement>();
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestItem> PurchaseRequestItems => Set<PurchaseRequestItem>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SalesOrderSnapshot>(builder =>
        {
            builder.ToTable("sales_order_snapshots");
            builder.HasKey(order => order.SalesOrderId);
            builder.Property(order => order.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(order => order.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(order => order.CustomerId).HasColumnName("customer_id");
            builder.Property(order => order.ConfirmedAtUtc).HasColumnName("confirmed_at_utc");
            builder.Property(order => order.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(order => order.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasMany(order => order.MaterialRequirements)
                .WithOne(requirement => requirement.SalesOrder)
                .HasForeignKey(requirement => requirement.SalesOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MaterialRequirement>(builder =>
        {
            builder.ToTable("material_requirements");
            builder.HasKey(requirement => requirement.Id);
            builder.HasIndex(requirement => requirement.ProductionOrderId);
            builder.HasIndex(requirement => new { requirement.ProductionOrderId, requirement.ProductId });
            builder.HasIndex(requirement => requirement.SalesOrderId);
            builder.Property(requirement => requirement.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(requirement => requirement.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(requirement => requirement.ProductionOrderId).HasColumnName("production_order_id");
            builder.Property(requirement => requirement.SalesOrderItemId).HasColumnName("sales_order_item_id");
            builder.Property(requirement => requirement.SpkNumber).HasMaxLength(100).HasColumnName("spk_number");
            builder.Property(requirement => requirement.BarcodeUid).HasMaxLength(255).HasColumnName("barcode_uid");
            builder.Property(requirement => requirement.ProductId).HasColumnName("product_id");
            builder.Property(requirement => requirement.ProductPartNumber).HasMaxLength(100).HasColumnName("product_part_number");
            builder.Property(requirement => requirement.ProductDescription).HasColumnName("product_description");
            builder.Property(requirement => requirement.MaterialSpec).HasMaxLength(255).HasColumnName("material_spec");
            builder.Property(requirement => requirement.RequiredQty).HasColumnName("required_qty");
            builder.Property(requirement => requirement.StockOnHand).HasColumnName("stock_on_hand");
            builder.Property(requirement => requirement.StockNotes).HasColumnName("stock_notes");
            builder.Property(requirement => requirement.StockUpdatedAtUtc).HasColumnName("stock_updated_at_utc");
            builder.Property(requirement => requirement.ProjectName).HasMaxLength(255).HasColumnName("project_name");
            builder.Property(requirement => requirement.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(requirement => requirement.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(requirement => requirement.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<PurchaseRequest>(builder =>
        {
            builder.ToTable("purchase_requests");
            builder.HasKey(request => request.Id);
            builder.HasIndex(request => request.PrNumber).IsUnique();
            builder.Property(request => request.PrNumber).HasMaxLength(100).HasColumnName("pr_number");
            builder.Property(request => request.RequestDate).HasColumnName("request_date");
            builder.Property(request => request.RequestedByUserId).HasColumnName("requested_by_user_id");
            builder.Property(request => request.RequesterName).HasMaxLength(160).HasColumnName("requester_name");
            builder.Property(request => request.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(request => request.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(request => request.ProjectName).HasMaxLength(255).HasColumnName("project_name");
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
            builder.Property(item => item.MaterialRequirementId).HasColumnName("material_requirement_id");
            builder.Property(item => item.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(item => item.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(item => item.ProductionOrderId).HasColumnName("production_order_id");
            builder.Property(item => item.SpkNumber).HasMaxLength(100).HasColumnName("spk_number");
            builder.Property(item => item.ProjectName).HasMaxLength(255).HasColumnName("project_name");
            builder.Property(item => item.ItemName).HasMaxLength(255).HasColumnName("item_name");
            builder.Property(item => item.Size).HasMaxLength(100).HasColumnName("size");
            builder.Property(item => item.Qty).HasColumnName("qty");
            builder.Property(item => item.Urgency).HasMaxLength(30).HasColumnName("urgency");
            builder.Property(item => item.PurchaseCategory).HasMaxLength(50).HasColumnName("purchase_category");
            builder.Property(item => item.SuggestedSupplier).HasMaxLength(255).HasColumnName("suggested_supplier");
            builder.Property(item => item.SupplierName).HasMaxLength(255).HasColumnName("supplier_name");
            builder.Property(item => item.PoNumber).HasMaxLength(100).HasColumnName("po_number");
            builder.Property(item => item.EstimatedPrice).HasColumnType("numeric(18,2)").HasColumnName("estimated_price");
            builder.Property(item => item.TotalPrice).HasColumnType("numeric(18,2)").HasColumnName("total_price");
            builder.Property(item => item.PurchaseDate).HasColumnName("purchase_date");
            builder.Property(item => item.ExpectedArrivalDate).HasColumnName("expected_arrival_date");
            builder.Property(item => item.ReceivedDate).HasColumnName("received_date");
            builder.Property(item => item.PurchaseStatus).HasMaxLength(50).HasColumnName("purchase_status");
            builder.Property(item => item.PurchaseNotes).HasColumnName("purchase_notes");
            builder.Property(item => item.RejectionReason).HasColumnName("rejection_reason");
            builder.Property(item => item.Notes).HasColumnName("notes");
            builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(item => item.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasOne(item => item.MaterialRequirement)
                .WithMany(requirement => requirement.PurchaseRequestItems)
                .HasForeignKey(item => item.MaterialRequirementId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
