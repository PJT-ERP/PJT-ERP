using Microsoft.EntityFrameworkCore;

namespace PJT_ERP.Production.Api.Infrastructure.Persistence;

public static class ProductionSchemaInitializer
{
    public static async Task EnsureProductionSchemaAsync(this ProductionContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        // Dev-friendly schema evolution until formal EF migrations are introduced.
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_worker_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_worker_name character varying(160);
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qc_reviewer_user_id uuid;
            ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qc_reviewer_name character varying(160);

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

            CREATE INDEX IF NOT EXISTS ix_production_orders_sales_order_id
                ON production_orders (sales_order_id);
            """,
            cancellationToken);
    }
}
