using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence.Migrations;

[DbContext(typeof(IdentityContext))]
[Migration("20260901000000_InitialIdentity")]
public partial class InitialIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "user_accounts",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                role = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                department = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                join_date_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                last_active_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_user_accounts", x => x.id));

        migrationBuilder.CreateIndex(
            name: "IX_user_accounts_email",
            table: "user_accounts",
            column: "email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "user_accounts");
    }
}
