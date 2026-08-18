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
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone character varying(40);
            
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

            CREATE TABLE IF NOT EXISTS inventory_items (
                "Id" uuid NOT NULL,
                "code" character varying(80) NOT NULL,
                "name" character varying(160) NOT NULL,
                "category" character varying(80),
                "unit" character varying(40),
                "current_stock" numeric NOT NULL,
                "min_stock" numeric NOT NULL,
                "max_stock" numeric NOT NULL,
                "reorder_point" numeric NOT NULL,
                "location" character varying(120),
                "supplier_name" character varying(160),
                "unit_price" numeric NOT NULL,
                "created_at_utc" timestamp with time zone NOT NULL,
                "updated_at_utc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_inventory_items" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_inventory_items_code" ON inventory_items ("code");

            CREATE TABLE IF NOT EXISTS product_bom_items (
                "Id" uuid NOT NULL,
                "product_id" uuid NOT NULL,
                "inventory_item_id" uuid NOT NULL,
                "quantity" numeric NOT NULL,
                CONSTRAINT "PK_product_bom_items" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_product_bom_items_products_product_id" FOREIGN KEY ("product_id") REFERENCES products ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_product_bom_items_inventory_items_inventory_item_id" FOREIGN KEY ("inventory_item_id") REFERENCES inventory_items ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS stock_mutation_logs (
                "Id" uuid NOT NULL,
                "inventory_item_id" uuid NOT NULL,
                "item_code" character varying(80),
                "item_name" character varying(160),
                "mutation_type" character varying(20),
                "quantity" numeric NOT NULL,
                "reason" character varying(500),
                "created_at_utc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_stock_mutation_logs" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_stock_mutation_logs_inventory_items_inventory_item_id" FOREIGN KEY ("inventory_item_id") REFERENCES inventory_items ("Id") ON DELETE CASCADE
            );
            """,
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
