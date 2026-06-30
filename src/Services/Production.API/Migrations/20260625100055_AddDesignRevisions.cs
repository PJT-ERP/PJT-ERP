using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignRevisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UnitPrice",
                table: "sales_order_items",
                newName: "unit_price");

            migrationBuilder.CreateTable(
                name: "sales_order_design_revisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    changed_by = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    changed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_order_design_revisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_order_design_revisions_sales_orders_sales_order_id",
                        column: x => x.sales_order_id,
                        principalTable: "sales_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sales_order_design_revisions_sales_order_id",
                table: "sales_order_design_revisions",
                column: "sales_order_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sales_order_design_revisions");

            migrationBuilder.RenameColumn(
                name: "unit_price",
                table: "sales_order_items",
                newName: "UnitPrice");
        }
    }
}
