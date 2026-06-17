using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveQuotations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customer_replicas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_replicas", x => x.Id);
                });

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
                name: "product_replicas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    part_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    unit = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    material_spec = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_replicas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sales_orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    so_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    customer_email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    customer_drawing_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    design_reference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    design_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    design_approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    design_approved_by_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    design_approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    so_date = table.Column<DateOnly>(type: "date", nullable: false),
                    target_date = table.Column<DateOnly>(type: "date", nullable: true),
                    design_worker_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    design_worker_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    production_worker_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    production_worker_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    qc_reviewer_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    qc_reviewer_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_orders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sales_order_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_part_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_description = table.Column<string>(type: "text", nullable: false),
                    product_material_spec = table.Column<string>(type: "text", nullable: true),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_order_items_sales_orders_sales_order_id",
                        column: x => x.sales_order_id,
                        principalTable: "sales_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "production_orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    po_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    drawing_ref = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    drawing_file_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    drawing_uploaded_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    drawing_uploader_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    drawing_uploaded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    barcode_uid = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    order_qty = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    started_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    started_by_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    finished_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    finished_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    finished_by_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    qc_decision = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_orders_sales_order_items_sales_order_item_id",
                        column: x => x.sales_order_item_id,
                        principalTable: "sales_order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_production_orders_sales_orders_sales_order_id",
                        column: x => x.sales_order_id,
                        principalTable: "sales_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_replicas_code",
                table: "customer_replicas",
                column: "code");

            migrationBuilder.CreateIndex(
                name: "IX_outbox_messages_processed_at_utc_occurred_at_utc",
                table: "outbox_messages",
                columns: new[] { "processed_at_utc", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_product_replicas_part_number",
                table: "product_replicas",
                column: "part_number");

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_barcode_uid",
                table: "production_orders",
                column: "barcode_uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_po_number",
                table: "production_orders",
                column: "po_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_sales_order_id",
                table: "production_orders",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_sales_order_item_id",
                table: "production_orders",
                column: "sales_order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_order_items_sales_order_id",
                table: "sales_order_items",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_orders_so_number",
                table: "sales_orders",
                column: "so_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_replicas");

            migrationBuilder.DropTable(
                name: "outbox_messages");

            migrationBuilder.DropTable(
                name: "product_replicas");

            migrationBuilder.DropTable(
                name: "production_orders");

            migrationBuilder.DropTable(
                name: "sales_order_items");

            migrationBuilder.DropTable(
                name: "sales_orders");
        }
    }
}
