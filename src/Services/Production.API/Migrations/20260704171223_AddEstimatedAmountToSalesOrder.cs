using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Migrations;

public partial class AddEstimatedAmountToSalesOrder : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "estimated_amount",
            table: "sales_orders",
            type: "numeric",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "estimated_amount",
            table: "sales_orders");
    }
}
