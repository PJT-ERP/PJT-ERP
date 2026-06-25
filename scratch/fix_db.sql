ALTER TABLE sales_order_items RENAME COLUMN "UnitPrice" TO unit_price;
CREATE TABLE sales_order_design_revisions (
    "Id" uuid NOT NULL,
    sales_order_id uuid NOT NULL,
    version integer NOT NULL,
    url character varying(1000) NOT NULL,
    changed_by character varying(160) NOT NULL,
    changed_at_utc timestamp with time zone NOT NULL,
    CONSTRAINT "PK_sales_order_design_revisions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_sales_order_design_revisions_sales_orders_sales_order_id" FOREIGN KEY (sales_order_id) REFERENCES sales_orders ("Id") ON DELETE CASCADE
);
CREATE INDEX "IX_sales_order_design_revisions_sales_order_id" ON sales_order_design_revisions (sales_order_id);
