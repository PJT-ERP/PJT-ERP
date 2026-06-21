using Microsoft.EntityFrameworkCore;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.QC.Api.Infrastructure.Persistence;

public sealed class QcContext(DbContextOptions<QcContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<QcInspection> QcInspections => Set<QcInspection>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QcInspection>(builder =>
        {
            builder.ToTable("qc_inspections");
            builder.HasKey(inspection => inspection.Id);
            builder.HasIndex(inspection => inspection.ProductionOrderId).IsUnique();
            builder.HasIndex(inspection => inspection.RefNo).IsUnique();
            builder.Property(inspection => inspection.RefNo).HasMaxLength(100).HasColumnName("ref_no");
            builder.Property(inspection => inspection.ProductionOrderId).HasColumnName("production_order_id");
            builder.Property(inspection => inspection.SpkNumber).HasMaxLength(100).HasColumnName("spk_number");
            builder.Property(inspection => inspection.BarcodeUid).HasMaxLength(255).HasColumnName("barcode_uid");
            builder.Property(inspection => inspection.ProductName).HasMaxLength(255).HasColumnName("product_name");
            builder.Property(inspection => inspection.ProductCode).HasMaxLength(100).HasColumnName("product_code");
            builder.Property(inspection => inspection.PorNumber).HasMaxLength(100).HasColumnName("por_number");
            builder.Property(inspection => inspection.DrawingRef).HasMaxLength(255).HasColumnName("drawing_ref");
            builder.Property(inspection => inspection.CustomerDrawingUrl).HasMaxLength(1000).HasColumnName("customer_drawing_url");
            builder.Property(inspection => inspection.DesignReference).HasMaxLength(255).HasColumnName("design_reference");
            builder.Property(inspection => inspection.OrderQty).HasColumnName("order_qty");
            builder.Property(inspection => inspection.MaterialSpec).HasColumnName("material_spec");
            builder.Property(inspection => inspection.ProductionFinishedAtUtc).HasColumnName("production_finished_at_utc");
            builder.Property(inspection => inspection.AssignedReviewerUserId).HasColumnName("assigned_reviewer_user_id");
            builder.Property(inspection => inspection.AssignedReviewerName).HasMaxLength(160).HasColumnName("assigned_reviewer_name");
            builder.Property(inspection => inspection.ProductionPhotos).HasColumnName("production_photos");
            builder.Property(inspection => inspection.QcPhotos).HasColumnName("qc_photos");
            builder.Property(inspection => inspection.Notes).HasColumnName("notes");
            builder.Property(inspection => inspection.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(inspection => inspection.Decision).HasMaxLength(40).HasColumnName("decision");
            builder.Property(inspection => inspection.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
            builder.Property(inspection => inspection.ReviewerName).HasMaxLength(160).HasColumnName("reviewer_name");
            builder.Property(inspection => inspection.ReviewedAtUtc).HasColumnName("reviewed_at_utc");
            builder.Property(inspection => inspection.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(inspection => inspection.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
