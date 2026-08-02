using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsCostingCompleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CompletionNote",
                table: "production_orders",
                newName: "completion_note");

            migrationBuilder.AddColumn<bool>(
                name: "is_costing_completed",
                table: "sales_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_costing_completed",
                table: "sales_orders");

            migrationBuilder.RenameColumn(
                name: "completion_note",
                table: "production_orders",
                newName: "CompletionNote");
        }
    }
}
