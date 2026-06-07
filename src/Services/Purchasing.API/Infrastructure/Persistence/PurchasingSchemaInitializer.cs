using Microsoft.EntityFrameworkCore;

namespace PJT_ERP.Purchasing.Api.Infrastructure.Persistence;

public static class PurchasingSchemaInitializer
{
    public static async Task EnsurePurchasingSchemaAsync(this PurchasingContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        // Dev-friendly schema evolution until formal EF migrations are introduced.
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS purchase_requests (
                "Id" uuid NOT NULL PRIMARY KEY,
                pr_number character varying(100) NOT NULL,
                request_date date NOT NULL,
                requested_by_user_id uuid NOT NULL,
                requester_name character varying(160) NOT NULL,
                sales_order_id uuid NULL,
                sales_order_number character varying(100) NULL,
                project_name character varying(255) NULL,
                status character varying(50) NOT NULL,
                reviewed_by_user_id uuid NULL,
                reviewed_at_utc timestamp with time zone NULL,
                rejection_reason text NULL,
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone NOT NULL
            );

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'purchase_requests' AND column_name = 'id'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'purchase_requests' AND column_name = 'Id'
                ) THEN
                    ALTER TABLE purchase_requests RENAME COLUMN id TO "Id";
                END IF;
            END $$;

            CREATE UNIQUE INDEX IF NOT EXISTS ix_purchase_requests_pr_number
                ON purchase_requests (pr_number);

            CREATE TABLE IF NOT EXISTS sales_order_snapshots (
                sales_order_id uuid NOT NULL PRIMARY KEY,
                sales_order_number character varying(100) NOT NULL,
                customer_id uuid NOT NULL,
                confirmed_at_utc timestamp with time zone NOT NULL,
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS material_requirements (
                "Id" uuid NOT NULL PRIMARY KEY,
                sales_order_id uuid NOT NULL,
                sales_order_number character varying(100) NOT NULL,
                production_order_id uuid NOT NULL,
                sales_order_item_id uuid NULL,
                spk_number character varying(100) NOT NULL,
                barcode_uid character varying(255) NOT NULL,
                product_id uuid NOT NULL,
                product_part_number character varying(100) NOT NULL,
                product_description text NOT NULL,
                material_spec character varying(255) NULL,
                required_qty integer NOT NULL,
                stock_on_hand integer NOT NULL DEFAULT 0,
                stock_notes text NULL,
                stock_updated_at_utc timestamp with time zone NULL,
                project_name character varying(255) NOT NULL,
                status character varying(50) NOT NULL,
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone NOT NULL
            );

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'material_requirements' AND column_name = 'id'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'material_requirements' AND column_name = 'Id'
                ) THEN
                    ALTER TABLE material_requirements RENAME COLUMN id TO "Id";
                END IF;
            END $$;

            DROP INDEX IF EXISTS ix_material_requirements_production_order_id;

            CREATE INDEX IF NOT EXISTS ix_material_requirements_production_order_id
                ON material_requirements (production_order_id);

            CREATE INDEX IF NOT EXISTS ix_material_requirements_production_order_product_id
                ON material_requirements (production_order_id, product_id);

            CREATE INDEX IF NOT EXISTS ix_material_requirements_sales_order_id
                ON material_requirements (sales_order_id);

            CREATE TABLE IF NOT EXISTS purchase_request_items (
                "Id" uuid NOT NULL PRIMARY KEY,
                purchase_request_id uuid NOT NULL,
                material_requirement_id uuid NULL,
                sales_order_id uuid NULL,
                sales_order_number character varying(100) NULL,
                production_order_id uuid NULL,
                spk_number character varying(100) NULL,
                project_name character varying(255) NULL,
                item_name character varying(255) NOT NULL,
                size character varying(100) NULL,
                qty integer NOT NULL,
                urgency character varying(30) NOT NULL DEFAULT 'Normal',
                purchase_category character varying(50) NOT NULL DEFAULT 'Project',
                suggested_supplier character varying(255) NULL,
                supplier_name character varying(255) NULL,
                po_number character varying(100) NULL,
                estimated_price numeric(18,2) NULL,
                total_price numeric(18,2) NULL,
                purchase_date date NULL,
                expected_arrival_date date NULL,
                received_date date NULL,
                purchase_status character varying(50) NOT NULL DEFAULT 'Requested',
                purchase_notes text NULL,
                rejection_reason text NULL,
                notes text NULL,
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone NOT NULL
            );

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'purchase_request_items' AND column_name = 'id'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'purchase_request_items' AND column_name = 'Id'
                ) THEN
                    ALTER TABLE purchase_request_items RENAME COLUMN id TO "Id";
                END IF;
            END $$;

            ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS sales_order_id uuid;
            ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS sales_order_number character varying(100);
            ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS project_name character varying(255);
            ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS updated_at_utc timestamp with time zone NOT NULL DEFAULT now();

            ALTER TABLE material_requirements ADD COLUMN IF NOT EXISTS sales_order_item_id uuid;
            ALTER TABLE material_requirements ADD COLUMN IF NOT EXISTS stock_on_hand integer NOT NULL DEFAULT 0;
            ALTER TABLE material_requirements ADD COLUMN IF NOT EXISTS stock_notes text;
            ALTER TABLE material_requirements ADD COLUMN IF NOT EXISTS stock_updated_at_utc timestamp with time zone;

            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS material_requirement_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS sales_order_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS sales_order_number character varying(100);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS production_order_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS spk_number character varying(100);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS project_name character varying(255);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS urgency character varying(30) NOT NULL DEFAULT 'Normal';
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_category character varying(50) NOT NULL DEFAULT 'Project';
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS supplier_name character varying(255);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS po_number character varying(100);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS estimated_price numeric(18,2);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS total_price numeric(18,2);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS expected_arrival_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS received_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_status character varying(50) NOT NULL DEFAULT 'Requested';
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_notes text;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS rejection_reason text;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS updated_at_utc timestamp with time zone NOT NULL DEFAULT now();

            UPDATE purchase_request_items
            SET purchase_status = 'Requested'
            WHERE purchase_status IS NULL;

            UPDATE purchase_request_items
            SET urgency = 'Normal'
            WHERE urgency IS NULL OR btrim(urgency) = '';

            UPDATE purchase_request_items
            SET purchase_category = 'Project'
            WHERE purchase_category IS NULL OR btrim(purchase_category) = '';

            ALTER TABLE purchase_request_items ALTER COLUMN purchase_status SET DEFAULT 'Requested';
            ALTER TABLE purchase_request_items ALTER COLUMN purchase_status SET NOT NULL;
            ALTER TABLE purchase_request_items ALTER COLUMN urgency SET DEFAULT 'Normal';
            ALTER TABLE purchase_request_items ALTER COLUMN urgency SET NOT NULL;
            ALTER TABLE purchase_request_items ALTER COLUMN purchase_category SET DEFAULT 'Project';
            ALTER TABLE purchase_request_items ALTER COLUMN purchase_category SET NOT NULL;

            CREATE INDEX IF NOT EXISTS ix_purchase_request_items_purchase_request_id
                ON purchase_request_items (purchase_request_id);

            CREATE INDEX IF NOT EXISTS ix_purchase_request_items_material_requirement_id
                ON purchase_request_items (material_requirement_id);
            """,
            cancellationToken);
    }
}
