INSERT INTO customer_replicas ("Id", code, name, email, is_active, updated_at_utc)
VALUES
    ('11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'agus@metalfastindo.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111002', '0002', 'PT. SUMBER JAYA STEEL', 'lisa@sumberjayasteel.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111003', '0003', 'CV. TEKNIK MANDIRI', 'budi@teknikmandiri.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111004', '0004', 'PT. INDO PRESISI PART', 'harry@indopresisi.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'rini@anekakomponen.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111006', '0006', 'PT. GLOBAL ENGINEERING', 'david@globalengineering.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111007', '0007', 'CV. MAJU BERSAMA TEKNIK', 'joni@majubersamateknik.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111008', '0008', 'PT. PRIMA SOLUSI INDUSTRI', 'wati@primasolusi.co.id', true, '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111009', 'CUST-9012', 'PT. PRESISI BAUT NUSANTARA', 'raka@presisibaut.co.id', true, '2026-06-01T00:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO product_replicas ("Id", part_number, description, unit, material_spec, is_active, updated_at_utc)
VALUES
    ('22222222-2222-4222-8222-222222222001', 'FG-0001', 'Bearing Housing Custom 150mm', 'PCS', 'ST37 / SS304 sesuai drawing', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222002', 'FG-0002', 'Drive Shaft Assembly 80mm', 'PCS', 'SS304 round bar 80mm', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222003', 'FG-0003', 'Ball Valve Body DN100 SS316', 'PCS', 'SS316 casting body', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222004', 'FG-0004', 'Gearbox Housing Cast Iron FC250', 'SET', 'FC250 cast iron', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222005', 'FG-0005', 'Flange Coupling DN200 SS304', 'PCS', 'SS304 bar 50mm and plate 10mm', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222006', 'FG-0006', 'Precision Lathe Fixture Plate A6061', 'PCS', 'Aluminium A6061-T6 plate', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222007', 'FG-0007', 'Pump Housing Aluminium A356', 'PCS', 'Aluminium A356', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222008', 'FG-0008', 'Brake Drum Custom 250mm OD', 'PCS', 'FC250 cast iron', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222009', 'FG-0009', 'Sprocket Chain 40T Duplex Grade A', 'PCS', 'SCM440 hardened steel', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222010', 'FG-0010', 'Camshaft Bearing Seat 70mm CrMo', 'PCS', 'AISI 4130 CrMo', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222011', 'FG-0011', 'Hydraulic Cylinder Rod End SS316L', 'PCS', 'SS316L rod stock', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222012', 'FG-0012', 'Baut Custom 0.05mm', 'PCS', 'High precision steel wire and coolant process', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222101', 'MAT-0001', 'Baja Karbon ST37 (Round Bar 50mm)', 'KG', 'Carbon Steel ST37', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222102', 'MAT-0002', 'Stainless Steel 304 (Sheet 10mm)', 'KG', 'SS304 Plate', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222103', 'MAT-0003', 'Aluminium Alloy A6061 (Block)', 'KG', 'Aluminium A6061-T6', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222104', 'MAT-0004', 'Besi Cor FC250 (Casting)', 'KG', 'Cast Iron FC250', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222105', 'MAT-0005', 'AISI 4130 CrMo (Alloy Steel)', 'KG', 'AISI 4130 Chromium Molybdenum', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222201', 'TLS-0001', 'Carbide Insert CNMG 120408', 'PCS', 'Tungsten Carbide, TiN coated', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222202', 'TLS-0002', 'End Mill HSS 10mm', 'PCS', 'High Speed Steel 4-Flute', true, '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222203', 'TLS-0003', 'Tap M10x1.5', 'PCS', 'HSS-Co Spiral Flute', true, '2026-06-01T00:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET part_number = EXCLUDED.part_number,
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    material_spec = EXCLUDED.material_spec,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;



INSERT INTO sales_orders ("Id", so_number, customer_id, customer_code, customer_name, customer_email, customer_drawing_url, design_reference, design_status, design_approved_by_user_id, design_approved_by_name, design_approved_at_utc, so_date, target_date, production_worker_user_id, production_worker_name, qc_reviewer_user_id, qc_reviewer_name, status, approved_by_user_id, approved_at_utc, created_at_utc, updated_at_utc)
VALUES
    ('44444444-4444-4444-8444-444444444001', 'SO-2026-001', '11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'agus@metalfastindo.co.id', 'https://drive.google.com/file/d/customer-bearing-housing', 'DES-2026-001', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-04-05T09:00:00Z', '2026-04-01', '2026-06-15', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'Completed', '90000000-0000-4000-8000-000000000003', '2026-04-09T09:00:00Z', '2026-04-01T08:00:00Z', '2026-04-27T10:00:00Z'),
    ('44444444-4444-4444-8444-444444444002', 'SO-2026-002', '11111111-1111-4111-8111-111111111002', '0002', 'PT. SUMBER JAYA STEEL', 'lisa@sumberjayasteel.co.id', 'https://drive.google.com/file/d/customer-drive-shaft', 'DES-2026-002', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-04-09T09:00:00Z', '2026-04-05', '2026-06-20', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'Completed', '90000000-0000-4000-8000-000000000003', '2026-04-11T09:00:00Z', '2026-04-05T08:00:00Z', '2026-04-30T10:00:00Z'),
    ('44444444-4444-4444-8444-444444444003', 'SO-2026-025', '11111111-1111-4111-8111-111111111003', '0003', 'CV. TEKNIK MANDIRI', 'budi@teknikmandiri.co.id', 'https://drive.google.com/file/d/customer-gearbox', 'DES-2026-003', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-04-24T09:00:00Z', '2026-04-20', '2026-06-25', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'InProduction', '90000000-0000-4000-8000-000000000003', '2026-04-30T09:00:00Z', '2026-04-20T08:00:00Z', '2026-05-10T17:00:00Z'),
    ('44444444-4444-4444-8444-444444444004', 'SO-2026-038', '11111111-1111-4111-8111-111111111004', '0004', 'PT. INDO PRESISI PART', 'harry@indopresisi.co.id', 'https://drive.google.com/file/d/customer-flange', 'DES-2026-004', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-04-29T09:00:00Z', '2026-04-25', '2026-07-01', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'InProduction', '90000000-0000-4000-8000-000000000003', '2026-05-01T09:00:00Z', '2026-04-25T08:00:00Z', '2026-05-05T07:30:00Z'),
    ('44444444-4444-4444-8444-444444444005', 'SO-2026-045', '11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'rini@anekakomponen.co.id', 'https://drive.google.com/file/d/customer-fixture', 'DES-2026-005', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-05-05T09:00:00Z', '2026-05-01', '2026-07-10', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'InProduction', '90000000-0000-4000-8000-000000000003', '2026-05-07T09:00:00Z', '2026-05-01T08:00:00Z', '2026-05-07T09:00:00Z'),
    ('44444444-4444-4444-8444-444444444006', 'SO-2026-051', '11111111-1111-4111-8111-111111111006', '0006', 'PT. GLOBAL ENGINEERING', 'david@globalengineering.co.id', 'https://drive.google.com/file/d/customer-pump-housing', 'DES-2026-006', 'Approved', '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', '2026-05-09T09:00:00Z', '2026-05-05', '2026-07-15', NULL, NULL, '90000000-0000-4000-8000-000000000007', 'Dimas Supervisor', 'Confirmed', '90000000-0000-4000-8000-000000000003', '2026-05-10T09:00:00Z', '2026-05-05T08:00:00Z', '2026-05-10T09:00:00Z'),
    ('44444444-4444-4444-8444-444444444007', 'SO-2026-058', '11111111-1111-4111-8111-111111111007', '0007', 'CV. MAJU BERSAMA TEKNIK', 'joni@majubersamateknik.co.id', 'https://drive.google.com/file/d/customer-brake-drum', 'DES-2026-007', 'WaitingApproval', NULL, NULL, NULL, '2026-05-07', '2026-07-20', NULL, NULL, NULL, NULL, 'Draft', NULL, NULL, '2026-05-07T08:00:00Z', '2026-05-09T08:00:00Z'),
    ('44444444-4444-4444-8444-444444444008', 'SO-2026-064', '11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'agus@metalfastindo.co.id', NULL, NULL, 'PendingDesign', NULL, NULL, NULL, '2026-05-09', '2026-07-25', NULL, NULL, NULL, NULL, 'Draft', NULL, NULL, '2026-05-09T08:00:00Z', '2026-05-09T08:00:00Z'),
    ('44444444-4444-4444-8444-444444444009', 'SO-2026-075', '11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'rini@anekakomponen.co.id', 'https://drive.google.com/file/d/customer-bearing-set', 'DES-2026-009', 'RevisionRequired', NULL, NULL, NULL, '2026-05-12', '2026-08-05', NULL, NULL, NULL, NULL, 'Draft', NULL, NULL, '2026-05-12T08:00:00Z', '2026-05-14T08:00:00Z'),
    ('44444444-4444-4444-8444-444444444010', 'SO-2026-074', '11111111-1111-4111-8111-111111111004', '0004', 'PT. INDO PRESISI PART', 'harry@indopresisi.co.id', 'https://drive.google.com/file/d/customer-heavy-nut', 'DES-2026-010', 'Rejected', NULL, NULL, NULL, '2026-05-03', '2026-08-10', NULL, NULL, NULL, NULL, 'Cancelled', NULL, NULL, '2026-05-03T08:00:00Z', '2026-05-05T08:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET so_number = EXCLUDED.so_number,
    customer_id = EXCLUDED.customer_id,
    customer_code = EXCLUDED.customer_code,
    customer_name = EXCLUDED.customer_name,
    customer_email = EXCLUDED.customer_email,
    customer_drawing_url = EXCLUDED.customer_drawing_url,
    design_reference = EXCLUDED.design_reference,
    design_status = EXCLUDED.design_status,
    design_approved_by_user_id = EXCLUDED.design_approved_by_user_id,
    design_approved_by_name = EXCLUDED.design_approved_by_name,
    design_approved_at_utc = EXCLUDED.design_approved_at_utc,
    so_date = EXCLUDED.so_date,
    target_date = EXCLUDED.target_date,
    production_worker_user_id = EXCLUDED.production_worker_user_id,
    production_worker_name = EXCLUDED.production_worker_name,
    qc_reviewer_user_id = EXCLUDED.qc_reviewer_user_id,
    qc_reviewer_name = EXCLUDED.qc_reviewer_name,
    status = EXCLUDED.status,
    approved_by_user_id = EXCLUDED.approved_by_user_id,
    approved_at_utc = EXCLUDED.approved_at_utc,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO sales_order_items ("Id", sales_order_id, product_id, product_part_number, product_description, product_material_spec, qty, unit_price, notes, created_at_utc, updated_at_utc)
VALUES
    ('45454545-4545-4454-8454-454545454001', '44444444-4444-4444-8444-444444444001', '22222222-2222-4222-8222-222222222001', 'FG-0001', 'Bearing Housing Custom 150mm', 'ST37 / SS304 sesuai drawing', 25, 1500000, 'SO seed dari backend', '2026-04-01T08:00:00Z', '2026-04-27T10:00:00Z'),
    ('45454545-4545-4454-8454-454545454002', '44444444-4444-4444-8444-444444444002', '22222222-2222-4222-8222-222222222002', 'FG-0002', 'Drive Shaft Assembly 80mm', 'SS304 round bar 80mm', 10, 850000, 'SO seed dari backend', '2026-04-05T08:00:00Z', '2026-04-30T10:00:00Z'),
    ('45454545-4545-4454-8454-454545454003', '44444444-4444-4444-8444-444444444003', '22222222-2222-4222-8222-222222222004', 'FG-0004', 'Gearbox Housing Cast Iron FC250', 'FC250 cast iron', 5, 2400000, 'Menunggu QC Go/NoGo', '2026-04-20T08:00:00Z', '2026-05-10T17:00:00Z'),
    ('45454545-4545-4454-8454-454545454004', '44444444-4444-4444-8444-444444444004', '22222222-2222-4222-8222-222222222005', 'FG-0005', 'Flange Coupling DN200 SS304', 'SS304 bar 50mm and plate 10mm', 20, 320000, 'Butuh coolant dan bar SS304', '2026-04-25T08:00:00Z', '2026-05-05T07:30:00Z'),
    ('45454545-4545-4454-8454-454545454005', '44444444-4444-4444-8444-444444444005', '22222222-2222-4222-8222-222222222006', 'FG-0006', 'Precision Lathe Fixture Plate A6061', 'Aluminium A6061-T6 plate', 3, 1150000, 'Persiapan material', '2026-05-01T08:00:00Z', '2026-05-07T09:00:00Z'),
    ('45454545-4545-4454-8454-454545454006', '44444444-4444-4444-8444-444444444006', '22222222-2222-4222-8222-222222222007', 'FG-0007', 'Pump Housing Aluminium A356', 'Aluminium A356', 8, 980000, 'Menunggu penugasan operator', '2026-05-05T08:00:00Z', '2026-05-10T09:00:00Z'),
    ('45454545-4545-4454-8454-454545454007', '44444444-4444-4444-8444-444444444007', '22222222-2222-4222-8222-222222222008', 'FG-0008', 'Brake Drum Custom 250mm OD', 'FC250 cast iron', 15, 650000, 'Menunggu approval desain', '2026-05-07T08:00:00Z', '2026-05-09T08:00:00Z'),
    ('45454545-4545-4454-8454-454545454008', '44444444-4444-4444-8444-444444444008', '22222222-2222-4222-8222-222222222009', 'FG-0009', 'Sprocket Chain 40T Duplex Grade A', 'SCM440 hardened steel', 30, 180000, 'Belum ada desain', '2026-05-09T08:00:00Z', '2026-05-09T08:00:00Z'),
    ('45454545-4545-4454-8454-454545454009', '44444444-4444-4444-8444-444444444009', '22222222-2222-4222-8222-222222222001', 'FG-0013', 'Connecting Rod Bearing Set 60mm', 'Bearing steel set', 50, 420000, 'Toleransi perlu revisi', '2026-05-12T08:00:00Z', '2026-05-14T08:00:00Z'),
    ('45454545-4545-4454-8454-454545454010', '44444444-4444-4444-8444-444444444010', '22222222-2222-4222-8222-222222222012', 'FG-0014', 'Heavy Hex Nut M52 Grade 10.9', 'Grade 10.9 alloy steel', 200, 25000, 'Ditolak permanen', '2026-05-03T08:00:00Z', '2026-05-05T08:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET sales_order_id = EXCLUDED.sales_order_id,
    product_id = EXCLUDED.product_id,
    product_part_number = EXCLUDED.product_part_number,
    product_description = EXCLUDED.product_description,
    product_material_spec = EXCLUDED.product_material_spec,
    qty = EXCLUDED.qty,
    unit_price = EXCLUDED.unit_price,
    notes = EXCLUDED.notes,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO production_orders ("Id", po_number, sales_order_id, sales_order_item_id, drawing_ref, drawing_file_url, drawing_uploaded_by_user_id, drawing_uploader_name, drawing_uploaded_at_utc, barcode_uid, order_qty, status, started_at_utc, started_by_user_id, started_by_name, finished_at_utc, finished_by_user_id, finished_by_name, qc_decision, created_at_utc, updated_at_utc)
VALUES
    ('46464646-4646-4464-8464-464646464001', 'SO-2026-001', '44444444-4444-4444-8444-444444444001', '45454545-4545-4454-8454-454545454001', 'DES-2026-001', 'https://drive.google.com/file/d/pjt-drawing-001', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-06T09:00:00Z', 'PJT|SO|20260401|44444444444444448444444444444001', 25, 'Closed', '2026-04-10T08:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-25T16:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', 'Go', '2026-04-09T09:00:00Z', '2026-04-27T10:00:00Z'),
    ('46464646-4646-4464-8464-464646464002', 'SO-2026-002', '44444444-4444-4444-8444-444444444002', '45454545-4545-4454-8454-454545454002', 'DES-2026-002', 'https://drive.google.com/file/d/pjt-drawing-002', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-10T09:00:00Z', 'PJT|SO|20260405|44444444444444448444444444444002', 10, 'Closed', '2026-04-12T09:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-28T15:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', 'NoGo', '2026-04-11T09:00:00Z', '2026-04-30T10:00:00Z'),
    ('46464646-4646-4464-8464-464646464003', 'SO-2026-025', '44444444-4444-4444-8444-444444444003', '45454545-4545-4454-8454-454545454003', 'DES-2026-003', 'https://drive.google.com/file/d/pjt-drawing-003', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-25T09:00:00Z', 'PJT|SO|20260420|44444444444444448444444444444003', 5, 'Finished', '2026-05-01T08:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-05-10T17:00:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', NULL, '2026-04-30T09:00:00Z', '2026-05-10T17:00:00Z'),
    ('46464646-4646-4464-8464-464646464004', 'SO-2026-038', '44444444-4444-4444-8444-444444444004', '45454545-4545-4454-8454-454545454004', 'DES-2026-004', 'https://drive.google.com/file/d/pjt-drawing-004', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-04-30T09:00:00Z', 'PJT|SO|20260425|44444444444444448444444444444004', 20, 'InProgress', '2026-05-05T07:30:00Z', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', NULL, NULL, NULL, NULL, '2026-05-01T09:00:00Z', '2026-05-05T07:30:00Z'),
    ('46464646-4646-4464-8464-464646464005', 'SO-2026-045', '44444444-4444-4444-8444-444444444005', '45454545-4545-4454-8454-454545454005', 'DES-2026-005', 'https://drive.google.com/file/d/pjt-drawing-005', '90000000-0000-4000-8000-000000000002', 'Reza Firmansyah', '2026-05-06T09:00:00Z', 'PJT|SO|20260501|44444444444444448444444444444005', 3, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET po_number = EXCLUDED.po_number,
    sales_order_id = EXCLUDED.sales_order_id,
    sales_order_item_id = EXCLUDED.sales_order_item_id,
    drawing_ref = EXCLUDED.drawing_ref,
    drawing_file_url = EXCLUDED.drawing_file_url,
    drawing_uploaded_by_user_id = EXCLUDED.drawing_uploaded_by_user_id,
    drawing_uploader_name = EXCLUDED.drawing_uploader_name,
    drawing_uploaded_at_utc = EXCLUDED.drawing_uploaded_at_utc,
    barcode_uid = EXCLUDED.barcode_uid,
    order_qty = EXCLUDED.order_qty,
    status = EXCLUDED.status,
    started_at_utc = EXCLUDED.started_at_utc,
    started_by_user_id = EXCLUDED.started_by_user_id,
    started_by_name = EXCLUDED.started_by_name,
    finished_at_utc = EXCLUDED.finished_at_utc,
    finished_by_user_id = EXCLUDED.finished_by_user_id,
    finished_by_name = EXCLUDED.finished_by_name,
    qc_decision = EXCLUDED.qc_decision,
    updated_at_utc = EXCLUDED.updated_at_utc;
