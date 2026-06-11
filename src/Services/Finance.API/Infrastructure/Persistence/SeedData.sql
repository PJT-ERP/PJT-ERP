INSERT INTO invoice_candidates (sales_order_id, sales_order_number, customer_id, customer_code, customer_name, customer_email, target_date, completed_at_utc, status, created_at_utc, updated_at_utc)
VALUES
    ('44444444-4444-4444-8444-444444444003', 'SO-2026-025', '11111111-1111-4111-8111-111111111003', '0003', 'CV. TEKNIK MANDIRI', 'budi@teknikmandiri.co.id', '2026-06-25', '2026-05-10T17:00:00Z', 'ReadyForInvoice', '2026-05-10T17:00:00Z', '2026-05-10T17:00:00Z'),
    ('44444444-4444-4444-8444-444444444005', 'SO-2026-045', '11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'rini@anekakomponen.co.id', '2026-07-10', '2026-05-07T09:00:00Z', 'ReadyForInvoice', '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z')
ON CONFLICT (sales_order_id) DO UPDATE
SET sales_order_number = EXCLUDED.sales_order_number,
    customer_id = EXCLUDED.customer_id,
    customer_code = EXCLUDED.customer_code,
    customer_name = EXCLUDED.customer_name,
    customer_email = EXCLUDED.customer_email,
    target_date = EXCLUDED.target_date,
    completed_at_utc = EXCLUDED.completed_at_utc,
    status = EXCLUDED.status,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO invoice_candidate_items (id, sales_order_id, sales_order_item_id, product_id, product_part_number, product_description, qty)
VALUES
    ('66666666-6666-4666-8666-666666666101', '44444444-4444-4444-8444-444444444003', '45454545-4545-4454-8454-454545454003', '22222222-2222-4222-8222-222222222004', 'PJT-GBX-004', 'Gearbox Housing Cast Iron FC250', 5),
    ('66666666-6666-4666-8666-666666666102', '44444444-4444-4444-8444-444444444005', '45454545-4545-4454-8454-454545454005', '22222222-2222-4222-8222-222222222006', 'PJT-PLT-006', 'Precision Lathe Fixture Plate A6061', 3)
ON CONFLICT (id) DO UPDATE
SET sales_order_id = EXCLUDED.sales_order_id,
    sales_order_item_id = EXCLUDED.sales_order_item_id,
    product_id = EXCLUDED.product_id,
    product_part_number = EXCLUDED.product_part_number,
    product_description = EXCLUDED.product_description,
    qty = EXCLUDED.qty;

INSERT INTO invoices (id, invoice_number, sales_order_id, sales_order_number, customer_id, customer_code, customer_name, customer_email, invoice_date, due_date, subtotal, tax_percent, tax_amount, total_amount, paid_amount, payment_percent, status, bank_name, bank_account_name, bank_account_number, created_at_utc, updated_at_utc)
VALUES
    ('66666666-6666-4666-8666-666666666201', 'INV-2026-0451', '44444444-4444-4444-8444-444444444001', 'SO-2026-001', '11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'agus@metalfastindo.co.id', '2026-06-01', '2026-06-15', 45000000, 11, 4950000, 49950000, 0, 0, 'Issued', 'BCA', 'PT Pratama Jaya', '1234567890', '2026-06-01T03:00:00Z', '2026-06-01T03:00:00Z'),
    ('66666666-6666-4666-8666-666666666202', 'INV-2026-0452', '44444444-4444-4444-8444-444444444002', 'SO-2026-002', '11111111-1111-4111-8111-111111111002', '0002', 'PT. SUMBER JAYA STEEL', 'lisa@sumberjayasteel.co.id', '2026-05-28', '2026-06-08', 18500000, 11, 2035000, 20535000, 10000000, 48.70, 'PartiallyPaid', 'BCA', 'PT Pratama Jaya', '1234567890', '2026-05-28T03:00:00Z', '2026-06-09T03:00:00Z'),
    ('66666666-6666-4666-8666-666666666203', 'INV-2026-0453', '44444444-4444-4444-8444-444444444006', 'SO-2026-051', '11111111-1111-4111-8111-111111111006', '0006', 'PT. GLOBAL ENGINEERING', 'david@globalengineering.co.id', '2026-05-18', '2026-06-01', 32000000, 11, 3520000, 35520000, 35520000, 100, 'Paid', 'BCA', 'PT Pratama Jaya', '1234567890', '2026-05-18T03:00:00Z', '2026-05-30T03:00:00Z'),
    ('66666666-6666-4666-8666-666666666204', 'INV-2026-0454', '44444444-4444-4444-8444-444444444007', 'SO-2026-058', '11111111-1111-4111-8111-111111111007', '0007', 'CV. MAJU BERSAMA TEKNIK', 'joni@majubersamateknik.co.id', '2026-06-05', '2026-06-20', 27500000, 11, 3025000, 30525000, 7625000, 24.98, 'PartiallyPaid', 'BCA', 'PT Pratama Jaya', '1234567890', '2026-06-05T03:00:00Z', '2026-06-06T03:00:00Z')
ON CONFLICT (id) DO UPDATE
SET invoice_number = EXCLUDED.invoice_number,
    sales_order_id = EXCLUDED.sales_order_id,
    sales_order_number = EXCLUDED.sales_order_number,
    customer_id = EXCLUDED.customer_id,
    customer_code = EXCLUDED.customer_code,
    customer_name = EXCLUDED.customer_name,
    customer_email = EXCLUDED.customer_email,
    invoice_date = EXCLUDED.invoice_date,
    due_date = EXCLUDED.due_date,
    subtotal = EXCLUDED.subtotal,
    tax_percent = EXCLUDED.tax_percent,
    tax_amount = EXCLUDED.tax_amount,
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_percent = EXCLUDED.payment_percent,
    status = EXCLUDED.status,
    bank_name = EXCLUDED.bank_name,
    bank_account_name = EXCLUDED.bank_account_name,
    bank_account_number = EXCLUDED.bank_account_number,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO invoice_items (id, invoice_id, sales_order_item_id, product_id, part_number, description, qty, unit_price, line_total)
VALUES
    ('66666666-6666-4666-8666-666666666301', '66666666-6666-4666-8666-666666666201', '45454545-4545-4454-8454-454545454001', '22222222-2222-4222-8222-222222222001', 'PJT-BRG-001', 'Bearing Housing Custom 150mm', 25, 1800000, 45000000),
    ('66666666-6666-4666-8666-666666666302', '66666666-6666-4666-8666-666666666202', '45454545-4545-4454-8454-454545454002', '22222222-2222-4222-8222-222222222002', 'PJT-SHF-002', 'Drive Shaft Assembly 80mm', 10, 1850000, 18500000),
    ('66666666-6666-4666-8666-666666666303', '66666666-6666-4666-8666-666666666203', '45454545-4545-4454-8454-454545454006', '22222222-2222-4222-8222-222222222007', 'PJT-HSG-007', 'Pump Housing Aluminium A356', 8, 4000000, 32000000),
    ('66666666-6666-4666-8666-666666666304', '66666666-6666-4666-8666-666666666204', '45454545-4545-4454-8454-454545454007', '22222222-2222-4222-8222-222222222008', 'PJT-BRK-008', 'Brake Drum Custom 250mm OD', 15, 1833333.33, 27500000)
ON CONFLICT (id) DO UPDATE
SET invoice_id = EXCLUDED.invoice_id,
    sales_order_item_id = EXCLUDED.sales_order_item_id,
    product_id = EXCLUDED.product_id,
    part_number = EXCLUDED.part_number,
    description = EXCLUDED.description,
    qty = EXCLUDED.qty,
    unit_price = EXCLUDED.unit_price,
    line_total = EXCLUDED.line_total;

INSERT INTO payment_schedules (id, invoice_id, label, percentage, amount, due_date, is_paid)
VALUES
    ('66666666-6666-4666-8666-666666666401', '66666666-6666-4666-8666-666666666201', 'DP 50%', 50, 24975000, '2026-06-08', false),
    ('66666666-6666-4666-8666-666666666402', '66666666-6666-4666-8666-666666666201', 'Pelunasan 50%', 50, 24975000, '2026-06-15', false),
    ('66666666-6666-4666-8666-666666666403', '66666666-6666-4666-8666-666666666202', 'DP 50%', 50, 10267500, '2026-06-03', true),
    ('66666666-6666-4666-8666-666666666404', '66666666-6666-4666-8666-666666666202', 'Pelunasan 50%', 50, 10267500, '2026-06-08', false),
    ('66666666-6666-4666-8666-666666666405', '66666666-6666-4666-8666-666666666203', 'Full Payment', 100, 35520000, '2026-06-01', true),
    ('66666666-6666-4666-8666-666666666406', '66666666-6666-4666-8666-666666666204', 'DP 25%', 25, 7631250, '2026-06-07', true),
    ('66666666-6666-4666-8666-666666666407', '66666666-6666-4666-8666-666666666204', 'Pelunasan 75%', 75, 22893750, '2026-06-20', false)
ON CONFLICT (id) DO UPDATE
SET invoice_id = EXCLUDED.invoice_id,
    label = EXCLUDED.label,
    percentage = EXCLUDED.percentage,
    amount = EXCLUDED.amount,
    due_date = EXCLUDED.due_date,
    is_paid = EXCLUDED.is_paid;

INSERT INTO payment_records (id, invoice_id, payment_date, amount, notes, created_at_utc)
VALUES
    ('66666666-6666-4666-8666-666666666501', '66666666-6666-4666-8666-666666666202', '2026-06-03', 10000000, 'Transfer DP dari PT Sumber Jaya Steel', '2026-06-03T04:00:00Z'),
    ('66666666-6666-4666-8666-666666666502', '66666666-6666-4666-8666-666666666203', '2026-05-30', 35520000, 'Pelunasan penuh', '2026-05-30T04:00:00Z'),
    ('66666666-6666-4666-8666-666666666503', '66666666-6666-4666-8666-666666666204', '2026-06-06', 7625000, 'DP 25%', '2026-06-06T04:00:00Z')
ON CONFLICT (id) DO UPDATE
SET invoice_id = EXCLUDED.invoice_id,
    payment_date = EXCLUDED.payment_date,
    amount = EXCLUDED.amount,
    notes = EXCLUDED.notes;

INSERT INTO collection_letters (id, invoice_id, letter_number, issued_date, due_date, notes, created_at_utc)
VALUES
    ('66666666-6666-4666-8666-666666666601', '66666666-6666-4666-8666-666666666202', 'SP-2026-0001', '2026-06-10', '2026-06-17', 'Surat penagihan karena melewati jatuh tempo pelunasan.', '2026-06-10T03:00:00Z')
ON CONFLICT (id) DO UPDATE
SET invoice_id = EXCLUDED.invoice_id,
    letter_number = EXCLUDED.letter_number,
    issued_date = EXCLUDED.issued_date,
    due_date = EXCLUDED.due_date,
    notes = EXCLUDED.notes;
