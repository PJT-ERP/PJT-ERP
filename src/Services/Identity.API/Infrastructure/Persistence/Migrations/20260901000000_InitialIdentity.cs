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
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS user_accounts (
                id uuid NOT NULL,
                name character varying(255) NOT NULL,
                email character varying(160) NOT NULL,
                role character varying(120) NOT NULL,
                department character varying(80) NOT NULL,
                join_date_utc timestamp with time zone NOT NULL,
                last_active_at_utc timestamp with time zone NULL,
                status character varying(50) NOT NULL,
                password_hash character varying(255) NOT NULL DEFAULT '',
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone NOT NULL,
                CONSTRAINT "PK_user_accounts" PRIMARY KEY (id)
            );
            """);

        migrationBuilder.Sql("""
            ALTER TABLE user_accounts
            ADD COLUMN IF NOT EXISTS password_hash character varying(255) NOT NULL DEFAULT '';
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_user_accounts_email"
            ON user_accounts (email);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "user_accounts");
    }
}
