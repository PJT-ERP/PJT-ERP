using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence.Migrations;

[DbContext(typeof(IdentityContext))]
[Migration("20261002000000_AddDailyReports")]
public partial class AddDailyReports : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "daily_reports",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                UserName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                UserRole = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                ReportDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                Summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_daily_reports", x => x.Id));

        migrationBuilder.CreateTable(
            name: "daily_report_attachments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                DailyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                StoredFilePath = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                Caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_daily_report_attachments", x => x.Id);
                table.ForeignKey("FK_daily_report_attachments_daily_reports_DailyReportId", x => x.DailyReportId, "daily_reports", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "daily_report_tasks",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                DailyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_daily_report_tasks", x => x.Id);
                table.ForeignKey("FK_daily_report_tasks_daily_reports_DailyReportId", x => x.DailyReportId, "daily_reports", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(name: "IX_daily_reports_UserId_ReportDate", table: "daily_reports", columns: new[] { "UserId", "ReportDate" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_daily_report_attachments_DailyReportId", table: "daily_report_attachments", column: "DailyReportId");
        migrationBuilder.CreateIndex(name: "IX_daily_report_tasks_DailyReportId", table: "daily_report_tasks", column: "DailyReportId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "daily_report_attachments");
        migrationBuilder.DropTable(name: "daily_report_tasks");
        migrationBuilder.DropTable(name: "daily_reports");
    }
}
