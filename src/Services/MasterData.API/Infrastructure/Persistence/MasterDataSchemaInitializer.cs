using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.MasterData.Api.Infrastructure.Persistence;

public static class MasterDataSchemaInitializer
{
    public static async Task EnsureMasterDataSchemaAsync(this MasterDataContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS email character varying(160);
            
            CREATE TABLE IF NOT EXISTS suppliers (
                "Id" uuid NOT NULL,
                "code" character varying(40) NOT NULL,
                "name" character varying(160) NOT NULL,
                "type" character varying(40) NOT NULL,
                "category" character varying(120) NOT NULL,
                "city" character varying(120),
                "province" character varying(120),
                "address" character varying(400),
                "status" character varying(40) NOT NULL,
                "bank_name" character varying(120),
                "bank_account" character varying(80),
                "bank_branch" character varying(120),
                "npwp" character varying(80),
                "payment_terms" character varying(80),
                "since" character varying(40),
                "rating" double precision NOT NULL,
                "created_at_utc" timestamp with time zone NOT NULL,
                "updated_at_utc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_suppliers" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_suppliers_code" ON suppliers ("code");

            CREATE TABLE IF NOT EXISTS supplier_contacts (
                "Id" uuid NOT NULL,
                "supplier_id" uuid NOT NULL,
                "name" character varying(120) NOT NULL,
                "role" character varying(120),
                "phone" character varying(40),
                "email" character varying(160),
                "is_primary" boolean NOT NULL,
                CONSTRAINT "PK_supplier_contacts" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_supplier_contacts_suppliers_supplier_id" FOREIGN KEY ("supplier_id") REFERENCES suppliers ("Id") ON DELETE CASCADE
            );
            """,
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
