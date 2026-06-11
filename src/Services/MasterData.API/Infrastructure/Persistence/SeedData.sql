INSERT INTO customers ("Id", code, name, address, contact_person, email, is_active, created_at_utc, updated_at_utc)
VALUES
    ('11111111-1111-4111-8111-111111111001', '0001', 'PT. METAL FASTINDO ABADI', 'Jl. Industri Raya No. 15, Bekasi', 'Pak Agus', 'agus@metalfastindo.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111002', '0002', 'PT. SUMBER JAYA STEEL', 'Kawasan KIIC, Karawang', 'Ibu Lisa', 'lisa@sumberjayasteel.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111003', '0003', 'CV. TEKNIK MANDIRI', 'Jl. Raya Cikarang No. 88, Bekasi', 'Pak Budi', 'budi@teknikmandiri.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111004', '0004', 'PT. INDO PRESISI PART', 'MM2100 Industrial Town, Cikarang', 'Pak Harry', 'harry@indopresisi.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111005', '0005', 'PT. ANEKA KOMPONEN', 'Jl. Gatot Subroto Km.7, Jakarta', 'Ibu Rini', 'rini@anekakomponen.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111006', '0006', 'PT. GLOBAL ENGINEERING', 'Kawasan Lippo Cikarang', 'Pak David', 'david@globalengineering.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111007', '0007', 'CV. MAJU BERSAMA TEKNIK', 'Jl. Pahlawan No. 33, Tangerang', 'Pak Joni', 'joni@majubersamateknik.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111008', '0008', 'PT. PRIMA SOLUSI INDUSTRI', 'BSD City, Tangerang Selatan', 'Ibu Wati', 'wati@primasolusi.co.id', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('11111111-1111-4111-8111-111111111009', 'CUST-9012', 'PT. PRESISI BAUT NUSANTARA', 'Kawasan Industri Jababeka, Cikarang', 'Pak Raka', 'raka@presisibaut.co.id', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO products ("Id", part_number, description, unit, material_spec, is_active, created_at_utc, updated_at_utc)
VALUES
    ('22222222-2222-4222-8222-222222222001', 'PJT-BRG-001', 'Bearing Housing Custom 150mm', 'PCS', 'ST37 / SS304 sesuai drawing', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222002', 'PJT-SHF-002', 'Drive Shaft Assembly 80mm', 'PCS', 'SS304 round bar 80mm', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222003', 'PJT-VAL-003', 'Ball Valve Body DN100 SS316', 'PCS', 'SS316 casting body', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222004', 'PJT-GBX-004', 'Gearbox Housing Cast Iron FC250', 'SET', 'FC250 cast iron', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222005', 'PJT-FLG-005', 'Flange Coupling DN200 SS304', 'PCS', 'SS304 bar 50mm and plate 10mm', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222006', 'PJT-PLT-006', 'Precision Lathe Fixture Plate A6061', 'PCS', 'Aluminium A6061-T6 plate', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222007', 'PJT-HSG-007', 'Pump Housing Aluminium A356', 'PCS', 'Aluminium A356', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222008', 'PJT-BRK-008', 'Brake Drum Custom 250mm OD', 'PCS', 'FC250 cast iron', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222009', 'PJT-SPR-009', 'Sprocket Chain 40T Duplex Grade A', 'PCS', 'SCM440 hardened steel', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222010', 'PJT-CAM-010', 'Camshaft Bearing Seat 70mm CrMo', 'PCS', 'AISI 4130 CrMo', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222011', 'PJT-CYL-011', 'Hydraulic Cylinder Rod End SS316L', 'PCS', 'SS316L rod stock', true, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ('22222222-2222-4222-8222-222222222012', 'PJT-BLT-005', 'Baut Custom 0.05mm', 'PCS', 'High precision steel wire and coolant process', true, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')
ON CONFLICT (part_number) DO UPDATE
SET description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    material_spec = EXCLUDED.material_spec,
    is_active = EXCLUDED.is_active,
    updated_at_utc = EXCLUDED.updated_at_utc;
