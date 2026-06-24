INSERT INTO customers ("Id", code, name, address, contact_person, email, phone, is_active, created_at_utc, updated_at_utc)
VALUES
    ('11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'Jl. Industri Raya No. 15, Bekasi', 'Pak Agus', 'agus@metalfastindo.co.id', '081234567801', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111002', '0002', 'PT. SUMBER JAYA STEEL', 'Kawasan KIIC, Karawang', 'Ibu Lisa', 'lisa@sumberjayasteel.co.id', '081234567802', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111003', '0003', 'CV. TEKNIK MANDIRI', 'Jl. Raya Cikarang No. 88, Bekasi', 'Pak Budi', 'budi@teknikmandiri.co.id', '081234567803', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111004', '0004', 'PT. INDO PRESISI PART', 'MM2100 Industrial Town, Cikarang', 'Pak Harry', 'harry@indopresisi.co.id', '081234567804', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'Jl. Gatot Subroto Km.7, Jakarta', 'Ibu Rini', 'rini@anekakomponen.co.id', '081234567805', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111006', '0006', 'PT. GLOBAL ENGINEERING', 'Kawasan Lippo Cikarang', 'Pak David', 'david@globalengineering.co.id', '081234567806', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111007', '0007', 'CV. MAJU BERSAMA TEKNIK', 'Jl. Pahlawan No. 33, Tangerang', 'Pak Joni', 'joni@majubersamateknik.co.id', '081234567807', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111008', '0008', 'PT. PRIMA SOLUSI INDUSTRI', 'BSD City, Tangerang Selatan', 'Ibu Wati', 'wati@primasolusi.co.id', '081234567808', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111009', 'CUST-9012', 'PT. PRESISI BAUT NUSANTARA', 'Kawasan Industri Jababeka, Cikarang', 'Pak Raka', 'raka@presisibaut.co.id', '081234567809', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO products ("Id", part_number, description, unit, material_spec, is_active, created_at_utc, updated_at_utc)
VALUES
    ('22222222-2222-4222-8222-222222222001', 'FG-0001', 'Bearing Housing Custom 150mm', 'PCS', 'ST37 / SS304 sesuai drawing', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222002', 'FG-0002', 'Drive Shaft Assembly 80mm', 'PCS', 'SS304 round bar 80mm', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222003', 'FG-0003', 'Ball Valve Body DN100 SS316', 'PCS', 'SS316 casting body', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222004', 'FG-0004', 'Gearbox Housing Cast Iron FC250', 'SET', 'FC250 cast iron', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222005', 'FG-0005', 'Flange Coupling DN200 SS304', 'PCS', 'SS304 bar 50mm and plate 10mm', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222006', 'FG-0006', 'Precision Lathe Fixture Plate A6061', 'PCS', 'Aluminium A6061-T6 plate', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222007', 'FG-0007', 'Pump Housing Aluminium A356', 'PCS', 'Aluminium A356', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222008', 'FG-0008', 'Brake Drum Custom 250mm OD', 'PCS', 'FC250 cast iron', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222009', 'FG-0009', 'Sprocket Chain 40T Duplex Grade A', 'PCS', 'SCM440 hardened steel', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222010', 'FG-0010', 'Camshaft Bearing Seat 70mm CrMo', 'PCS', 'AISI 4130 CrMo', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222011', 'FG-0011', 'Hydraulic Cylinder Rod End SS316L', 'PCS', 'SS316L rod stock', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222012', 'FG-0012', 'Baut Custom 0.05mm', 'PCS', 'High precision steel wire and coolant process', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222101', 'MAT-0001', 'Baja Karbon ST37 (Round Bar 50mm)', 'KG', 'Carbon Steel ST37', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222102', 'MAT-0002', 'Stainless Steel 304 (Sheet 10mm)', 'KG', 'SS304 Plate', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222103', 'MAT-0003', 'Aluminium Alloy A6061 (Block)', 'KG', 'Aluminium A6061-T6', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222104', 'MAT-0004', 'Besi Cor FC250 (Casting)', 'KG', 'Cast Iron FC250', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222105', 'MAT-0005', 'AISI 4130 CrMo (Alloy Steel)', 'KG', 'AISI 4130 Chromium Molybdenum', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222201', 'TLS-0001', 'Carbide Insert CNMG 120408', 'PCS', 'Tungsten Carbide, TiN coated', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222202', 'TLS-0002', 'End Mill HSS 10mm', 'PCS', 'High Speed Steel 4-Flute', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222203', 'TLS-0003', 'Tap M10x1.5', 'PCS', 'HSS-Co Spiral Flute', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET part_number = EXCLUDED.part_number,
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    material_spec = EXCLUDED.material_spec,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO suppliers ("Id", code, name, type, category, city, province, status, rating, created_at_utc, updated_at_utc)
VALUES
    ('33333333-3333-4333-8333-333333333001', 'SUP-003', 'PT Indo Steel', 'PT', 'Besi & Baja', 'Jakarta Utara', 'DKI Jakarta', 'Active', 4.8, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('33333333-3333-4333-8333-333333333002', 'SUP-007', 'PT Sumber Teknik', 'PT', 'Spare Parts & Bearing', 'Sidoarjo', 'Jawa Timur', 'Active', 4.5, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('33333333-3333-4333-8333-333333333003', 'SUP-012', 'CV Bintang Logam', 'CV', 'Besi & Aluminium', 'Bekasi Barat', 'Jawa Barat', 'Active', 4.2, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('33333333-3333-4333-8333-333333333004', 'SUP-015', 'CV Tekno Prima', 'CV', 'Alat Las & Consumable', 'Tangerang', 'Banten', 'Active', 4.0, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('33333333-3333-4333-8333-333333333005', 'SUP-021', 'UD Maju Jaya', 'UD', 'Cat & Bahan Kimia', 'Cikarang Selatan', 'Jawa Barat', 'On Hold', 3.5, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z')
ON CONFLICT ("Id") DO UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    city = EXCLUDED.city,
    status = EXCLUDED.status,
    rating = EXCLUDED.rating,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO supplier_contacts ("Id", supplier_id, name, role, phone, email, is_primary)
VALUES
    ('44444444-4444-4444-8444-444444444001', '33333333-3333-4333-8333-333333333001', 'Budi Santoso', 'Sales Manager', '0812-3456-7890', 'budi@indosteel.co.id', true),
    ('44444444-4444-4444-8444-444444444002', '33333333-3333-4333-8333-333333333002', 'Siti Aminah', 'Account Executive', '0813-4567-8901', 'siti@sumberteknik.co.id', true)
ON CONFLICT DO NOTHING;
