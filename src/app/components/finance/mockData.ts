export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type TransactionType = 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  npwp: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  description: string;
  orderDate: string;
  totalAmount: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  issueDate: string;
  status: InvoiceStatus;
  notes: string;
  items: InvoiceItem[];
  ppn: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankRef: string;
  bankName: string;
  status: PaymentStatus;
  proofAvailable: boolean;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  status: string;
  customerName: string;
  category: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const formatIDR = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

// ─── Customers ───────────────────────────────────────────────────────────────

export const customers: Customer[] = [
  { id: 'C001', name: 'PT Mitra Baja Indonesia', contact: 'Budi Santoso', email: 'budi@mitrabaja.co.id', phone: '+62 21 5555 1234', address: 'Jl. Industri Raya No.12, Cikarang, Bekasi', npwp: '01.234.567.8-901.000' },
  { id: 'C002', name: 'CV Teknik Mandiri Sejahtera', contact: 'Andi Wijaya', email: 'andi@tms.co.id', phone: '+62 21 5555 2345', address: 'Jl. Raya Bogor KM 46, Cibinong, Bogor', npwp: '02.345.678.9-012.000' },
  { id: 'C003', name: 'PT Karya Logam Utama', contact: 'Dewi Rahayu', email: 'dewi@klu.co.id', phone: '+62 21 5555 3456', address: 'Kawasan KIIC Lot C-7, Karawang', npwp: '03.456.789.0-123.000' },
  { id: 'C004', name: 'PT Sinar Mesin Konstruksi', contact: 'Hendra Kusuma', email: 'hendra@smk.co.id', phone: '+62 21 5555 4567', address: 'Jl. Gatot Subroto No.88, Jakarta Selatan', npwp: '04.567.890.1-234.000' },
  { id: 'C005', name: 'UD Bengkel Las Jaya Abadi', contact: 'Siti Nurhaliza', email: 'siti@blja.co.id', phone: '+62 21 5555 5678', address: 'Jl. Raya Serang KM 12, Tangerang', npwp: '05.678.901.2-345.000' },
  { id: 'C006', name: 'PT Industri Komponen Nusantara', contact: 'Rudi Hermawan', email: 'rudi@ikn.co.id', phone: '+62 21 5555 6789', address: 'MM2100 Industrial Town Blok A1-5, Cikarang', npwp: '06.789.012.3-456.000' },
];

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export const salesOrders: SalesOrder[] = [
  { id: 'SO001', soNumber: 'SO-2024-0087', customerId: 'C001', customerName: 'PT Mitra Baja Indonesia', description: 'Fabrikasi Struktur Baja H-Beam 200x200', orderDate: '2024-11-01', totalAmount: 187500000 },
  { id: 'SO002', soNumber: 'SO-2024-0091', customerId: 'C002', customerName: 'CV Teknik Mandiri Sejahtera', description: 'Pembuatan Komponen Mesin Bubut CNC', orderDate: '2024-11-05', totalAmount: 95000000 },
  { id: 'SO003', soNumber: 'SO-2024-0094', customerId: 'C003', customerName: 'PT Karya Logam Utama', description: 'Machining Part Presisi Grade A', orderDate: '2024-11-08', totalAmount: 234000000 },
  { id: 'SO004', soNumber: 'SO-2024-0098', customerId: 'C004', customerName: 'PT Sinar Mesin Konstruksi', description: 'Konstruksi Rangka Conveyor Belt 50M', orderDate: '2024-11-12', totalAmount: 312000000 },
  { id: 'SO005', soNumber: 'SO-2024-0102', customerId: 'C005', customerName: 'UD Bengkel Las Jaya Abadi', description: 'Pengelasan Struktur Tangki Storage', orderDate: '2024-11-15', totalAmount: 56000000 },
  { id: 'SO006', soNumber: 'SO-2024-0108', customerId: 'C006', customerName: 'PT Industri Komponen Nusantara', description: 'Produksi Spare Part Bearing Housing', orderDate: '2024-11-20', totalAmount: 178000000 },
  { id: 'SO007', soNumber: 'SO-2024-0112', customerId: 'C001', customerName: 'PT Mitra Baja Indonesia', description: 'Fabrikasi Plat Baja Kapal 10mm', orderDate: '2024-11-25', totalAmount: 445000000 },
  { id: 'SO008', soNumber: 'SO-2024-0115', customerId: 'C003', customerName: 'PT Karya Logam Utama', description: 'Assembly Gear Box Industrial', orderDate: '2024-11-28', totalAmount: 122000000 },
];

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoices: Invoice[] = [
  {
    id: 'INV001', invoiceNumber: 'INV-2024-0247', soNumber: 'SO-2024-0087', customerId: 'C001',
    customerName: 'PT Mitra Baja Indonesia', amount: 206250000, paidAmount: 206250000,
    dueDate: '2024-12-01', issueDate: '2024-11-15', status: 'PAID', ppn: 18750000,
    notes: 'Pembayaran sesuai termin 30 hari.',
    items: [
      { id: 'I1', description: 'Fabrikasi H-Beam 200x200 - 15 ton', quantity: 15, unit: 'Ton', unitPrice: 12500000, total: 187500000 },
    ],
  },
  {
    id: 'INV002', invoiceNumber: 'INV-2024-0251', soNumber: 'SO-2024-0091', customerId: 'C002',
    customerName: 'CV Teknik Mandiri Sejahtera', amount: 104500000, paidAmount: 0,
    dueDate: '2024-12-15', issueDate: '2024-11-20', status: 'PENDING', ppn: 9500000,
    notes: 'Termin pembayaran 30 hari setelah invoice.',
    items: [
      { id: 'I2', description: 'Komponen Mesin Bubut CNC - Set Lengkap', quantity: 1, unit: 'Set', unitPrice: 95000000, total: 95000000 },
    ],
  },
  {
    id: 'INV003', invoiceNumber: 'INV-2024-0253', soNumber: 'SO-2024-0094', customerId: 'C003',
    customerName: 'PT Karya Logam Utama', amount: 257400000, paidAmount: 100000000,
    dueDate: '2024-11-30', issueDate: '2024-11-10', status: 'PARTIAL', ppn: 23400000,
    notes: 'Pembayaran DP 43% sudah diterima. Sisa 57% menunggu penyelesaian.',
    items: [
      { id: 'I3a', description: 'Machining Part Presisi Grade A - Batch 1', quantity: 50, unit: 'Pcs', unitPrice: 2500000, total: 125000000 },
      { id: 'I3b', description: 'Machining Part Presisi Grade A - Batch 2', quantity: 46, unit: 'Pcs', unitPrice: 2370000, total: 109020000 },
    ],
  },
  {
    id: 'INV004', invoiceNumber: 'INV-2024-0258', soNumber: 'SO-2024-0098', customerId: 'C004',
    customerName: 'PT Sinar Mesin Konstruksi', amount: 343200000, paidAmount: 0,
    dueDate: '2024-11-25', issueDate: '2024-11-01', status: 'OVERDUE', ppn: 31200000,
    notes: 'PERHATIAN: Invoice sudah melewati jatuh tempo. Harap segera melakukan pembayaran.',
    items: [
      { id: 'I4', description: 'Konstruksi Rangka Conveyor Belt 50M', quantity: 1, unit: 'Unit', unitPrice: 312000000, total: 312000000 },
    ],
  },
  {
    id: 'INV005', invoiceNumber: 'INV-2024-0261', soNumber: 'SO-2024-0102', customerId: 'C005',
    customerName: 'UD Bengkel Las Jaya Abadi', amount: 61600000, paidAmount: 61600000,
    dueDate: '2024-12-10', issueDate: '2024-11-22', status: 'PAID', ppn: 5600000,
    notes: '',
    items: [
      { id: 'I5', description: 'Pengelasan Struktur Tangki Storage 5000L', quantity: 2, unit: 'Unit', unitPrice: 28000000, total: 56000000 },
    ],
  },
  {
    id: 'INV006', invoiceNumber: 'INV-2024-0265', soNumber: 'SO-2024-0108', customerId: 'C006',
    customerName: 'PT Industri Komponen Nusantara', amount: 195800000, paidAmount: 0,
    dueDate: '2024-12-20', issueDate: '2024-11-26', status: 'PENDING', ppn: 17800000,
    notes: 'DP 30% belum diterima.',
    items: [
      { id: 'I6a', description: 'Spare Part Bearing Housing Type A', quantity: 20, unit: 'Pcs', unitPrice: 5500000, total: 110000000 },
      { id: 'I6b', description: 'Spare Part Bearing Housing Type B', quantity: 16, unit: 'Pcs', unitPrice: 4250000, total: 68000000 },
    ],
  },
  {
    id: 'INV007', invoiceNumber: 'INV-2024-0268', soNumber: 'SO-2024-0112', customerId: 'C001',
    customerName: 'PT Mitra Baja Indonesia', amount: 489500000, paidAmount: 0,
    dueDate: '2024-12-25', issueDate: '2024-11-28', status: 'PENDING', ppn: 44500000,
    notes: 'Proyek besar, termin 60 hari.',
    items: [
      { id: 'I7', description: 'Fabrikasi Plat Baja Kapal 10mm - 50 ton', quantity: 50, unit: 'Ton', unitPrice: 8900000, total: 445000000 },
    ],
  },
  {
    id: 'INV008', invoiceNumber: 'INV-2024-0270', soNumber: 'SO-2024-0115', customerId: 'C003',
    customerName: 'PT Karya Logam Utama', amount: 134200000, paidAmount: 134200000,
    dueDate: '2024-12-08', issueDate: '2024-11-29', status: 'PAID', ppn: 12200000,
    notes: '',
    items: [
      { id: 'I8', description: 'Assembly Gear Box Industrial 7.5kW', quantity: 4, unit: 'Unit', unitPrice: 30500000, total: 122000000 },
    ],
  },
];

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments: Payment[] = [
  {
    id: 'PAY001', invoiceId: 'INV003', invoiceNumber: 'INV-2024-0253', customerName: 'PT Karya Logam Utama',
    amount: 100000000, paymentDate: '2024-11-28', paymentMethod: 'Transfer Bank', bankRef: 'BCA-20241128-001234',
    bankName: 'Bank BCA', status: 'PENDING', proofAvailable: true,
    notes: 'Pembayaran tahap 1 (DP)',
  },
  {
    id: 'PAY002', invoiceId: 'INV006', invoiceNumber: 'INV-2024-0265', customerName: 'PT Industri Komponen Nusantara',
    amount: 58740000, paymentDate: '2024-11-30', paymentMethod: 'Transfer Bank', bankRef: 'BNI-20241130-005678',
    bankName: 'Bank BNI', status: 'PENDING', proofAvailable: true,
    notes: 'DP 30% dari total invoice',
  },
  {
    id: 'PAY003', invoiceId: 'INV001', invoiceNumber: 'INV-2024-0247', customerName: 'PT Mitra Baja Indonesia',
    amount: 206250000, paymentDate: '2024-11-20', paymentMethod: 'Transfer Bank', bankRef: 'MANDIRI-20241120-009012',
    bankName: 'Bank Mandiri', status: 'VERIFIED', proofAvailable: true,
    verifiedBy: 'Ahmad Fauzi', verifiedAt: '2024-11-21 09:30',
  },
  {
    id: 'PAY004', invoiceId: 'INV005', invoiceNumber: 'INV-2024-0261', customerName: 'UD Bengkel Las Jaya Abadi',
    amount: 61600000, paymentDate: '2024-11-25', paymentMethod: 'Transfer Bank', bankRef: 'BRI-20241125-003456',
    bankName: 'Bank BRI', status: 'VERIFIED', proofAvailable: true,
    verifiedBy: 'Ahmad Fauzi', verifiedAt: '2024-11-26 10:15',
  },
  {
    id: 'PAY005', invoiceId: 'INV004', invoiceNumber: 'INV-2024-0258', customerName: 'PT Sinar Mesin Konstruksi',
    amount: 100000000, paymentDate: '2024-11-22', paymentMethod: 'Cek', bankRef: 'CEK-SMK-001',
    bankName: 'Bank Mandiri', status: 'REJECTED', proofAvailable: false,
    rejectionReason: 'Bukti pembayaran tidak sesuai. Nominal pada bukti transfer tidak cocok dengan nominal yang dibayarkan.',
  },
];

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions: Transaction[] = [
  { id: 'TRX001', type: 'PAYMENT', referenceNumber: 'PAY-2024-001', description: 'Penerimaan pembayaran INV-2024-0247', debit: 0, credit: 206250000, balance: 1456780000, date: '2024-11-20', status: 'COMPLETED', customerName: 'PT Mitra Baja Indonesia', category: 'Penerimaan' },
  { id: 'TRX002', type: 'INVOICE', referenceNumber: 'INV-2024-0251', description: 'Penerbitan invoice CV Teknik Mandiri', debit: 104500000, credit: 0, balance: 1250530000, date: '2024-11-20', status: 'OUTSTANDING', customerName: 'CV Teknik Mandiri Sejahtera', category: 'Piutang' },
  { id: 'TRX003', type: 'PAYMENT', referenceNumber: 'PAY-2024-002', description: 'Penerimaan pembayaran INV-2024-0261', debit: 0, credit: 61600000, balance: 1312130000, date: '2024-11-25', status: 'COMPLETED', customerName: 'UD Bengkel Las Jaya Abadi', category: 'Penerimaan' },
  { id: 'TRX004', type: 'INVOICE', referenceNumber: 'INV-2024-0265', description: 'Penerbitan invoice PT IKN', debit: 195800000, credit: 0, balance: 1116330000, date: '2024-11-26', status: 'OUTSTANDING', customerName: 'PT Industri Komponen Nusantara', category: 'Piutang' },
  { id: 'TRX005', type: 'CREDIT_NOTE', referenceNumber: 'CN-2024-003', description: 'Credit note penyesuaian harga material', debit: 0, credit: 5000000, balance: 1121330000, date: '2024-11-27', status: 'COMPLETED', customerName: 'PT Karya Logam Utama', category: 'Penyesuaian' },
  { id: 'TRX006', type: 'PAYMENT', referenceNumber: 'PAY-2024-003', description: 'DP pertama INV-2024-0253', debit: 0, credit: 100000000, balance: 1221330000, date: '2024-11-28', status: 'PENDING_VERIFICATION', customerName: 'PT Karya Logam Utama', category: 'Penerimaan' },
  { id: 'TRX007', type: 'INVOICE', referenceNumber: 'INV-2024-0268', description: 'Penerbitan invoice PT Mitra Baja - Proyek Plat', debit: 489500000, credit: 0, balance: 731830000, date: '2024-11-28', status: 'OUTSTANDING', customerName: 'PT Mitra Baja Indonesia', category: 'Piutang' },
  { id: 'TRX008', type: 'PAYMENT', referenceNumber: 'PAY-2024-004', description: 'Penerimaan pembayaran INV-2024-0270', debit: 0, credit: 134200000, balance: 866030000, date: '2024-11-29', status: 'COMPLETED', customerName: 'PT Karya Logam Utama', category: 'Penerimaan' },
];

// ─── Chart Data ───────────────────────────────────────────────────────────────

export const monthlyRevenueData = [
  { month: 'Jun', revenue: 678000000, invoiced: 720000000, target: 700000000 },
  { month: 'Jul', revenue: 825000000, invoiced: 890000000, target: 750000000 },
  { month: 'Aug', revenue: 742000000, invoiced: 780000000, target: 750000000 },
  { month: 'Sep', revenue: 910000000, invoiced: 960000000, target: 850000000 },
  { month: 'Oct', revenue: 1045000000, invoiced: 1120000000, target: 950000000 },
  { month: 'Nov', revenue: 601850000, invoiced: 1392450000, target: 1000000000 },
];

export const invoiceStatusData = [
  { name: 'Lunas', value: 3, color: '#16a34a' },
  { name: 'Menunggu', value: 3, color: '#d97706' },
  { name: 'Jatuh Tempo', value: 1, color: '#dc2626' },
  { name: 'Sebagian', value: 1, color: '#C8102E' },
];

export const topCustomersData = [
  { name: 'PT Mitra Baja', revenue: 695750000 },
  { name: 'PT Karya Logam', revenue: 391400000 },
  { name: 'PT IKN', revenue: 195800000 },
  { name: 'PT SMK', revenue: 343200000 },
  { name: 'CV TMS', revenue: 104500000 },
  { name: 'UD BLJA', revenue: 61600000 },
];
