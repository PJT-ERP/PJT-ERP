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
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS "daily_reports" (
                "Id" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "UserName" character varying(255) NOT NULL,
                "UserRole" character varying(120) NOT NULL,
                "ReportDate" timestamp with time zone NOT NULL,
                "Summary" character varying(2000) NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_daily_reports" PRIMARY KEY ("Id")
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS "daily_report_attachments" (
                "Id" uuid NOT NULL,
                "DailyReportId" uuid NOT NULL,
                "StoredFilePath" character varying(255) NOT NULL,
                "OriginalFileName" character varying(255) NOT NULL,
                "ContentType" character varying(100) NOT NULL,
                "FileSizeBytes" bigint NOT NULL,
                "Caption" character varying(500),
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_daily_report_attachments" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_daily_report_attachments_daily_reports_DailyReportId"
                    FOREIGN KEY ("DailyReportId") REFERENCES "daily_reports" ("Id") ON DELETE CASCADE
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS "daily_report_tasks" (
                "Id" uuid NOT NULL,
                "DailyReportId" uuid NOT NULL,
                "Description" character varying(500) NOT NULL,
                "SortOrder" integer NOT NULL,
                CONSTRAINT "PK_daily_report_tasks" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_daily_report_tasks_daily_reports_DailyReportId"
                    FOREIGN KEY ("DailyReportId") REFERENCES "daily_reports" ("Id") ON DELETE CASCADE
            );
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_daily_reports_UserId_ReportDate"
                ON "daily_reports" ("UserId", "ReportDate");
            CREATE INDEX IF NOT EXISTS "IX_daily_report_attachments_DailyReportId"
                ON "daily_report_attachments" ("DailyReportId");
            CREATE INDEX IF NOT EXISTS "IX_daily_report_tasks_DailyReportId"
                ON "daily_report_tasks" ("DailyReportId");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "daily_report_attachments");
        migrationBuilder.DropTable(name: "daily_report_tasks");
        migrationBuilder.DropTable(name: "daily_reports");
    }
}
