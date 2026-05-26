export type UserRole = 'Sales' | 'Engineering' | 'Owner' | 'Admin' | 'Finance' | 'Purchasing';

export type SOStatus =
  | 'Pending Design'
  | 'Waiting Approval'
  | 'Revision Required'
  | 'Ready for Production'
  | 'In Production'
  | 'QC'
  | 'Completed'
  | 'Rejected';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  email: string;
  isActive: boolean;
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
}

export const USERS: User[] = [
  { id: 'u1', name: 'Budi Santoso', username: 'sales01', password: 'sales123', role: 'Sales', email: 'budi@pjt.co.id', isActive: true },
  { id: 'u2', name: 'Reza Firmansyah', username: 'eng01', password: 'eng123', role: 'Engineering', email: 'reza@pjt.co.id', isActive: true },
  { id: 'u3', name: 'Wildan Pratama', username: 'owner', password: 'owner123', role: 'Owner', email: 'hendra@pjt.co.id', isActive: true },
  { id: 'u4', name: 'Intan', username: 'admin01', password: 'admin123', role: 'Admin', email: 'siti@pjt.co.id', isActive: true },
  { id: 'u5', name: 'Dewi Kusuma', username: 'finance01', password: 'fin123', role: 'Finance', email: 'dewi@pjt.co.id', isActive: true },
  { id: 'u6', name: 'Ahmad Fauzi', username: 'purchasing01', password: 'purchase123', role: 'Purchasing', email: 'ahmad@pjt.co.id', isActive: true },
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

export const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'SO-2026001', customerId: '0001', partNumber: 'PJT-BRG-001', description: 'Bearing Housing Custom 150mm',
    quantity: 25, unit: 'PCS', deadline: '2026-06-15', status: 'Completed', createdBy: 'u1', createdAt: '2026-04-01',
    designLink: 'https://drive.google.com/file/d/example1', submittedAt: '2026-04-03', approvedAt: '2026-04-05',
    approvedBy: 'u3', startTime: '2026-04-10T08:00', endTime: '2026-04-25T16:00',
    qcStatus: 'Pass', qcNotes: '', qcAt: '2026-04-26', completedAt: '2026-04-27',
  },
  {
    id: 'SO-2026002', customerId: '0002', partNumber: 'PJT-SHF-002', description: 'Drive Shaft Assembly 80mm',
    quantity: 10, unit: 'PCS', deadline: '2026-06-20', status: 'Completed', createdBy: 'u1', createdAt: '2026-04-05',
    designLink: 'https://drive.google.com/file/d/example2', submittedAt: '2026-04-07', approvedAt: '2026-04-09',
    approvedBy: 'u3', startTime: '2026-04-12T09:00', endTime: '2026-04-28T15:00',
    qcStatus: 'Pass', qcNotes: '', qcAt: '2026-04-29', completedAt: '2026-04-30',
  },
  {
    id: 'SO-2026073', customerId: '0003', partNumber: 'PJT-VAL-003', description: 'Ball Valve Body DN100 SS316',
    quantity: 4, unit: 'PCS', deadline: '2026-05-30', status: 'Completed', createdBy: 'u1', createdAt: '2026-04-15',
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
    quantity: 20, unit: 'PCS', deadline: '2026-07-01', status: 'In Production', createdBy: 'u1', createdAt: '2026-04-25',
    designLink: 'https://drive.google.com/file/d/example5', submittedAt: '2026-04-27', approvedAt: '2026-04-29',
    approvedBy: 'u3', startTime: '2026-05-05T07:30',
  },
  {
    id: 'SO-2026045', customerId: '0005', partNumber: 'PJT-PLT-006', description: 'Precision Lathe Fixture Plate A6061',
    quantity: 3, unit: 'PCS', deadline: '2026-07-10', status: 'Ready for Production', createdBy: 'u1', createdAt: '2026-05-01',
    designLink: 'https://drive.google.com/file/d/example6', submittedAt: '2026-05-03', approvedAt: '2026-05-05', approvedBy: 'u3',
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
    quantity: 200, unit: 'PCS', deadline: '2026-08-10', status: 'Rejected', createdBy: 'u1', createdAt: '2026-05-03',
    designLink: 'https://drive.google.com/file/d/example12', submittedAt: '2026-05-05',
    rejectionReason: 'Ditolak permanen — tidak sesuai kemampuan produksi.',
  },
  {
    id: 'SO-2026075', customerId: '0005', partNumber: 'PJT-BRG-013', description: 'Connecting Rod Bearing Set 60mm',
    quantity: 50, unit: 'SET', deadline: '2026-08-05', status: 'Revision Required', createdBy: 'u1', createdAt: '2026-05-12',
    designLink: 'https://drive.google.com/file/d/example13', submittedAt: '2026-05-14',
    rejectionReason: 'Toleransi dimensi terlalu ketat, perlu dikonfirmasi ulang dengan customer. Revisi drawing section A-A.',
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
  };
  return map[status];
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
export type PurchasingStatus = 'Pending' | 'Diproses' | 'Selesai' | 'Ditolak';

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
