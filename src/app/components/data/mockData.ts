export type UserRole = 'Sales' | 'Engineering' | 'Owner' | 'Admin' | 'Finance' | 'Purchasing';

export type SOStatus =
  | 'Pending Design'
  | 'Waiting Approval'
  | 'Revision Required'
  | 'Ready for Production'
  | 'In Production'
  | 'QC'
  | 'Completed'
  | 'Rejected'
    | 'waiting_dp'
    | 'pending_assignment'
    | 'material_preparation'
    | 'in_production'
    | 'qc_check';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  email: string;
  isActive: boolean;
  isSupervisor?: boolean;
}

export interface Customer {
  code: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
}

export interface SalesOrder {
  id: string;
  customerId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  material?: string;
  spec?: string;
  deadline: string;
  status: SOStatus;
  createdBy: string;
  createdAt: string;
  designLink?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  startTime?: string;
  endTime?: string;
  lateReason?: string;
  qcStatus?: 'Pass' | 'Fail';
  qcNotes?: string;
  qcPhotos?: string[];
  qcAt?: string;
  completedAt?: string;
  isRework?: boolean;
  
  // SO Module Specifics
  notes?: string;
  timeline?: { id: string; step: string; label: string; date: string; completed: boolean; current?: boolean; assignedTo?: string }[];
  activities?: { id: string; user: string; role: string; action: string; timestamp: string }[];
  invoice?: { invoiceNumber: string; invoiceDate: string; dueDate: string; amount: number; status: string; paymentDate: string };
  quotationDate?: string;
  designApprovedAt?: string;
}

export const STANDARD_PRODUCTS_BOM: Record<string, {id: string; name: string; spec: string; quantity: number; unit: string}[]> = {};
export const ENGINEERING_DESIGNS: any[] = [];

export const productOptions = [
  "Pipa Galvanis 2 Inch",
  "Pipa Galvanis 3 Inch",
  "Baut Hex M16 × 80mm Grade 8.8",
  "Baut Hex M20 × 100mm Grade 10.9",
  "Shaft Coupling Ø50mm SS316L",
  "Bearing SKF 6205-2RS",
  "Bearing SKF 6305-2Z",
  "Gear Box Helical Ratio 1:20",
  "Plat Baja ST37 10mm",
  "Plat Stainless 316L 6mm",
  "Sprocket #50 Z30 Hardened",
  "V-Belt A-60 Bando",
];

export const USERS: User[] = [
  { id: 'u1', name: 'Budi Santoso', username: 'sales01', password: 'sales123', role: 'Sales', email: 'budi@pjt.co.id', isActive: true },
  { id: 'u2', name: 'Hendra Wijaya', username: 'eng01', password: 'eng123', role: 'Engineering', email: 'hendra@pjt.co.id', isActive: true },
  { id: 'u3', name: 'Wildan Pratama', username: 'owner', password: 'owner123', role: 'Owner', email: 'hendra@pjt.co.id', isActive: true },
  { id: 'u4', name: 'Intan', username: 'admin01', password: 'admin123', role: 'Admin', email: 'siti@pjt.co.id', isActive: true },
  { id: 'u5', name: 'Dewi Kusuma', username: 'finance01', password: 'fin123', role: 'Finance', email: 'dewi@pjt.co.id', isActive: true },
  { id: 'u6', name: 'Ahmad Fauzi', username: 'purchasing01', password: 'purchase123', role: 'Purchasing', email: 'ahmad@pjt.co.id', isActive: true },
  { id: 'u7', name: 'Budi (Supervisor)', username: 'eng_spv', password: 'spv123', role: 'Engineering', email: 'budi.spv@pjt.co.id', isActive: true, isSupervisor: true },
];

export const CUSTOMERS: Customer[] = [
  { code: '0001', name: 'PT. METAL FASTINDO ABADI', contact: 'Pak Agus', phone: '0812-3456-7890', address: 'Jl. Industri Raya No. 15, Bekasi' },
  { code: '0002', name: 'PT. SUMBER JAYA STEEL', contact: 'Ibu Lisa', phone: '0813-2345-6789', address: 'Kawasan KIIC, Karawang' },
  { code: '0003', name: 'CV. TEKNIK MANDIRI', contact: 'Pak Budi', phone: '0856-7890-1234', address: 'Jl. Raya Cikarang No. 88, Bekasi' },
  { code: '0004', name: 'PT. INDO PRESISI PART', contact: 'Pak Harry', phone: '0877-6543-2109', address: 'MM2100 Industrial Town, Cikarang' },
  { code: '0005', name: 'PT. ANEKA KOMPONEN', contact: 'Ibu Rini', phone: '0821-9876-5432', address: 'Jl. Gatot Subroto Km.7, Jakarta' },
  { code: '0006', name: 'PT. GLOBAL ENGINEERING', contact: 'Pak David', phone: '0818-1234-5678', address: 'Kawasan Lippo Cikarang' },
  { code: '0007', name: 'CV. MAJU BERSAMA TEKNIK', contact: 'Pak Joni', phone: '0852-3456-7891', address: 'Jl. Pahlawan No. 33, Tangerang' },
  { code: '0008', name: 'PT. PRIMA SOLUSI INDUSTRI', contact: 'Ibu Wati', phone: '0831-9012-3456', address: 'BSD City, Tangerang Selatan' },
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'QUT-2026-001', soId: 'SO-2026064',
    customerId: '0001',
    productName: 'Sprocket Chain 40T Duplex Grade A',
    description: 'Material baja karbon grade A, perlakuan panas khusus',
    quantity: 30,
    unit: 'pcs',
    deadline: '2026-07-25',
    status: 'pending_design',
    createdBy: 'u1',
    createdAt: '2026-05-09',
  },
  {
    id: 'QUT-2026-005', soId: 'SO-2026069',
    customerId: '0008',
    productName: 'Camshaft Bearing Seat 70mm CrMo',
    description: 'Material CrMo presisi tinggi',
    quantity: 12,
    unit: 'pcs',
    deadline: '2026-07-28',
    status: 'pending_design',
    createdBy: 'u1',
    createdAt: '2026-05-10',
  },
  {
    id: 'QUT-2026-006', soId: 'SO-2026072',
    customerId: '0002',
    productName: 'Hydraulic Cylinder Rod End SS316L',
    description: 'Stainless Steel 316L, Tahan korosi',
    quantity: 6,
    unit: 'pcs',
    deadline: '2026-08-01',
    status: 'pending_design',
    createdBy: 'u1',
    createdAt: '2026-05-11',
  },
  {
    id: 'QUT-2026-007', soId: 'SO-2026075',
    customerId: '0005',
    productName: 'Connecting Rod Bearing Set 60mm',
    description: 'Set lengkap dengan bearing custom, toleransi ketat',
    quantity: 50,
    unit: 'set',
    deadline: '2026-08-05',
    status: 'pending_design',
    rejectionReason: 'Toleransi dimensi terlalu ketat, perlu dikonfirmasi ulang dengan customer. Revisi drawing section A-A.',
    createdBy: 'u1',
    createdAt: '2026-05-12',
  },
  {
    id: 'QUT-2026-008', soId: 'SO-2026051',
    customerId: '0006',
    productName: 'Pump Housing Aluminium A356',
    description: 'Casting aluminium A356',
    quantity: 8,
    unit: 'pcs',
    deadline: '2026-07-15',
    status: 'design_review',
    designId: 'DES-008',
    createdBy: 'u1',
    createdAt: '2026-05-05',
  },
  {
    id: 'QUT-2026-009', soId: 'SO-2026058',
    customerId: '0007',
    productName: 'Brake Drum Custom 250mm OD',
    description: 'Tahan panas tinggi',
    quantity: 15,
    unit: 'pcs',
    deadline: '2026-07-20',
    status: 'design_review',
    designId: 'DES-009',
    createdBy: 'u1',
    createdAt: '2026-05-07',
  },
  {
    id: 'QUT-2026-002',
    customerId: '0002',
    productName: 'Pipa Galvanis 3 Inch Bracket',
    description: 'Bracket khusus',
    quantity: 50,
    unit: 'pcs',
    deadline: '2026-06-25',
    status: 'waiting_pricing',
    designId: 'DES-002',
    createdBy: 'u1',
    createdAt: '2026-06-02',
  },
  {
    id: 'QUT-2026-003',
    customerId: '0003',
    productName: 'Shaft Coupling Ø50mm SS316L',
    description: 'Assembly coupling shaft',
    quantity: 10,
    unit: 'pcs',
    deadline: '2026-06-20',
    status: 'client_price_approval',
    designId: 'DES-003',
    estimatedAmount: 25000000,
    customerImageUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=400',
    revisions: [
      { revNumber: 1, amount: 28000000, date: '2026-06-04', notes: 'Penawaran awal dengan material premium.' },
      { revNumber: 2, amount: 25000000, date: '2026-06-06', notes: 'Diskon volume setelah nego dengan klien.' }
    ],
    createdBy: 'u1',
    createdAt: '2026-06-03',
  },
  {
    id: 'QUT-2026-004',
    customerId: '0004',
    productName: 'Gear Box Helical',
    description: 'Ratio 1:20',
    quantity: 2,
    unit: 'set',
    deadline: '2026-06-15',
    status: 'lost',
    designId: 'DES-001',
    estimatedAmount: 40000000,
    lostReason: 'Harga terlalu mahal dibanding kompetitor',
    createdBy: 'u1',
    createdAt: '2026-06-04',
  }
];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [
// ── Riwayat Jan–Mar 2026 ──────────────────────────────────────────────────
  {
    id: 'SO-2025098', customerId: '0001', partNumber: 'PJT-BRG-H01', description: 'Bearing Housing Custom 120mm',
    quantity: 20, unit: 'PCS', deadline: '2026-01-20', status: 'completed', createdBy: 'u1', createdAt: '2026-01-03',
    designLink: 'https://drive.google.com', submittedAt: '2026-01-05', approvedAt: '2026-01-07', approvedBy: 'u3',
    startTime: '2026-01-08T08:00', endTime: '2026-01-18T16:00', qcStatus: 'Pass', qcAt: '2026-01-19', completedAt: '2026-01-20',
  },
  {
    id: 'SO-2025099', customerId: '0002', partNumber: 'PJT-SHF-H01', description: 'Shaft Coupling 60mm SS304',
    quantity: 8, unit: 'PCS', deadline: '2026-01-25', status: 'completed', createdBy: 'u1', createdAt: '2026-01-08',
    designLink: 'https://drive.google.com', submittedAt: '2026-01-10', approvedAt: '2026-01-12', approvedBy: 'u3',
    startTime: '2026-01-13T08:00', endTime: '2026-01-24T16:00', qcStatus: 'Pass', qcAt: '2026-01-25', completedAt: '2026-01-26',
  },
  {
    id: 'SO-2025100', customerId: '0003', partNumber: 'PJT-VAL-H01', description: 'Gate Valve Body DN80 CS',
    quantity: 6, unit: 'PCS', deadline: '2026-01-28', status: 'completed', createdBy: 'u1', createdAt: '2026-01-10',
    designLink: 'https://drive.google.com', submittedAt: '2026-01-12', approvedAt: '2026-01-14', approvedBy: 'u3',
    startTime: '2026-01-15T08:00', endTime: '2026-01-27T16:00', qcStatus: 'Pass', qcAt: '2026-01-28', completedAt: '2026-01-29',
  },
  {
    id: 'SO-2025101', customerId: '0005', partNumber: 'PJT-PLT-H01', description: 'Jig Plate Aluminium 400x400mm',
    quantity: 2, unit: 'PCS', deadline: '2026-01-30', status: 'completed', createdBy: 'u1', createdAt: '2026-01-12',
    designLink: 'https://drive.google.com', submittedAt: '2026-01-14', approvedAt: '2026-01-16', approvedBy: 'u3',
    startTime: '2026-01-17T08:00', endTime: '2026-01-28T16:00', qcStatus: 'Pass', qcAt: '2026-01-29', completedAt: '2026-01-30',
  },
  {
    id: 'SO-2025102', customerId: '0001', partNumber: 'PJT-SPR-H01', description: 'Sprocket 32T Single Grade A',
    quantity: 15, unit: 'PCS', deadline: '2026-02-15', status: 'completed', createdBy: 'u1', createdAt: '2026-02-02',
    designLink: 'https://drive.google.com', submittedAt: '2026-02-04', approvedAt: '2026-02-06', approvedBy: 'u3',
    startTime: '2026-02-07T08:00', endTime: '2026-02-14T16:00', qcStatus: 'Pass', qcAt: '2026-02-15', completedAt: '2026-02-16',
  },
  {
    id: 'SO-2025103', customerId: '0004', partNumber: 'PJT-FLG-H01', description: 'Flange Slip-On DN150 A105',
    quantity: 12, unit: 'PCS', deadline: '2026-02-20', status: 'completed', createdBy: 'u1', createdAt: '2026-02-05',
    designLink: 'https://drive.google.com', submittedAt: '2026-02-07', approvedAt: '2026-02-09', approvedBy: 'u3',
    startTime: '2026-02-10T08:00', endTime: '2026-02-19T16:00', qcStatus: 'Pass', qcAt: '2026-02-20', completedAt: '2026-02-21',
  },
  {
    id: 'SO-2025104', customerId: '0006', partNumber: 'PJT-HSG-H01', description: 'Pump Casing Bronze 125mm',
    quantity: 4, unit: 'PCS', deadline: '2026-02-25', status: 'completed', createdBy: 'u1', createdAt: '2026-02-10',
    designLink: 'https://drive.google.com', submittedAt: '2026-02-12', approvedAt: '2026-02-14', approvedBy: 'u3',
    startTime: '2026-02-15T08:00', endTime: '2026-02-24T16:00', qcStatus: 'Pass', qcAt: '2026-02-25', completedAt: '2026-02-26',
  },
  {
    id: 'SO-2025105', customerId: '0002', partNumber: 'PJT-SHF-H02', description: 'Output Shaft Gearbox 90mm CrMo',
    quantity: 5, unit: 'PCS', deadline: '2026-03-10', status: 'completed', createdBy: 'u1', createdAt: '2026-02-20',
    designLink: 'https://drive.google.com', submittedAt: '2026-02-22', approvedAt: '2026-02-24', approvedBy: 'u3',
    startTime: '2026-02-25T08:00', endTime: '2026-03-09T16:00', qcStatus: 'Pass', qcAt: '2026-03-10', completedAt: '2026-03-11',
  },
  {
    id: 'SO-2025106', customerId: '0001', partNumber: 'PJT-BRG-H02', description: 'Pillow Block Bearing Seat 75mm',
    quantity: 18, unit: 'PCS', deadline: '2026-03-15', status: 'completed', createdBy: 'u1', createdAt: '2026-03-01',
    designLink: 'https://drive.google.com', submittedAt: '2026-03-03', approvedAt: '2026-03-05', approvedBy: 'u3',
    startTime: '2026-03-06T08:00', endTime: '2026-03-14T16:00', qcStatus: 'Pass', qcAt: '2026-03-15', completedAt: '2026-03-16',
  },
  {
    id: 'SO-2025107', customerId: '0003', partNumber: 'PJT-VAL-H02', description: 'Check Valve Body SS316 DN50',
    quantity: 8, unit: 'PCS', deadline: '2026-03-20', status: 'completed', createdBy: 'u1', createdAt: '2026-03-05',
    designLink: 'https://drive.google.com', submittedAt: '2026-03-07', approvedAt: '2026-03-09', approvedBy: 'u3',
    startTime: '2026-03-10T08:00', endTime: '2026-03-19T16:00', qcStatus: 'Pass', qcAt: '2026-03-20', completedAt: '2026-03-21',
  },
  {
    id: 'SO-2025108', customerId: '0007', partNumber: 'PJT-BRK-H01', description: 'Brake Disc Rotor 220mm',
    quantity: 10, unit: 'PCS', deadline: '2026-03-22', status: 'completed', createdBy: 'u1', createdAt: '2026-03-08',
    designLink: 'https://drive.google.com', submittedAt: '2026-03-10', approvedAt: '2026-03-12', approvedBy: 'u3',
    startTime: '2026-03-13T08:00', endTime: '2026-03-21T16:00', qcStatus: 'Pass', qcAt: '2026-03-22', completedAt: '2026-03-23',
  },
  {
    id: 'SO-2025109', customerId: '0008', partNumber: 'PJT-CAM-H01', description: 'Cam Follower Bracket 4130 Steel',
    quantity: 6, unit: 'PCS', deadline: '2026-03-28', status: 'completed', createdBy: 'u1', createdAt: '2026-03-15',
    designLink: 'https://drive.google.com', submittedAt: '2026-03-17', approvedAt: '2026-03-19', approvedBy: 'u3',
    startTime: '2026-03-20T08:00', endTime: '2026-03-27T16:00', qcStatus: 'Pass', qcAt: '2026-03-28', completedAt: '2026-03-29',
  },
  {
    id: 'SO-2025110', customerId: '0005', partNumber: 'PJT-PLT-H02', description: 'Fixture Plate SS304 500x300mm',
    quantity: 3, unit: 'PCS', deadline: '2026-03-30', status: 'completed', createdBy: 'u1', createdAt: '2026-03-18',
    designLink: 'https://drive.google.com', submittedAt: '2026-03-20', approvedAt: '2026-03-22', approvedBy: 'u3',
    startTime: '2026-03-23T08:00', endTime: '2026-03-29T16:00', qcStatus: 'Pass', qcAt: '2026-03-30', completedAt: '2026-03-31',
  },
  // ── Apr–Mei 2026 ────────────────────────────────────────────────────────────

  {
    id: 'SO-2026001', customerId: '0001', partNumber: 'PJT-BRG-001', description: 'Bearing Housing Custom 150mm',
    quantity: 25, unit: 'PCS', deadline: '2026-06-15', status: 'completed', createdBy: 'u1', createdAt: '2026-04-01',
    designLink: 'https://drive.google.com/file/d/example1', submittedAt: '2026-04-03', approvedAt: '2026-04-05',
    approvedBy: 'u3', startTime: '2026-04-10T08:00', endTime: '2026-04-25T16:00',
    qcStatus: 'Pass', qcNotes: '', qcAt: '2026-04-26', completedAt: '2026-04-27',
    invoice: { invoiceNumber: 'INV-2026-0451', invoiceDate: '2026-06-01', dueDate: '2026-06-15', amount: 45000000, status: 'waiting', paymentDate: '' },
  },
  {
    id: 'SO-2026002', customerId: '0002', partNumber: 'PJT-SHF-002', description: 'Drive Shaft Assembly 80mm',
    quantity: 10, unit: 'PCS', deadline: '2026-06-20', status: 'completed', createdBy: 'u1', createdAt: '2026-04-05',
    designLink: 'https://drive.google.com/file/d/example2', submittedAt: '2026-04-07', approvedAt: '2026-04-09',
    approvedBy: 'u3', startTime: '2026-04-12T09:00', endTime: '2026-04-28T15:00',
    qcStatus: 'Pass', qcNotes: '', qcAt: '2026-04-29', completedAt: '2026-04-30',
  },
  {
    id: 'SO-2026073', customerId: '0003', partNumber: 'PJT-VAL-003', description: 'Ball Valve Body DN100 SS316',
    quantity: 4, unit: 'PCS', deadline: '2026-05-30', status: 'completed', createdBy: 'u1', createdAt: '2026-04-15',
    designLink: 'https://drive.google.com/file/d/example3', submittedAt: '2026-04-17', approvedAt: '2026-04-19',
    approvedBy: 'u3', startTime: '2026-04-22T08:00', endTime: '2026-05-03T16:00',
    qcStatus: 'Fail', qcNotes: 'Surface finish tidak sesuai spec. Perlu rework pada area flange.', qcAt: '2026-05-04', completedAt: '2026-05-07',
  },
  {
    id: 'SO-2026025', customerId: '0003', partNumber: 'PJT-GBX-004', description: 'Gearbox Housing Cast Iron FC250',
    quantity: 5, unit: 'SET', deadline: '2026-06-25', status: 'QC', createdBy: 'u1', createdAt: '2026-04-20',
    designLink: 'https://drive.google.com/file/d/example4', submittedAt: '2026-04-22', approvedAt: '2026-04-24',
    approvedBy: 'u3', startTime: '2026-05-01T08:00', endTime: '2026-05-10T17:00',
  },
  {
    id: 'SO-2026038', customerId: '0004', partNumber: 'PJT-FLG-005', description: 'Flange Coupling DN200 SS304',
    quantity: 20, unit: 'PCS', deadline: '2026-07-01', status: 'in_production', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-04-25',
    designLink: 'https://drive.google.com/file/d/example5', submittedAt: '2026-04-27', approvedAt: '2026-04-29',
    approvedBy: 'u3', startTime: '2026-05-05T07:30',
  },
  {
    id: 'SO-2026045', customerId: '0005', partNumber: 'PJT-PLT-006', description: 'Precision Lathe Fixture Plate A6061',
    quantity: 3, unit: 'PCS', deadline: '2026-07-10', status: 'Ready for Production', createdBy: 'u1', createdAt: '2026-05-01',
    designLink: 'https://drive.google.com/file/d/example6', submittedAt: '2026-05-03', approvedAt: '2026-05-05', approvedBy: 'u3',
  },
  {
    id: 'SO-2026046', customerId: '0006', partNumber: 'PJT-HSG-014', description: 'Pump Housing Cast Iron 150mm',
    quantity: 10, unit: 'PCS', deadline: '2026-07-12', status: 'qc_check', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-02',
    designLink: 'https://drive.google.com', submittedAt: '2026-05-04', approvedAt: '2026-05-06', approvedBy: 'u3', startTime: '2026-05-10T08:00',
  },
  {
    id: 'SO-2026047', customerId: '0007', partNumber: 'PJT-BRK-015', description: 'Brake Disc Custom 300mm',
    quantity: 20, unit: 'PCS', deadline: '2026-07-15', status: 'qc_check', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-03',
    designLink: 'https://drive.google.com', submittedAt: '2026-05-05', approvedAt: '2026-05-07', approvedBy: 'u3', startTime: '2026-05-11T09:00',
  },
  {
    id: 'SO-2026048', customerId: '0001', partNumber: 'PJT-SPR-016', description: 'Sprocket 50T Duplex Grade B',
    quantity: 15, unit: 'PCS', deadline: '2026-07-18', status: 'material_preparation', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-04',
    designLink: 'https://drive.google.com', submittedAt: '2026-05-06', approvedAt: '2026-05-08', approvedBy: 'u3',
  },
  {
    id: 'SO-2026049', customerId: '0002', partNumber: 'PJT-CYL-017', description: 'Hydraulic Cylinder Cap Aluminium',
    quantity: 30, unit: 'PCS', deadline: '2026-07-20', status: 'material_preparation', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-05',
    designLink: 'https://drive.google.com', submittedAt: '2026-05-07', approvedAt: '2026-05-09', approvedBy: 'u3',
  },
  {
    id: 'SO-2026050', customerId: '0003', partNumber: 'PJT-VAL-018', description: 'Globe Valve Body DN150 Cast Steel',
    quantity: 5, unit: 'PCS', deadline: '2026-07-22', status: 'QC', createdBy: 'u1', createdAt: '2026-05-06',
    designLink: 'https://drive.google.com', submittedAt: '2026-05-08', approvedAt: '2026-05-10', approvedBy: 'u3', startTime: '2026-05-12T08:00', endTime: '2026-05-18T16:00',
  },
  {
    id: 'SO-2026051', customerId: '0006', partNumber: 'PJT-HSG-007', description: 'Pump Housing Aluminium A356',
    quantity: 8, unit: 'PCS', deadline: '2026-07-15', status: 'Waiting Approval', createdBy: 'u1', createdAt: '2026-05-05',
    designLink: 'https://drive.google.com/file/d/example7', submittedAt: '2026-05-07',
  },
  {
    id: 'SO-2026058', customerId: '0007', partNumber: 'PJT-BRK-008', description: 'Brake Drum Custom 250mm OD',
    quantity: 15, unit: 'PCS', deadline: '2026-07-20', status: 'Waiting Approval', createdBy: 'u1', createdAt: '2026-05-07',
    designLink: 'https://drive.google.com/file/d/example8', submittedAt: '2026-05-09',
  },
  {
    id: 'SO-2026064', customerId: '0001', partNumber: 'PJT-SPR-009', description: 'Sprocket Chain 40T Duplex Grade A',
    quantity: 30, unit: 'PCS', deadline: '2026-07-25', status: 'Pending Design', createdBy: 'u1', createdAt: '2026-05-09',
  },
  {
    id: 'SO-2026069', customerId: '0008', partNumber: 'PJT-CAM-010', description: 'Camshaft Bearing Seat 70mm CrMo',
    quantity: 12, unit: 'PCS', deadline: '2026-07-28', status: 'Pending Design', createdBy: 'u1', createdAt: '2026-05-10',
  },
  {
    id: 'SO-2026072', customerId: '0002', partNumber: 'PJT-CYL-011', description: 'Hydraulic Cylinder Rod End SS316L',
    quantity: 6, unit: 'PCS', deadline: '2026-08-01', status: 'Pending Design', createdBy: 'u1', createdAt: '2026-05-11',
  },
  {
    id: 'SO-2026074', customerId: '0004', partNumber: 'PJT-NUT-012', description: 'Heavy Hex Nut M52 Grade 10.9',
    quantity: 200, unit: 'PCS', deadline: '2026-08-10', status: 'rejected', createdBy: 'u1', createdAt: '2026-05-03',
    designLink: 'https://drive.google.com/file/d/example12', submittedAt: '2026-05-05',
    rejectionReason: 'Ditolak permanen — tidak sesuai kemampuan produksi.',
  },
  {
    id: 'SO-2026075', customerId: '0005', partNumber: 'PJT-BRG-013', description: 'Connecting Rod Bearing Set 60mm',
    quantity: 50, unit: 'SET', deadline: '2026-08-05', status: 'Revision Required', createdBy: 'u1', createdAt: '2026-05-12',
    designLink: 'https://drive.google.com/file/d/example13', submittedAt: '2026-05-14',
    rejectionReason: 'Toleransi dimensi terlalu ketat, perlu dikonfirmasi ulang dengan customer. Revisi drawing section A-A.',
  },

    {
      id: 'SO-2026076', customerId: '0001', partNumber: 'PJT-DMM-001', description: 'Custom Fixture Bracket',
      quantity: 15, unit: 'PCS', deadline: '2026-08-10', status: 'rejected', createdBy: 'u1', createdAt: '2026-05-15',
      designLink: 'https://drive.google.com/file/d/example14', submittedAt: '2026-05-16',
      rejectionReason: 'Desain terlalu rumit dan mahal untuk diproduksi, customer membatalkan.',
    },
    {
      id: 'SO-2026077', customerId: '0002', partNumber: 'PJT-DMM-002', description: 'Stainless Steel Conveyor Shaft',
      quantity: 5, unit: 'PCS', deadline: '2026-08-12', status: 'Revision Required', createdBy: 'u1', createdAt: '2026-05-16',
      designLink: 'https://drive.google.com/file/d/example15', submittedAt: '2026-05-17',
      rejectionReason: 'Toleransi shaft perlu di-adjust ke h7, mohon revisi drawing.',
    },
  
    {
      id: 'SO-2026078', customerId: '0004', partNumber: 'PJT-UMP-001', description: 'UMMT Project Bracket',
      quantity: 10, unit: 'PCS', deadline: '2026-08-20', status: 'material_preparation', createdBy: 'u1', createdAt: '2026-06-01',
      designLink: 'https://drive.google.com/file/d/ummt1', submittedAt: '2026-06-02', assignedTo: 'u2'
    },
    {
      id: 'SO-2026079', customerId: '0004', partNumber: 'PJT-UMP-002', description: 'UMMT Project Housing',
      quantity: 5, unit: 'SET', deadline: '2026-08-25', status: 'in_production', createdBy: 'u1', createdAt: '2026-06-05',
      designLink: 'https://drive.google.com/file/d/ummt2', submittedAt: '2026-06-06', assignedTo: 'u2', startTime: '2026-06-10T08:00:00Z'
    },
  ];

  export const STATUS_STEPS: SOStatus[] = [
  'Pending Design',
  'Waiting Approval',
  'Ready for Production',
  'In Production',
  'QC',
  'Completed',
];

export const REVISION_STATUSES: SOStatus[] = ['Pending Design', 'Revision Required'];

export function formatSOStatus(status: string): string {
  const map: Record<string, string> = {
    'qc_check': 'QC',
    'in_production': 'In Production',
    'material_preparation': 'Material Prep',
    'pending_assignment': 'Menunggu Penugasan',
    'waiting_dp': 'Menunggu DP'
  };
  return map[status] || status;
}

export function getStatusColor(status: SOStatus): { bg: string; text: string; border: string } {
  // STRICT DESIGN SYSTEM COMPLIANCE:
  // Pending Design (Draft) -> Gray
  // Waiting Approval -> Purple
  // Revision Required (Rework) -> Red
  // Ready for Production -> Indigo
  // In Production -> Indigo
  // QC -> Sky Blue
  // Completed -> Green
  // Rejected -> Slate
  const map: Record<SOStatus, { bg: string; text: string; border: string }> = {
    'Pending Design':       { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' },
    'Waiting Approval':     { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Revision Required':    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
    'Ready for Production': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'In Production':        { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'QC':                   { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300' },
    'Completed':            { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
    'Rejected':             { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
    'waiting_dp':           { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'pending_assignment':   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'material_preparation': { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300' },
    'in_production':        { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'qc_check':             { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300' },
  };
  return map[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
}

export type QuotationStatus = 'draft' | 'pending_design' | 'design_review' | 'client_design_approval' | 'waiting_pricing' | 'client_price_approval' | 'won' | 'lost';

export interface Quotation {
  id: string;
  customerId: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  deadline: string;
  status: QuotationStatus;
  designId?: string;
  soId?: string;
  estimatedAmount?: number;
  customerImageUrl?: string;
  createdBy: string;
  createdAt: string;
  revisions?: { revNumber: number; amount: number; date: string; notes: string }[];
  materials?: any[];
  notes?: string;
  timeline?: any[];
  invoice?: { status: string };
  lostReason?: string;
  rejectionReason?: string;
}

export function getQuotationStatusColor(status: QuotationStatus): { bg: string; text: string; border: string; label: string } {
  if (status === 'draft') return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300", label: "Draft" };
  if (status === 'pending_design' || status === 'design_review') return { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", label: "Design Process" };
  if (status === 'client_design_approval') return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", label: "Approve Design" };
  if (status === 'waiting_pricing') return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "Waiting Pricing" };
  if (status === 'client_price_approval') return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", label: "Approve Price" };
  if (status === 'won') return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "Won" };
  if (status === 'lost') return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Lost" };
  return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300", label: "Unknown" };
}

export function getCustomer(code: string, customers: Customer[]): Customer | undefined {
  return customers.find(c => c.code === code);
}

export function calcProductionDuration(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.round(diff / (1000 * 60 * 60)); // hours
}

export type PurchasingUrgency = 'Normal' | 'Urgent' | 'Critical';
export type PurchasingStatus = 'Pending' | 'Diproses' | 'Selesai' | 'Ditolak' | 'Menunggu SPV';

export interface PurchasingRequest {
  id: string;
  soId?: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  urgency: PurchasingUrgency;
  notes: string;
  requestedBy: string;
  requestedAt: string;
  status: PurchasingStatus;
  supplier?: string;
  poNumber?: string;
  estimatedPrice?: number;
  expectedDelivery?: string;
  receivedAt?: string;
  rejectionReason?: string;
}

export const INITIAL_PURCHASING: PurchasingRequest[] = [
  {
    id: 'PR-001', soId: 'SO-2026038', itemName: 'Stainless Steel Bar SS304 Ø50mm',
    specification: 'ASTM A276 Grade 304, Panjang 3m, Qty 10 batang',
    quantity: 10, unit: 'BTG', urgency: 'Urgent',
    notes: 'Untuk produksi SO Flange Coupling', requestedBy: 'u2',
    requestedAt: '2026-05-02', status: 'Diproses',
    supplier: 'PT. Krakatau Steel', poNumber: 'PO-2026-041',
    estimatedPrice: 4500000, expectedDelivery: '2026-05-15',
  },
  {
    id: 'PR-002', soId: 'SO-2026045', itemName: 'Aluminium Plate A6061 500x500x20mm',
    specification: 'T6 Temper, Permukaan rata, Toleransi ±0.2mm',
    quantity: 5, unit: 'LBR', urgency: 'Normal',
    notes: 'Material untuk fixture plate', requestedBy: 'u2',
    requestedAt: '2026-05-05', status: 'Selesai',
    supplier: 'CV. Logam Jaya', poNumber: 'PO-2026-038',
    estimatedPrice: 2750000, expectedDelivery: '2026-05-10', receivedAt: '2026-05-09',
  },
  {
    id: 'PR-003', itemName: 'Carbide End Mill Ø12mm',
    specification: '4 Flute, TiAlN Coating, L=75mm, Shank Ø12mm',
    quantity: 20, unit: 'PCS', urgency: 'Normal',
    notes: 'Stok cutting tool untuk mesin CNC', requestedBy: 'u2',
    requestedAt: '2026-05-10', status: 'Pending',
  },
  {
    id: 'PR-004', soId: 'SO-2026069', itemName: 'CrMo Steel Round Bar 4130 Ø80mm',
    specification: 'AISI 4130, Panjang 2m, HRC 28-32',
    quantity: 6, unit: 'BTG', urgency: 'Critical',
    notes: 'Material utama camshaft bearing seat, deadline ketat', requestedBy: 'u2',
    requestedAt: '2026-05-12', status: 'Pending',
  },
  {
    id: 'PR-005', soId: 'SO-2026075', itemName: 'Bearing NSK 6204',
    specification: 'Deep Groove Ball Bearing 6204 DDU',
    quantity: 12, unit: 'PCS', urgency: 'Urgent',
    notes: 'Dibutuhkan segera untuk assembly gearbox', requestedBy: 'u7',
    requestedAt: '2026-05-15', status: 'Menunggu SPV',
  },
  {
    id: 'PR-006', itemName: 'O-Ring NBR70 Ø50mm',
    specification: 'NBR Shore 70, ID 50mm, Tebal 3mm',
    quantity: 50, unit: 'PCS', urgency: 'Normal',
    notes: 'Restock material consumable', requestedBy: 'u7',
    requestedAt: '2026-05-16', status: 'Menunggu SPV',
  },
];

export function getDefaultRouteForRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    Sales: '/app/sales',
    Engineering: '/app/engineering',
    Owner: '/app/dashboard',
    Admin: '/app/admin',
    Finance: '/app/finance',
    Purchasing: '/app/purchasing',
  };
  return map[role];
}
