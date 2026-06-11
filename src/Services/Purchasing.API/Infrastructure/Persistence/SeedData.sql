INSERT INTO sales_order_snapshots (sales_order_id, sales_order_number, customer_id, confirmed_at_utc, created_at_utc, updated_at_utc)
VALUES
    ('44444444-4444-4444-8444-444444444004', 'SO-2026038', '11111111-1111-4111-8111-111111111004', '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z', '2026-05-01T09:00:00Z'),
    ('44444444-4444-4444-8444-444444444005', 'SO-2026045', '11111111-1111-4111-8111-111111111005', '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z')
ON CONFLICT (sales_order_id) DO UPDATE
SET sales_order_number = EXCLUDED.sales_order_number,
    customer_id = EXCLUDED.customer_id,
    confirmed_at_utc = EXCLUDED.confirmed_at_utc,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO material_requirements ("Id", sales_order_id, sales_order_number, production_order_id, sales_order_item_id, spk_number, barcode_uid, product_id, product_part_number, product_description, material_spec, required_qty, stock_on_hand, stock_notes, stock_updated_at_utc, project_name, status, created_at_utc, updated_at_utc)
VALUES
    ('55555555-5555-4555-8555-555555555101', '44444444-4444-4444-8444-444444444004', 'SO-2026038', '46464646-4646-4464-8464-464646464004', '45454545-4545-4454-8454-454545454004', 'SO-2026038', 'PJT|SO|20260425|44444444444444448444444444444004', '22222222-2222-4222-8222-222222222005', 'PJT-FLG-005', 'Flange Coupling DN200 SS304', 'Stainless Steel Bar SS304 diameter 50mm', 10, 2, 'Stok tidak cukup untuk batch penuh', '2026-05-12T03:00:00Z', 'SO-2026038 - Flange Coupling DN200 SS304', 'PurchaseRequested', '2026-05-12T03:00:00Z', '2026-05-12T03:00:00Z'),
    ('55555555-5555-4555-8555-555555555102', '44444444-4444-4444-8444-444444444004', 'SO-2026038', '46464646-4646-4464-8464-464646464004', '45454545-4545-4454-8454-454545454004', 'SO-2026038', 'PJT|SO|20260425|44444444444444448444444444444004', '22222222-2222-4222-8222-222222222005', 'PJT-FLG-005', 'Flange Coupling DN200 SS304', 'Coolant bubut water soluble', 20, 0, 'Coolant habis di mesin bubut', '2026-05-12T03:00:00Z', 'SO-2026038 - Flange Coupling DN200 SS304', 'PurchaseRequested', '2026-05-12T03:00:00Z', '2026-05-12T03:00:00Z'),
    ('55555555-5555-4555-8555-555555555103', '44444444-4444-4444-8444-444444444005', 'SO-2026045', '46464646-4646-4464-8464-464646464005', '45454545-4545-4454-8454-454545454005', 'SO-2026045', 'PJT|SO|20260501|44444444444444448444444444444005', '22222222-2222-4222-8222-222222222006', 'PJT-PLT-006', 'Precision Lathe Fixture Plate A6061', 'Aluminium Plate A6061 500x500x20mm', 5, 1, 'Perlu tambahan plate untuk rework fixture', '2026-05-13T03:00:00Z', 'SO-2026045 - Precision Lathe Fixture Plate A6061', 'PurchaseApproved', '2026-05-13T03:00:00Z', '2026-05-14T03:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET sales_order_id = EXCLUDED.sales_order_id,
    sales_order_number = EXCLUDED.sales_order_number,
    production_order_id = EXCLUDED.production_order_id,
    sales_order_item_id = EXCLUDED.sales_order_item_id,
    spk_number = EXCLUDED.spk_number,
    barcode_uid = EXCLUDED.barcode_uid,
    product_id = EXCLUDED.product_id,
    product_part_number = EXCLUDED.product_part_number,
    product_description = EXCLUDED.product_description,
    material_spec = EXCLUDED.material_spec,
    required_qty = EXCLUDED.required_qty,
    stock_on_hand = EXCLUDED.stock_on_hand,
    stock_notes = EXCLUDED.stock_notes,
    stock_updated_at_utc = EXCLUDED.stock_updated_at_utc,
    project_name = EXCLUDED.project_name,
    status = EXCLUDED.status,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO purchase_requests ("Id", pr_number, request_date, requested_by_user_id, requester_name, sales_order_id, sales_order_number, project_name, status, reviewed_by_user_id, reviewed_at_utc, rejection_reason, supervisor_reviewed_by_user_id, supervisor_reviewed_at_utc, supervisor_rejection_reason, finance_reviewed_by_user_id, finance_reviewed_at_utc, finance_rejection_reason, created_at_utc, updated_at_utc)
VALUES
    ('55555555-5555-4555-8555-555555555201', 'MR-2405-018', '2026-05-24', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '44444444-4444-4444-8444-444444444004', 'SO-2026038', 'SO-2026038 - Flange Coupling DN200 SS304', 'Submitted', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-24T06:10:00Z', '2026-05-24T06:10:00Z'),
    ('55555555-5555-4555-8555-555555555202', 'MR-2405-017', '2026-05-22', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', NULL, NULL, 'Maintenance - Spare Parts', 'SupervisorApproved', '90000000-0000-4000-8000-000000000007', '2026-05-23T02:15:00Z', NULL, '90000000-0000-4000-8000-000000000007', '2026-05-23T02:15:00Z', NULL, NULL, NULL, NULL, '2026-05-22T04:00:00Z', '2026-05-23T02:15:00Z'),
    ('55555555-5555-4555-8555-555555555203', 'MR-2405-016', '2026-05-21', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', NULL, NULL, 'QC - Consumable Lab', 'FinanceApproved', '90000000-0000-4000-8000-000000000005', '2026-05-21T07:20:00Z', NULL, '90000000-0000-4000-8000-000000000007', '2026-05-21T05:15:00Z', NULL, '90000000-0000-4000-8000-000000000005', '2026-05-21T07:20:00Z', NULL, '2026-05-21T04:00:00Z', '2026-05-21T07:20:00Z'),
    ('55555555-5555-4555-8555-555555555204', 'MR-2405-015', '2026-05-20', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '44444444-4444-4444-8444-444444444005', 'SO-2026045', 'SO-2026045 - Precision Lathe Fixture Plate A6061', 'Processing', '90000000-0000-4000-8000-000000000005', '2026-05-20T09:30:00Z', NULL, '90000000-0000-4000-8000-000000000007', '2026-05-20T08:15:00Z', NULL, '90000000-0000-4000-8000-000000000005', '2026-05-20T09:30:00Z', NULL, '2026-05-20T04:00:00Z', '2026-05-22T03:00:00Z'),
    ('55555555-5555-4555-8555-555555555205', 'MR-2405-014', '2026-05-19', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', NULL, NULL, 'Consumable - Coolant General', 'Completed', '90000000-0000-4000-8000-000000000005', '2026-05-19T08:30:00Z', NULL, '90000000-0000-4000-8000-000000000007', '2026-05-19T07:15:00Z', NULL, '90000000-0000-4000-8000-000000000005', '2026-05-19T08:30:00Z', NULL, '2026-05-19T04:00:00Z', '2026-05-24T03:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET pr_number = EXCLUDED.pr_number,
    request_date = EXCLUDED.request_date,
    requested_by_user_id = EXCLUDED.requested_by_user_id,
    requester_name = EXCLUDED.requester_name,
    sales_order_id = EXCLUDED.sales_order_id,
    sales_order_number = EXCLUDED.sales_order_number,
    project_name = EXCLUDED.project_name,
    status = EXCLUDED.status,
    reviewed_by_user_id = EXCLUDED.reviewed_by_user_id,
    reviewed_at_utc = EXCLUDED.reviewed_at_utc,
    rejection_reason = EXCLUDED.rejection_reason,
    supervisor_reviewed_by_user_id = EXCLUDED.supervisor_reviewed_by_user_id,
    supervisor_reviewed_at_utc = EXCLUDED.supervisor_reviewed_at_utc,
    supervisor_rejection_reason = EXCLUDED.supervisor_rejection_reason,
    finance_reviewed_by_user_id = EXCLUDED.finance_reviewed_by_user_id,
    finance_reviewed_at_utc = EXCLUDED.finance_reviewed_at_utc,
    finance_rejection_reason = EXCLUDED.finance_rejection_reason,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO purchase_request_items ("Id", purchase_request_id, material_requirement_id, sales_order_id, sales_order_number, production_order_id, spk_number, project_name, item_name, size, qty, urgency, purchase_category, suggested_supplier, supplier_name, po_number, estimated_price, total_price, purchase_date, expected_arrival_date, received_date, purchase_status, purchase_notes, rejection_reason, notes, created_at_utc, updated_at_utc)
VALUES
    ('55555555-5555-4555-8555-555555555301', '55555555-5555-4555-8555-555555555201', '55555555-5555-4555-8555-555555555101', '44444444-4444-4444-8444-444444444004', 'SO-2026038', '46464646-4646-4464-8464-464646464004', 'SO-2026038', 'SO-2026038 - Flange Coupling DN200 SS304', 'Stainless Steel Bar SS304', 'Diameter 50mm, 3m', 10, 'Urgent', 'Project', 'PT Krakatau Steel', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Requested', NULL, NULL, 'Material utama flange coupling', '2026-05-24T06:10:00Z', '2026-05-24T06:10:00Z'),
    ('55555555-5555-4555-8555-555555555302', '55555555-5555-4555-8555-555555555201', '55555555-5555-4555-8555-555555555102', '44444444-4444-4444-8444-444444444004', 'SO-2026038', '46464646-4646-4464-8464-464646464004', 'SO-2026038', 'SO-2026038 - Flange Coupling DN200 SS304', 'Coolant Bubut', 'Water soluble coolant', 20, 'Critical', 'Consumable', 'UD Maju Jaya', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Requested', NULL, NULL, 'Coolant habis di mesin bubut', '2026-05-24T06:10:00Z', '2026-05-24T06:10:00Z'),
    ('55555555-5555-4555-8555-555555555303', '55555555-5555-4555-8555-555555555202', NULL, NULL, NULL, NULL, NULL, 'Maintenance - Spare Parts', 'Bearing SKF 6205-2RS', 'Original SKF', 6, 'Normal', 'Maintenance', 'PT Sumber Teknik', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Requested', NULL, NULL, 'Preventive maintenance mesin press', '2026-05-22T04:00:00Z', '2026-05-23T02:15:00Z'),
    ('55555555-5555-4555-8555-555555555304', '55555555-5555-4555-8555-555555555202', NULL, NULL, NULL, NULL, NULL, 'Maintenance - Spare Parts', 'V-Belt A48', 'A-Section 48 inch', 4, 'Normal', 'Maintenance', 'PT Sumber Teknik', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Requested', NULL, NULL, 'Preventive maintenance mesin press', '2026-05-22T04:00:00Z', '2026-05-23T02:15:00Z'),
    ('55555555-5555-4555-8555-555555555305', '55555555-5555-4555-8555-555555555203', NULL, NULL, NULL, NULL, NULL, 'QC - Consumable Lab', 'Cat Epoxy Primer Grey', '4L per kaleng', 4, 'Normal', 'Consumable', 'UD Maju Jaya', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, 'Bahan uji QC akhir bulan', '2026-05-21T04:00:00Z', '2026-05-21T07:20:00Z'),
    ('55555555-5555-4555-8555-555555555306', '55555555-5555-4555-8555-555555555203', NULL, NULL, NULL, NULL, NULL, 'QC - Consumable Lab', 'Thinner Epoxy', '4L per kaleng', 4, 'Normal', 'Consumable', 'UD Maju Jaya', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, 'Bahan uji QC akhir bulan', '2026-05-21T04:00:00Z', '2026-05-21T07:20:00Z'),
    ('55555555-5555-4555-8555-555555555307', '55555555-5555-4555-8555-555555555204', '55555555-5555-4555-8555-555555555103', '44444444-4444-4444-8444-444444444005', 'SO-2026045', '46464646-4646-4464-8464-464646464005', 'SO-2026045', 'SO-2026045 - Precision Lathe Fixture Plate A6061', 'Aluminium Plate A6061', '500x500x20mm, T6', 5, 'Urgent', 'Project', 'CV Logam Jaya', 'CV Logam Jaya', 'PO-2405-028', 2750000, 2750000, '2026-05-21', '2026-05-24', NULL, 'Ordered', 'Menunggu pengiriman supplier', NULL, 'Material fixture plate', '2026-05-20T04:00:00Z', '2026-05-22T03:00:00Z'),
    ('55555555-5555-4555-8555-555555555308', '55555555-5555-4555-8555-555555555205', NULL, NULL, NULL, NULL, NULL, 'Consumable - Coolant General', 'Coolant Bubut', 'Water soluble coolant', 30, 'Normal', 'Consumable', 'UD Maju Jaya', 'UD Maju Jaya', 'PO-2405-027', 4500000, 4500000, '2026-05-19', '2026-05-24', '2026-05-24', 'Received', 'Diterima lengkap oleh gudang', NULL, 'Consumable bisa dipakai beberapa SO', '2026-05-19T04:00:00Z', '2026-05-24T03:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET purchase_request_id = EXCLUDED.purchase_request_id,
    material_requirement_id = EXCLUDED.material_requirement_id,
    sales_order_id = EXCLUDED.sales_order_id,
    sales_order_number = EXCLUDED.sales_order_number,
    production_order_id = EXCLUDED.production_order_id,
    spk_number = EXCLUDED.spk_number,
    project_name = EXCLUDED.project_name,
    item_name = EXCLUDED.item_name,
    size = EXCLUDED.size,
    qty = EXCLUDED.qty,
    urgency = EXCLUDED.urgency,
    purchase_category = EXCLUDED.purchase_category,
    suggested_supplier = EXCLUDED.suggested_supplier,
    supplier_name = EXCLUDED.supplier_name,
    po_number = EXCLUDED.po_number,
    estimated_price = EXCLUDED.estimated_price,
    total_price = EXCLUDED.total_price,
    purchase_date = EXCLUDED.purchase_date,
    expected_arrival_date = EXCLUDED.expected_arrival_date,
    received_date = EXCLUDED.received_date,
    purchase_status = EXCLUDED.purchase_status,
    purchase_notes = EXCLUDED.purchase_notes,
    rejection_reason = EXCLUDED.rejection_reason,
    notes = EXCLUDED.notes,
    updated_at_utc = EXCLUDED.updated_at_utc;
