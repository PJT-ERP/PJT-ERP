using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.Production.Api.Infrastructure.Persistence;

public static class ProductionSchemaInitializer
{
    public static async Task EnsureProductionSchemaAsync(this ProductionContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        // Dev-friendly schema evolution until formal EF migrations are introduced.
        await db.Database.ExecuteSqlRawAsync(
            """
            DROP TABLE IF EXISTS quotation_price_revisions CASCADE;
            DROP TABLE IF EXISTS quotation_bom_items CASCADE;
            DROP TABLE IF EXISTS quotation_items CASCADE;
            DROP TABLE IF EXISTS quotations CASCADE;

            ALTER TABLE customer_replicas ADD COLUMN IF NOT EXISTS email character varying(160);

            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_email character varying(160);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_drawing_url character varying(1000);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_reference character varying(255);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_status character varying(50) NOT NULL DEFAULT 'PendingDesign';
            
            ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_approved_by_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_approved_by_name character varying(160);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_approved_at_utc timestamp with time zone;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_worker_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS design_worker_name character varying(160);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_worker_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_worker_name character varying(160);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qc_reviewer_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qc_reviewer_name character varying(160);

            UPDATE sales_orders
            SET design_status = 'PendingDesign'
            WHERE design_status IS NULL OR btrim(design_status) = '';

            ALTER TABLE sales_orders ALTER COLUMN design_status SET DEFAULT 'PendingDesign';
            ALTER TABLE sales_orders ALTER COLUMN design_status SET NOT NULL;

            ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS sales_order_id uuid;
            ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS started_by_user_id uuid;
            ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS started_by_name character varying(160);
            ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS finished_by_user_id uuid;
            ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS finished_by_name character varying(160);

            UPDATE production_orders po
            SET sales_order_id = soi.sales_order_id
            FROM sales_order_items soi
            WHERE po.sales_order_id IS NULL
              AND po.sales_order_item_id = soi."Id";

            UPDATE production_orders po
            SET sales_order_id = so."Id"
            FROM sales_orders so
            WHERE po.sales_order_id IS NULL
              AND po.po_number = so.so_number;

            DO $$
            DECLARE
                remaining_null_count integer;
                orphan_count integer;
            BEGIN
                SELECT COUNT(*)
                INTO remaining_null_count
                FROM production_orders
                WHERE sales_order_id IS NULL;

                IF remaining_null_count > 0 THEN
                    RAISE EXCEPTION 'production_orders.sales_order_id backfill failed for % row(s)', remaining_null_count;
                END IF;

                SELECT COUNT(*)
                INTO orphan_count
                FROM production_orders po
                LEFT JOIN sales_orders so ON so."Id" = po.sales_order_id
                WHERE so."Id" IS NULL;

                IF orphan_count > 0 THEN
                    RAISE EXCEPTION 'production_orders.sales_order_id has % row(s) without matching sales_orders rows', orphan_count;
                END IF;
            END $$;

            ALTER TABLE production_orders
                ALTER COLUMN sales_order_id SET NOT NULL;

            CREATE INDEX IF NOT EXISTS ix_production_orders_sales_order_id
                ON production_orders (sales_order_id);

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'fk_production_orders_sales_orders_sales_order_id'
                ) THEN
                    ALTER TABLE production_orders
                        ADD CONSTRAINT fk_production_orders_sales_orders_sales_order_id
                        FOREIGN KEY (sales_order_id)
                        REFERENCES sales_orders ("Id")
                        ON DELETE CASCADE;
                END IF;
            END $$;
            """,
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
