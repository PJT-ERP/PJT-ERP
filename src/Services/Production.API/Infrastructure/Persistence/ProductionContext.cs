using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Production.Api.Domain.Entities;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Production.Api.Infrastructure.Persistence;

public sealed class ProductionContext(DbContextOptions<ProductionContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<CustomerReplica> CustomerReplicas => Set<CustomerReplica>();
    public DbSet<ProductReplica> ProductReplicas => Set<ProductReplica>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();
    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CustomerReplica>(builder =>
        {
            builder.ToTable("customer_replicas");
            builder.HasKey(customer => customer.Id);
            builder.HasIndex(customer => customer.Code);
            builder.Property(customer => customer.Code).HasMaxLength(50).HasColumnName("code");
            builder.Property(customer => customer.Name).HasMaxLength(255).HasColumnName("name");
            builder.Property(customer => customer.IsActive).HasColumnName("is_active");
            builder.Property(customer => customer.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<ProductReplica>(builder =>
        {
            builder.ToTable("product_replicas");
            builder.HasKey(product => product.Id);
            builder.HasIndex(product => product.PartNumber);
            builder.Property(product => product.PartNumber).HasMaxLength(100).HasColumnName("part_number");
            builder.Property(product => product.Description).HasColumnName("description");
            builder.Property(product => product.Unit).HasMaxLength(30).HasColumnName("unit");
            builder.Property(product => product.MaterialSpec).HasColumnName("material_spec");
            builder.Property(product => product.IsActive).HasColumnName("is_active");
            builder.Property(product => product.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<SalesOrder>(builder =>
        {
            builder.ToTable("sales_orders");
            builder.HasKey(order => order.Id);
            builder.HasIndex(order => order.SoNumber).IsUnique();
            builder.Property(order => order.SoNumber).HasMaxLength(100).HasColumnName("so_number");
            builder.Property(order => order.CustomerId).HasColumnName("customer_id");
            builder.Property(order => order.CustomerCode).HasMaxLength(50).HasColumnName("customer_code");
            builder.Property(order => order.CustomerName).HasMaxLength(255).HasColumnName("customer_name");
            builder.Property(order => order.SoDate).HasColumnName("so_date");
            builder.Property(order => order.TargetDate).HasColumnName("target_date");
            builder.Property(order => order.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(order => order.ApprovedByUserId).HasColumnName("approved_by_user_id");
            builder.Property(order => order.ApprovedAtUtc).HasColumnName("approved_at_utc");
            builder.Property(order => order.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(order => order.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasMany(order => order.Items)
                .WithOne(item => item.SalesOrder)
                .HasForeignKey(item => item.SalesOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SalesOrderItem>(builder =>
        {
            builder.ToTable("sales_order_items");
            builder.HasKey(item => item.Id);
            builder.Property(item => item.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(item => item.ProductId).HasColumnName("product_id");
            builder.Property(item => item.ProductPartNumber).HasMaxLength(100).HasColumnName("product_part_number");
            builder.Property(item => item.ProductDescription).HasColumnName("product_description");
            builder.Property(item => item.ProductMaterialSpec).HasColumnName("product_material_spec");
            builder.Property(item => item.Qty).HasColumnName("qty");
            builder.Property(item => item.Notes).HasColumnName("notes");
            builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(item => item.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<ProductionOrder>(builder =>
        {
            builder.ToTable("production_orders");
            builder.HasKey(order => order.Id);
            builder.HasIndex(order => order.PoNumber).IsUnique();
            builder.HasIndex(order => order.BarcodeUid).IsUnique();
            builder.Property(order => order.PoNumber).HasMaxLength(100).HasColumnName("po_number");
            builder.Property(order => order.SalesOrderItemId).HasColumnName("sales_order_item_id");
            builder.Property(order => order.DrawingRef).HasMaxLength(255).HasColumnName("drawing_ref");
            builder.Property(order => order.BarcodeUid).HasMaxLength(255).HasColumnName("barcode_uid");
            builder.Property(order => order.OrderQty).HasColumnName("order_qty");
            builder.Property(order => order.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(order => order.StartedAtUtc).HasColumnName("started_at_utc");
            builder.Property(order => order.FinishedAtUtc).HasColumnName("finished_at_utc");
            builder.Property(order => order.QcDecision).HasMaxLength(40).HasColumnName("qc_decision");
            builder.Property(order => order.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(order => order.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasOne(order => order.SalesOrderItem)
                .WithMany(item => item.ProductionOrders)
                .HasForeignKey(order => order.SalesOrderItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
