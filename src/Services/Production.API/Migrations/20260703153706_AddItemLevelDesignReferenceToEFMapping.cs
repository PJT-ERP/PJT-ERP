using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddItemLevelDesignReferenceToEFMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "customer_drawing_url",
                table: "sales_order_items",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "design_reference",
                table: "sales_order_items",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pause_reason",
                table: "production_orders",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "customer_drawing_url",
                table: "sales_order_items");

            migrationBuilder.DropColumn(
                name: "design_reference",
                table: "sales_order_items");

            migrationBuilder.DropColumn(
                name: "pause_reason",
                table: "production_orders");
        }
    }
}
