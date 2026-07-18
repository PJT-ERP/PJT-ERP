using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Id",
                table: "consultation_requests",
                newName: "id");

            migrationBuilder.AddColumn<string>(
                name: "CompletionNote",
                table: "production_orders",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_orders_customer_id",
                table: "sales_orders",
                column: "customer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sales_orders_customer_id",
                table: "sales_orders");

            migrationBuilder.DropColumn(
                name: "CompletionNote",
                table: "production_orders");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "consultation_requests",
                newName: "Id");
        }
    }
}
