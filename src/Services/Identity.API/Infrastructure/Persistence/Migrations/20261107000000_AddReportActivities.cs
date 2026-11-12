using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence.Migrations;

[DbContext(typeof(IdentityContext))]
[Migration("20261107000000_AddReportActivities")]
public sealed class AddReportActivities : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("Target", "daily_report_tasks", type: "character varying(500)", maxLength: 500, nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<string>("Status", "daily_report_tasks", type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "On Progress");
        migrationBuilder.AddColumn<string>("Result", "daily_report_tasks", type: "character varying(2000)", maxLength: 2000, nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<Guid>("SalesOrderId", "daily_report_tasks", type: "uuid", nullable: true);
        migrationBuilder.AddColumn<string>("SalesOrderNumber", "daily_report_tasks", type: "character varying(100)", maxLength: 100, nullable: true);
        migrationBuilder.AddColumn<Guid[]>("TaggedUserIds", "daily_report_tasks", type: "uuid[]", nullable: false, defaultValue: Array.Empty<Guid>());
        migrationBuilder.AddColumn<string[]>("TaggedUserNames", "daily_report_tasks", type: "text[]", nullable: false, defaultValue: Array.Empty<string>());
        migrationBuilder.AddColumn<Guid>("TaskId", "daily_report_attachments", type: "uuid", nullable: true);
        migrationBuilder.CreateIndex("IX_daily_report_attachments_TaskId", "daily_report_attachments", "TaskId");
        migrationBuilder.AddForeignKey("FK_daily_report_attachments_daily_report_tasks_TaskId", "daily_report_attachments", "TaskId", "daily_report_tasks", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_daily_report_attachments_daily_report_tasks_TaskId", "daily_report_attachments");
        migrationBuilder.DropIndex("IX_daily_report_attachments_TaskId", "daily_report_attachments");
        migrationBuilder.DropColumn("TaskId", "daily_report_attachments");
        foreach (var column in new[] { "Target", "Status", "Result", "SalesOrderId", "SalesOrderNumber", "TaggedUserIds", "TaggedUserNames" })
            migrationBuilder.DropColumn(column, "daily_report_tasks");
    }
}
