using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceSettingMonthlyTarget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "finance_settings",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    opening_balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MonthlyTarget = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_finance_settings", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "finance_settings");
        }
    }
}
