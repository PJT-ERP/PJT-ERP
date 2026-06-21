using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.QC.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateQcPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "outbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    content = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    processed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    error = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "qc_inspections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ref_no = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    production_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spk_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    barcode_uid = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    product_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    product_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    por_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    drawing_ref = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    customer_drawing_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    design_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    order_qty = table.Column<int>(type: "integer", nullable: true),
                    material_spec = table.Column<string>(type: "text", nullable: true),
                    production_finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    assigned_reviewer_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assigned_reviewer_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    production_photos = table.Column<List<string>>(type: "text[]", nullable: false),
                    qc_photos = table.Column<List<string>>(type: "text[]", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    decision = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewer_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qc_inspections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_outbox_messages_processed_at_utc_occurred_at_utc",
                table: "outbox_messages",
                columns: new[] { "processed_at_utc", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_qc_inspections_production_order_id",
                table: "qc_inspections",
                column: "production_order_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qc_inspections_ref_no",
                table: "qc_inspections",
                column: "ref_no",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "outbox_messages");

            migrationBuilder.DropTable(
                name: "qc_inspections");
        }
    }
}
