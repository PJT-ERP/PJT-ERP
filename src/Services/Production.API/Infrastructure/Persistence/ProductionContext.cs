using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Infrastructure.Persistence;

public sealed class ProductionContext(DbContextOptions<ProductionContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<CustomerReplica> CustomerReplicas => Set<CustomerReplica>();
    public DbSet<ProductReplica> ProductReplicas => Set<ProductReplica>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();
    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<SalesOrderDesignRevision> SalesOrderDesignRevisions => Set<SalesOrderDesignRevision>();
    public DbSet<ConsultationRequest> ConsultationRequests => Set<ConsultationRequest>();
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
            builder.Property(customer => customer.Email).HasMaxLength(160).HasColumnName("email");
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

        modelBuilder.Entity<ConsultationRequest>(builder =>
        {
            builder.ToTable("consultation_requests");
            builder.HasKey(req => req.Id);
            builder.Property(req => req.Id).HasColumnName("id");
            builder.Property(req => req.Name).HasMaxLength(150).HasColumnName("name");
            builder.Property(req => req.Phone).HasMaxLength(50).HasColumnName("phone");
            builder.Property(req => req.Email).HasMaxLength(150).HasColumnName("email");
            builder.Property(req => req.ServiceDescription).HasMaxLength(500).HasColumnName("service_description");
            builder.Property(req => req.Message).HasMaxLength(2000).HasColumnName("message");
            builder.Property(req => req.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(req => req.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(req => req.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<SalesOrder>(builder =>
        {
            builder.ToTable("sales_orders");
            builder.HasKey(order => order.Id);
            builder.HasIndex(order => order.SoNumber).IsUnique();
            builder.HasIndex(order => order.CustomerId);
            builder.Property(order => order.SoNumber).HasMaxLength(100).HasColumnName("so_number");
            builder.Property(order => order.CustomerId).HasColumnName("customer_id");
            builder.Property(order => order.CustomerCode).HasMaxLength(50).HasColumnName("customer_code");
            builder.Property(order => order.CustomerName).HasMaxLength(255).HasColumnName("customer_name");
            builder.Property(order => order.CustomerEmail).HasMaxLength(160).HasColumnName("customer_email");
            builder.Property(order => order.CustomerDrawingUrl).HasMaxLength(1000).HasColumnName("customer_drawing_url");
            builder.Property(order => order.DesignReference).HasMaxLength(255).HasColumnName("design_reference");
            builder.Property(order => order.DesignStatus).HasMaxLength(50).HasColumnName("design_status");
            builder.Property(order => order.DesignApprovedByUserId).HasColumnName("design_approved_by_user_id");
            builder.Property(order => order.DesignApprovedByName).HasMaxLength(160).HasColumnName("design_approved_by_name");
            builder.Property(order => order.DesignApprovedAtUtc).HasColumnName("design_approved_at_utc");
            builder.Property(order => order.RejectionReason).HasMaxLength(1000).HasColumnName("rejection_reason");
            builder.Property(order => order.SoDate).HasColumnName("so_date");
            builder.Property(order => order.TargetDate).HasColumnName("target_date");
            builder.Property(order => order.DesignWorkerUserId).HasColumnName("design_worker_user_id");
            builder.Property(order => order.DesignWorkerName).HasMaxLength(160).HasColumnName("design_worker_name");
            builder.Property(order => order.ProductionWorkerUserId).HasColumnName("production_worker_user_id");
            builder.Property(order => order.ProductionWorkerName).HasMaxLength(160).HasColumnName("production_worker_name");
            builder.Property(order => order.QcReviewerUserId).HasColumnName("qc_reviewer_user_id");
            builder.Property(order => order.QcReviewerName).HasMaxLength(160).HasColumnName("qc_reviewer_name");
            builder.Property(order => order.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(order => order.ApprovedByUserId).HasColumnName("approved_by_user_id");
            builder.Property(order => order.ApprovedAtUtc).HasColumnName("approved_at_utc");
            builder.Property(order => order.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(order => order.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.Property(order => order.ProductionPhotos).HasColumnName("production_photos");
            builder.Property(order => order.QcPhotos).HasColumnName("qc_photos");
            builder.Property(order => order.EstimatedAmount).HasColumnName("estimated_amount");
            builder.HasMany(order => order.Items)
                .WithOne(item => item.SalesOrder)
                .HasForeignKey(item => item.SalesOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(order => order.DesignRevisions)
                .WithOne(rev => rev.SalesOrder)
                .HasForeignKey(rev => rev.SalesOrderId)
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
            builder.Property(item => item.UnitPrice).HasColumnName("unit_price");
            builder.Property(item => item.Notes).HasColumnName("notes");
            builder.Property(item => item.DesignReference).HasMaxLength(255).HasColumnName("design_reference");
            builder.Property(item => item.CustomerDrawingUrl).HasMaxLength(1000).HasColumnName("customer_drawing_url");
            builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(item => item.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<ProductionOrder>(builder =>
        {
            builder.ToTable("production_orders");
            builder.HasKey(order => order.Id);
            builder.HasIndex(order => order.PoNumber).IsUnique();
            builder.HasIndex(order => order.BarcodeUid).IsUnique();
            builder.HasIndex(order => order.SalesOrderId);
            builder.Property(order => order.PoNumber).HasMaxLength(100).HasColumnName("po_number");
            builder.Property(order => order.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(order => order.SalesOrderItemId).HasColumnName("sales_order_item_id");
            builder.Property(order => order.DrawingRef).HasMaxLength(255).HasColumnName("drawing_ref");
            builder.Property(order => order.DrawingFileUrl).HasMaxLength(1000).HasColumnName("drawing_file_url");
            builder.Property(order => order.DrawingUploadedByUserId).HasColumnName("drawing_uploaded_by_user_id");
            builder.Property(order => order.DrawingUploaderName).HasMaxLength(160).HasColumnName("drawing_uploader_name");
            builder.Property(order => order.DrawingUploadedAtUtc).HasColumnName("drawing_uploaded_at_utc");
            builder.Property(order => order.BarcodeUid).HasMaxLength(255).HasColumnName("barcode_uid");
            builder.Property(order => order.OrderQty).HasColumnName("order_qty");
            builder.Property(order => order.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(order => order.StartedAtUtc).HasColumnName("started_at_utc");
            builder.Property(order => order.StartedByUserId).HasColumnName("started_by_user_id");
            builder.Property(order => order.StartedByName).HasMaxLength(160).HasColumnName("started_by_name");
            builder.Property(order => order.FinishedAtUtc).HasColumnName("finished_at_utc");
            builder.Property(order => order.FinishedByUserId).HasColumnName("finished_by_user_id");
            builder.Property(order => order.FinishedByName).HasMaxLength(160).HasColumnName("finished_by_name");
            builder.Property(order => order.QcDecision).HasMaxLength(40).HasColumnName("qc_decision");
            builder.Property(order => order.PauseReason).HasColumnName("pause_reason");
            builder.Property(order => order.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(order => order.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasOne(order => order.SalesOrder)
                .WithMany(salesOrder => salesOrder.ProductionOrders)
                .HasForeignKey(order => order.SalesOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(order => order.SalesOrderItem)
                .WithMany(item => item.ProductionOrders)
                .HasForeignKey(order => order.SalesOrderItemId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
        
        modelBuilder.Entity<SalesOrderDesignRevision>(builder =>
        {
            builder.ToTable("sales_order_design_revisions");
            builder.HasKey(rev => rev.Id);
            builder.Property(rev => rev.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(rev => rev.Version).HasColumnName("version");
            builder.Property(rev => rev.Url).HasMaxLength(1000).HasColumnName("url");
            builder.Property(rev => rev.ChangedBy).HasMaxLength(160).HasColumnName("changed_by");
            builder.Property(rev => rev.ChangedAtUtc).HasColumnName("changed_at_utc");
        });
    }
}
