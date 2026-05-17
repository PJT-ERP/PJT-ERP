using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.QC.Api.Domain.Entities;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.QC.Api.Infrastructure.Persistence;

public sealed class QcContext(DbContextOptions<QcContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<QcInspection> QcInspections => Set<QcInspection>();
    public DbSet<QcVisualCheck> QcVisualChecks => Set<QcVisualCheck>();
    public DbSet<QcDimensionCheck> QcDimensionChecks => Set<QcDimensionCheck>();
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
            builder.Property(inspection => inspection.OrderQty).HasColumnName("order_qty");
            builder.Property(inspection => inspection.MaterialSpec).HasColumnName("material_spec");
            builder.Property(inspection => inspection.InspectorId).HasColumnName("inspector_id");
            builder.Property(inspection => inspection.InspectorName).HasMaxLength(160).HasColumnName("inspector_name");
            builder.Property(inspection => inspection.InspectionDate).HasColumnName("inspection_date");
            builder.Property(inspection => inspection.ProductionFinishedAtUtc).HasColumnName("production_finished_at_utc");
            builder.Property(inspection => inspection.SampleQty).HasColumnName("sample_qty");
            builder.Property(inspection => inspection.SamplingMethod).HasMaxLength(100).HasColumnName("sampling_method");
            builder.Property(inspection => inspection.MeasuringToolNo).HasMaxLength(100).HasColumnName("measuring_tool_no");
            builder.Property(inspection => inspection.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(inspection => inspection.InspectionResult).HasMaxLength(40).HasColumnName("inspection_result");
            builder.Property(inspection => inspection.DefectNotes).HasColumnName("defect_notes");
            builder.Property(inspection => inspection.FormRemarks).HasColumnName("form_remarks");
            builder.Property(inspection => inspection.OwnerDecision).HasMaxLength(40).HasColumnName("owner_decision");
            builder.Property(inspection => inspection.OwnerReviewedByUserId).HasColumnName("owner_reviewed_by_user_id");
            builder.Property(inspection => inspection.OwnerReviewerName).HasMaxLength(160).HasColumnName("owner_reviewer_name");
            builder.Property(inspection => inspection.OwnerReviewedAtUtc).HasColumnName("owner_reviewed_at_utc");
            builder.Property(inspection => inspection.OwnerReviewRemarks).HasColumnName("owner_review_remarks");
            builder.Property(inspection => inspection.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(inspection => inspection.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<QcVisualCheck>(builder =>
        {
            builder.ToTable("qc_visual_checks");
            builder.HasKey(check => check.Id);
            builder.Property(check => check.QcInspectionId).HasColumnName("qc_inspection_id");
            builder.Property(check => check.CheckDate).HasColumnName("check_date");
            builder.Property(check => check.QtyChecked).HasColumnName("qty_checked");
            builder.Property(check => check.QtyAccept).HasColumnName("qty_accept");
            builder.Property(check => check.QtyReject).HasColumnName("qty_reject");
            builder.Property(check => check.QtyRepair).HasColumnName("qty_repair");
            builder.Property(check => check.QtyScrap).HasColumnName("qty_scrap");
            builder.Property(check => check.NcRef).HasMaxLength(100).HasColumnName("nc_ref");
            builder.Property(check => check.Remarks).HasColumnName("remarks");
            builder.Property(check => check.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(check => check.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasOne(check => check.QcInspection)
                .WithMany(inspection => inspection.VisualChecks)
                .HasForeignKey(check => check.QcInspectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QcDimensionCheck>(builder =>
        {
            builder.ToTable("qc_dimension_checks");
            builder.HasKey(check => check.Id);
            builder.Property(check => check.QcInspectionId).HasColumnName("qc_inspection_id");
            builder.Property(check => check.CheckDate).HasColumnName("check_date");
            builder.Property(check => check.SampleId).HasMaxLength(50).HasColumnName("sample_id");
            builder.Property(check => check.Process).HasMaxLength(100).HasColumnName("process");
            builder.Property(check => check.DimensionDataJson).HasColumnType("jsonb").HasColumnName("dimension_data");
            builder.Property(check => check.OperatorId).HasColumnName("operator_id");
            builder.Property(check => check.OperatorName).HasMaxLength(160).HasColumnName("operator_name");
            builder.Property(check => check.Status).HasMaxLength(20).HasColumnName("status");
            builder.Property(check => check.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(check => check.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasOne(check => check.QcInspection)
                .WithMany(inspection => inspection.DimensionChecks)
                .HasForeignKey(check => check.QcInspectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
