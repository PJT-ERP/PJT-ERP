using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Production.Api.Migrations;

public partial class AddProductionAndQcPhotosToSalesOrder : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<List<string>>(
            name: "production_photos",
            table: "sales_orders",
            type: "text[]",
            nullable: true,
            defaultValue: new List<string>());

        migrationBuilder.AddColumn<List<string>>(
            name: "qc_photos",
            table: "sales_orders",
            type: "text[]",
            nullable: true,
            defaultValue: new List<string>());
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "production_photos",
            table: "sales_orders");

        migrationBuilder.DropColumn(
            name: "qc_photos",
            table: "sales_orders");
    }
}
