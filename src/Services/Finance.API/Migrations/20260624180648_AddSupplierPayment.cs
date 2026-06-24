using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Finance.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "invoice_candidates",
                columns: table => new
                {
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    customer_email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    target_date = table.Column<DateOnly>(type: "date", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_candidates", x => x.sales_order_id);
                });

            migrationBuilder.CreateTable(
                name: "invoices",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    customer_email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    invoice_date = table.Column<DateOnly>(type: "date", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    tax_percent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    paid_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    payment_percent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    bank_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    bank_account_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    bank_account_number = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.id);
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
                name: "supplier_payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    po_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    supplier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    payment_date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bank_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    bank_reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    proof_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    proof_file_url = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_payments", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "invoice_candidate_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_part_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_description = table.Column<string>(type: "text", nullable: false),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_candidate_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_candidate_items_invoice_candidates_sales_order_id",
                        column: x => x.sales_order_id,
                        principalTable: "invoice_candidates",
                        principalColumn: "sales_order_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "collection_letters",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    letter_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    issued_date = table.Column<DateOnly>(type: "date", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_collection_letters", x => x.id);
                    table.ForeignKey(
                        name: "FK_collection_letters_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoice_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    part_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    qty = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_items_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_records_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_schedules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    is_paid = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_schedules_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_verification_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bank_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    bank_reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    proof_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    proof_file_url = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    submitted_by = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    submitted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    verified_by = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    verified_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    rejected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_verification_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_verification_requests_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_collection_letters_invoice_id",
                table: "collection_letters",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_candidate_items_sales_order_id",
                table: "invoice_candidate_items",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_candidate_items_sales_order_item_id",
                table: "invoice_candidate_items",
                column: "sales_order_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_candidates_customer_id",
                table: "invoice_candidates",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_candidates_sales_order_number",
                table: "invoice_candidates",
                column: "sales_order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_items_invoice_id",
                table: "invoice_items",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_customer_id",
                table: "invoices",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_due_date",
                table: "invoices",
                column: "due_date");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_invoice_number",
                table: "invoices",
                column: "invoice_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_sales_order_id",
                table: "invoices",
                column: "sales_order_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_outbox_messages_processed_at_utc_occurred_at_utc",
                table: "outbox_messages",
                columns: new[] { "processed_at_utc", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_records_invoice_id",
                table: "payment_records",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_schedules_invoice_id",
                table: "payment_schedules",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_verification_requests_invoice_id",
                table: "payment_verification_requests",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_verification_requests_status",
                table: "payment_verification_requests",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_po_number",
                table: "supplier_payments",
                column: "po_number");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "collection_letters");

            migrationBuilder.DropTable(
                name: "invoice_candidate_items");

            migrationBuilder.DropTable(
                name: "invoice_items");

            migrationBuilder.DropTable(
                name: "outbox_messages");

            migrationBuilder.DropTable(
                name: "payment_records");

            migrationBuilder.DropTable(
                name: "payment_schedules");

            migrationBuilder.DropTable(
                name: "payment_verification_requests");

            migrationBuilder.DropTable(
                name: "supplier_payments");

            migrationBuilder.DropTable(
                name: "invoice_candidates");

            migrationBuilder.DropTable(
                name: "invoices");
        }
    }
}
