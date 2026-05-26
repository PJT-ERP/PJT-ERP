// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = "not_created" | "waiting_payment" | "paid" | "overdue";

export interface InvoiceInfo {
  invoiceNumber: string;
  invoiceDate:   string;
  dueDate:       string;
  amount:        number;
  status:        InvoiceStatus;
  paymentDate:   string;
}

export const invoiceStatusConfig: Record<InvoiceStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  not_created:     { label: "Belum Dibuat",        textColor: "#64748B", bgColor: "#F8FAFC", borderColor: "#CBD5E1", dotColor: "#94A3B8" },
  waiting_payment: { label: "Menunggu Pembayaran",  textColor: "#92400E", bgColor: "#FFFBEB", borderColor: "#FCD34D", dotColor: "#F59E0B" },
  paid:            { label: "Dibayar",              textColor: "#065F46", bgColor: "#ECFDF5", borderColor: "#6EE7B7", dotColor: "#10B981" },
  overdue:         { label: "Overdue",              textColor: "#991B1B", bgColor: "#FEF2F2", borderColor: "#FCA5A5", dotColor: "#EF4444" },
};

export type SOStatus =
  | "draft"
  | "waiting_finance"
  | "waiting_payment"
  | "paid"
  | "engineering_review"
  | "in_production"
  | "completed"
  | "cancelled";

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  totalOrders: number;
  lastOrderDate: string;
  city: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  productName: string;
  quantity: number;
  unit: string;
  deadline: string;
  notes: string;
  status: SOStatus;
  createdDate: string;
  updatedDate: string;
  timeline: TimelineEvent[];
  activities: ActivityLog[];
  invoice?: InvoiceInfo;
}

export interface TimelineEvent {
  id: string;
  step: WorkflowStep;
  label: string;
  date: string;
  completed: boolean;
  current: boolean;
  assignedTo?: string;
}

export type WorkflowStep =
  | "customer_request"
  | "finance"
  | "engineering"
  | "production"
  | "qc"
  | "completed";

export interface ActivityLog {
  id: string;
  user: string;
  role: string;
  action: string;
  timestamp: string;
}

export const customers: Customer[] = [
  {
    id: "C001", name: "Budi Santoso", company: "PT Maju Bersama", phone: "08123456789",
    email: "budi@majubersama.co.id", address: "Jl. Industri No. 12, Bekasi Timur",
    city: "Bekasi", totalOrders: 14, lastOrderDate: "2026-05-18",
  },
  {
    id: "C002", name: "Siti Rahayu", company: "CV Karya Mandiri", phone: "08234567890",
    email: "siti@karyamandiri.com", address: "Jl. Raya Bogor Km 45, Bogor",
    city: "Bogor", totalOrders: 8, lastOrderDate: "2026-05-10",
  },
  {
    id: "C003", name: "Ahmad Fauzi", company: "PT Teknik Nusantara", phone: "08345678901",
    email: "ahmad@teknusan.co.id", address: "Jl. Gatot Subroto No. 7, Jakarta Selatan",
    city: "Jakarta", totalOrders: 22, lastOrderDate: "2026-05-20",
  },
  {
    id: "C004", name: "Dewi Lestari", company: "PT Putra Jaya Industries", phone: "08456789012",
    email: "dewi@putrajaya.co.id", address: "Kawasan Industri MM2100, Cikarang",
    city: "Cikarang", totalOrders: 5, lastOrderDate: "2026-04-28",
  },
  {
    id: "C005", name: "Hendra Wijaya", company: "CV Mitra Sejati", phone: "08567890123",
    email: "hendra@mitrasejati.com", address: "Jl. Pahlawan No. 33, Surabaya",
    city: "Surabaya", totalOrders: 11, lastOrderDate: "2026-05-15",
  },
  {
    id: "C006", name: "Rina Kusuma", company: "PT Global Tekindo", phone: "08678901234",
    email: "rina@globaltekindo.co.id", address: "Jl. Diponegoro No. 88, Semarang",
    city: "Semarang", totalOrders: 3, lastOrderDate: "2026-05-02",
  },
  {
    id: "C007", name: "Wahyu Prasetyo", company: "PT Sentosa Mekanika", phone: "08789012345",
    email: "wahyu@sentosamekanika.com", address: "Jl. Ahmad Yani No. 15, Bandung",
    city: "Bandung", totalOrders: 17, lastOrderDate: "2026-05-22",
  },
  {
    id: "C008", name: "Eko Purnomo", company: "PT Delta Precision", phone: "08890123456",
    email: "eko@deltaprecision.co.id", address: "Jl. Rungkut Industri III No. 9, Surabaya",
    city: "Surabaya", totalOrders: 6, lastOrderDate: "2026-05-01",
  },
];

export const salesOrders: SalesOrder[] = [
  {
    id: "SO001",
    soNumber: "SO-2026-0048",
    customerId: "C001",
    customerName: "Budi Santoso",
    company: "PT Maju Bersama",
    phone: "08123456789",
    email: "budi@majubersama.co.id",
    address: "Jl. Industri No. 12, Bekasi Timur",
    productName: "Pipa Galvanis 2 Inch",
    quantity: 500,
    unit: "batang",
    deadline: "2026-06-15",
    notes: "Pengiriman ke gudang utama. Harap sertakan sertifikat mutu SNI.",
    status: "in_production",
    createdDate: "2026-05-20",
    updatedDate: "2026-05-22",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-20", completed: true, current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "2026-05-21", completed: true, current: false, assignedTo: "Finance Dept" },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "2026-05-21", completed: true, current: false, assignedTo: "Engineering Dept" },
      { id: "t4", step: "production",       label: "Production",       date: "2026-05-22", completed: true, current: true,  assignedTo: "Production Floor" },
      { id: "t5", step: "qc",              label: "QC Check",         date: "",           completed: false, current: false },
      { id: "t6", step: "completed",       label: "Completed",        date: "",           completed: false, current: false },
    ],
    activities: [
      { id: "a1", user: "Andi Kurniawan",   role: "SO Staff",           action: "Sales order SO-2026-0048 dibuat dan diajukan ke Finance", timestamp: "2026-05-20 09:14" },
      { id: "a2", user: "Dewi Anggraini",   role: "Finance",            action: "Dokumen keuangan diverifikasi. SO disetujui untuk dilanjutkan ke Engineering", timestamp: "2026-05-21 08:30" },
      { id: "a3", user: "Rudi Hartono",     role: "Engineering",        action: "BOM dan spesifikasi teknis divalidasi. Dokumen produksi disiapkan", timestamp: "2026-05-21 13:45" },
      { id: "a4", user: "Manajer Produksi", role: "Production",         action: "Work Order diterbitkan. Produksi dimulai di Workshop 2", timestamp: "2026-05-22 07:00" },
    ],
    invoice: { invoiceNumber: "INV-2026-0038", invoiceDate: "2026-05-21", dueDate: "2026-06-14", amount: 15500000, status: "waiting_payment", paymentDate: "" },
  },
  {
    id: "SO002",
    soNumber: "SO-2026-0047",
    customerId: "C003",
    customerName: "Ahmad Fauzi",
    company: "PT Teknik Nusantara",
    phone: "08345678901",
    email: "ahmad@teknusan.co.id",
    address: "Jl. Gatot Subroto No. 7, Jakarta Selatan",
    productName: "Baut Hex M16 × 80mm Grade 8.8",
    quantity: 2000,
    unit: "pcs",
    deadline: "2026-06-01",
    notes: "Kualitas grade 8.8, coating galvanis hot-dip. Kemasan per 100 pcs.",
    status: "waiting_payment",
    createdDate: "2026-05-15",
    updatedDate: "2026-05-22",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-15", completed: true, current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "2026-05-16", completed: true, current: false, assignedTo: "Finance Dept" },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "2026-05-17", completed: true, current: false, assignedTo: "Engineering Dept" },
      { id: "t4", step: "production",       label: "Production",       date: "2026-05-20", completed: true, current: false, assignedTo: "Production Floor" },
      { id: "t5", step: "qc",              label: "QC Check",         date: "2026-05-22", completed: true, current: true,  assignedTo: "QC Team" },
      { id: "t6", step: "completed",       label: "Completed",        date: "",           completed: false, current: false },
    ],
    activities: [
      { id: "a1", user: "Andi Kurniawan", role: "SO Staff",     action: "SO dibuat dan dikirim ke Finance", timestamp: "2026-05-15 10:00" },
      { id: "a2", user: "Dewi Anggraini", role: "Finance",      action: "Invoice diterbitkan. Menunggu pembayaran dari pelanggan", timestamp: "2026-05-22 15:30" },
      { id: "a3", user: "Tim QC",         role: "QC",           action: "Produk lulus pemeriksaan QC. Siap kirim setelah pembayaran diterima", timestamp: "2026-05-22 14:00" },
    ],
    invoice: { invoiceNumber: "INV-2026-0037", invoiceDate: "2026-05-22", dueDate: "2026-06-05", amount: 28000000, status: "waiting_payment", paymentDate: "" },
  },
  {
    id: "SO003",
    soNumber: "SO-2026-0046",
    customerId: "C007",
    customerName: "Wahyu Prasetyo",
    company: "PT Sentosa Mekanika",
    phone: "08789012345",
    email: "wahyu@sentosamekanika.com",
    address: "Jl. Ahmad Yani No. 15, Bandung",
    productName: "Shaft Coupling Ø50mm SS316L",
    quantity: 100,
    unit: "pcs",
    deadline: "2026-05-30",
    notes: "Material stainless steel 316L. Toleransi ±0.01mm.",
    status: "engineering_review",
    createdDate: "2026-05-22",
    updatedDate: "2026-05-23",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-22", completed: true,  current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "2026-05-23", completed: true,  current: false, assignedTo: "Finance Dept" },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "2026-05-23", completed: false, current: true,  assignedTo: "Engineering Dept" },
      { id: "t4", step: "production",       label: "Production",       date: "",           completed: false, current: false },
      { id: "t5", step: "qc",              label: "QC Check",         date: "",           completed: false, current: false },
      { id: "t6", step: "completed",       label: "Completed",        date: "",           completed: false, current: false },
    ],
    activities: [
      { id: "a1", user: "Sari Dewi",      role: "SO Staff",   action: "SO baru dibuat dan diajukan ke Finance", timestamp: "2026-05-22 11:20" },
      { id: "a2", user: "Budi Santoso",   role: "Finance",    action: "Disetujui secara finansial. Diteruskan ke Engineering", timestamp: "2026-05-23 09:00" },
      { id: "a3", user: "Rudi Hartono",   role: "Engineering",action: "Sedang mereview spesifikasi teknis dan toleransi material", timestamp: "2026-05-23 10:30" },
    ],
    invoice: { invoiceNumber: "", invoiceDate: "", dueDate: "", amount: 0, status: "not_created", paymentDate: "" },
  },
  {
    id: "SO004",
    soNumber: "SO-2026-0045",
    customerId: "C002",
    customerName: "Siti Rahayu",
    company: "CV Karya Mandiri",
    phone: "08234567890",
    email: "siti@karyamandiri.com",
    address: "Jl. Raya Bogor Km 45, Bogor",
    productName: "Bearing SKF 6205-2RS",
    quantity: 50,
    unit: "pcs",
    deadline: "2026-05-28",
    notes: "",
    status: "completed",
    createdDate: "2026-05-05",
    updatedDate: "2026-05-19",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-05", completed: true, current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "2026-05-06", completed: true, current: false, assignedTo: "Finance Dept" },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "2026-05-07", completed: true, current: false, assignedTo: "Engineering Dept" },
      { id: "t4", step: "production",       label: "Production",       date: "2026-05-10", completed: true, current: false, assignedTo: "Production Floor" },
      { id: "t5", step: "qc",              label: "QC Check",         date: "2026-05-17", completed: true, current: false, assignedTo: "QC Team" },
      { id: "t6", step: "completed",       label: "Completed",        date: "2026-05-19", completed: true, current: true },
    ],
    activities: [
      { id: "a1", user: "Andi Kurniawan", role: "SO Staff", action: "SO dibuat", timestamp: "2026-05-05 08:45" },
      { id: "a2", user: "Tim QC",         role: "QC",       action: "Lulus pemeriksaan QC", timestamp: "2026-05-17 14:00" },
      { id: "a3", user: "Dewi Anggraini", role: "Finance",  action: "Pembayaran diterima. SO ditandai selesai", timestamp: "2026-05-19 09:30" },
    ],
    invoice: { invoiceNumber: "INV-2026-0033", invoiceDate: "2026-05-07", dueDate: "2026-05-21", amount: 4800000, status: "paid", paymentDate: "2026-05-18" },
  },
  {
    id: "SO005",
    soNumber: "SO-2026-0044",
    customerId: "C005",
    customerName: "Hendra Wijaya",
    company: "CV Mitra Sejati",
    phone: "08567890123",
    email: "hendra@mitrasejati.com",
    address: "Jl. Pahlawan No. 33, Surabaya",
    productName: "Gear Box Helical Ratio 1:20",
    quantity: 10,
    unit: "unit",
    deadline: "2026-06-10",
    notes: "Ratio 1:20, output shaft Ø40mm. Sertifikat uji beban wajib disertakan.",
    status: "waiting_finance",
    createdDate: "2026-05-23",
    updatedDate: "2026-05-23",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-23", completed: true,  current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "",           completed: false, current: true,  assignedTo: "Finance Dept" },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "",           completed: false, current: false },
      { id: "t4", step: "production",       label: "Production",       date: "",           completed: false, current: false },
      { id: "t5", step: "qc",              label: "QC Check",         date: "",           completed: false, current: false },
      { id: "t6", step: "completed",       label: "Completed",        date: "",           completed: false, current: false },
    ],
    activities: [
      { id: "a1", user: "Sari Dewi", role: "SO Staff", action: "SO dibuat dan dikirim ke departemen Finance untuk review", timestamp: "2026-05-23 14:10" },
    ],
    invoice: { invoiceNumber: "", invoiceDate: "", dueDate: "", amount: 0, status: "not_created", paymentDate: "" },
  },
  {
    id: "SO006",
    soNumber: "SO-2026-0043",
    customerId: "C004",
    customerName: "Dewi Lestari",
    company: "PT Putra Jaya Industries",
    phone: "08456789012",
    email: "dewi@putrajaya.co.id",
    address: "Kawasan Industri MM2100, Cikarang",
    productName: "Plat Baja ST37 10mm",
    quantity: 200,
    unit: "lembar",
    deadline: "2026-05-25",
    notes: "Potong ukuran 1200×2400mm. Bebas karat.",
    status: "cancelled",
    createdDate: "2026-05-10",
    updatedDate: "2026-05-12",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-10", completed: true, current: false, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Dibatalkan",       date: "2026-05-12", completed: true, current: true },
    ],
    activities: [
      { id: "a1", user: "Andi Kurniawan", role: "SO Staff", action: "SO dibuat", timestamp: "2026-05-10 11:00" },
      { id: "a2", user: "Sari Dewi",      role: "SO Staff", action: "SO dibatalkan atas permintaan pelanggan (perubahan spesifikasi)", timestamp: "2026-05-12 13:45" },
    ],
    invoice: { invoiceNumber: "", invoiceDate: "", dueDate: "", amount: 0, status: "not_created", paymentDate: "" },
  },
  {
    id: "SO007",
    soNumber: "SO-2026-0042",
    customerId: "C008",
    customerName: "Eko Purnomo",
    company: "PT Delta Precision",
    phone: "08890123456",
    email: "eko@deltaprecision.co.id",
    address: "Jl. Rungkut Industri III No. 9, Surabaya",
    productName: "Sprocket #50 Z30 Hardened",
    quantity: 30,
    unit: "pcs",
    deadline: "2026-06-20",
    notes: "Heat treatment HRC 55-60. Pasang sesuai drawing REV-C.",
    status: "draft",
    createdDate: "2026-05-24",
    updatedDate: "2026-05-24",
    timeline: [
      { id: "t1", step: "customer_request", label: "Customer Request", date: "2026-05-24", completed: true, current: true, assignedTo: "SO Team" },
      { id: "t2", step: "finance",          label: "Finance Review",   date: "",           completed: false, current: false },
      { id: "t3", step: "engineering",      label: "Engineering",      date: "",           completed: false, current: false },
      { id: "t4", step: "production",       label: "Production",       date: "",           completed: false, current: false },
      { id: "t5", step: "qc",              label: "QC Check",         date: "",           completed: false, current: false },
      { id: "t6", step: "completed",       label: "Completed",        date: "",           completed: false, current: false },
    ],
    activities: [
      { id: "a1", user: "Sari Dewi", role: "SO Staff", action: "Draft SO dibuat. Menunggu review internal sebelum diajukan", timestamp: "2026-05-24 08:00" },
    ],
    invoice: { invoiceNumber: "", invoiceDate: "", dueDate: "", amount: 0, status: "not_created", paymentDate: "" },
  },
];

export const statusConfig: Record<SOStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  draft:              { label: "Draft",               textColor: "#64748B", bgColor: "#F8FAFC", borderColor: "#CBD5E1", dotColor: "#94A3B8" },
  waiting_finance:    { label: "Waiting Finance",      textColor: "#92400E", bgColor: "#FFFBEB", borderColor: "#FCD34D", dotColor: "#F59E0B" },
  waiting_payment:    { label: "Waiting Payment",      textColor: "#7C3AED", bgColor: "#F5F3FF", borderColor: "#C4B5FD", dotColor: "#8B5CF6" },
  paid:               { label: "Paid",                 textColor: "#065F46", bgColor: "#ECFDF5", borderColor: "#6EE7B7", dotColor: "#10B981" },
  engineering_review: { label: "Engineering Review",   textColor: "#1E40AF", bgColor: "#EFF6FF", borderColor: "#93C5FD", dotColor: "#3B82F6" },
  in_production:      { label: "In Production",        textColor: "#0E7490", bgColor: "#ECFEFF", borderColor: "#A5F3FC", dotColor: "#06B6D4" },
  completed:          { label: "Completed",             textColor: "#14532D", bgColor: "#F0FDF4", borderColor: "#86EFAC", dotColor: "#22C55E" },
  cancelled:          { label: "Cancelled",             textColor: "#991B1B", bgColor: "#FEF2F2", borderColor: "#FCA5A5", dotColor: "#EF4444" },
};

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
