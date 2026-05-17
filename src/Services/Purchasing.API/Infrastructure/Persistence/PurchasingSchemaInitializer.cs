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
                spk_number character varying(100) NOT NULL,
                barcode_uid character varying(255) NOT NULL,
                product_id uuid NOT NULL,
                product_part_number character varying(100) NOT NULL,
                product_description text NOT NULL,
                material_spec character varying(255) NULL,
                required_qty integer NOT NULL,
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

            CREATE UNIQUE INDEX IF NOT EXISTS ix_material_requirements_production_order_id
                ON material_requirements (production_order_id);

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
                suggested_supplier character varying(255) NULL,
                supplier_name character varying(255) NULL,
                purchase_date date NULL,
                expected_arrival_date date NULL,
                received_date date NULL,
                purchase_status character varying(50) NOT NULL DEFAULT 'Requested',
                purchase_notes text NULL,
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

            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS material_requirement_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS sales_order_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS sales_order_number character varying(100);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS production_order_id uuid;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS spk_number character varying(100);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS project_name character varying(255);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS supplier_name character varying(255);
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS expected_arrival_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS received_date date;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_status character varying(50) NOT NULL DEFAULT 'Requested';
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS purchase_notes text;
            ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS updated_at_utc timestamp with time zone NOT NULL DEFAULT now();

            UPDATE purchase_request_items
            SET purchase_status = 'Requested'
            WHERE purchase_status IS NULL;

            ALTER TABLE purchase_request_items ALTER COLUMN purchase_status SET DEFAULT 'Requested';
            ALTER TABLE purchase_request_items ALTER COLUMN purchase_status SET NOT NULL;

            CREATE INDEX IF NOT EXISTS ix_purchase_request_items_purchase_request_id
                ON purchase_request_items (purchase_request_id);

            CREATE INDEX IF NOT EXISTS ix_purchase_request_items_material_requirement_id
                ON purchase_request_items (material_requirement_id);
            """,
            cancellationToken);
    }
}
