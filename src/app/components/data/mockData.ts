export type UserRole = 'Sales' | 'Engineering' | 'Engineering' | 'Engineering Supervisor' | 'QC' | 'Owner' | 'Admin' | 'Finance' | 'Purchasing';

export type SOStatus =
  | 'Waiting Payment'
  | 'Pending Design'
  | 'Waiting Spv Approval'
  | 'Waiting Pricing'
  | 'Waiting Client Approval'
  | 'Waiting Approval'
  | 'Revision Required'
  | 'Ready for Production'
  | 'In Production'
  | 'Paused'
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
  email?: string;
  contactPerson?: string;
}

export interface SalesOrder {
  id: string;
  backendId?: string;
  backendStatus?: string;
  soNumber?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerDrawingUrl?: string;
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
  designReference?: string | null;
  backendDesignStatus?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  startTime?: string;
  endTime?: string;
  lateReason?: string;
  pauseReason?: string;
  qcStatus?: 'Go' | 'NoGo';
  qcNotes?: string;
  qcPhotos?: string[];
  productionPhotos?: string[];
  completionNote?: string;
  qcAt?: string;
  completedAt?: string;
  isRework?: boolean;
  notes?: string;
  timeline?: { id: string; step: string; label: string; date: string; completed: boolean; current?: boolean; assignedTo?: string }[];
  activities?: { id: string; user: string; role: string; action: string; timestamp: string }[];
  invoice?: { invoiceId?: string; invoiceNumber: string; invoiceDate: string; dueDate: string; amount: number; paidAmount?: number; paymentSchedules?: { label: string; percentage: number; amount: number; dueDate: string }[]; status: string; paymentDate: string; rejectedPayments?: { date: string; reason: string }[] };
  quotationDate?: string;
  designApprovedAt?: string;
  assignedTo?: string;
  assignedName?: string;
  designAssignedTo?: string;
  designAssignedName?: string;
  designApprovedByUserId?: string;
  designApprovedByName?: string;
  materialRequestStatus?: 'none' | 'requested' | 'approved';
  materialShortageDetected?: boolean;
  estimatedAmount?: number;
  customerImageUrl?: string;
  items?: any[];
  materials?: any[];
  designId?: string;
  productName?: string;
  isQuotation?: boolean;
  designRevisions?: { version: number, url: string, changedAt: string, changedBy: string }[];
  bomsPerItem?: Record<string, any[]>;
}

export const ENGINEERING_DESIGNS: any[] = [];



export const STATUS_STEPS: SOStatus[] = [
  'Pending Design',
  'Waiting Approval',
  'Ready for Production',
  'In Production',
  'QC',
  'Completed',
];

export const REVISION_STATUSES: SOStatus[] = ['Pending Design', 'Revision Required'];

export const invoiceStatusConfig: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string; borderColor: string }> = {
  paid: {
    label: "Lunas",
    bgColor: "#F0FDF4", textColor: "#166534",
    dotColor: "#22C55E", borderColor: "#BBF7D0",
  },
  verified: {
    label: "Terverifikasi",
    bgColor: "#EFF6FF", textColor: "#1E40AF",
    dotColor: "#3B82F6", borderColor: "#BFDBFE",
  },
  pending_verification: {
    label: "Menunggu Verifikasi",
    bgColor: "#FFFBEB", textColor: "#92400E",
    dotColor: "#F59E0B", borderColor: "#FDE68A",
  },
  waiting: {
    label: "Waiting",
    bgColor: "#F8FAFC", textColor: "#475569",
    dotColor: "#F59E0B", borderColor: "#E2E8F0",
  },
  not_created: {
    label: "Belum Dibuat",
    bgColor: "#F8FAFC", textColor: "#475569",
    dotColor: "#CBD5E1", borderColor: "#E2E8F0",
  },
};

export function getStatusColor(status: SOStatus): { bg: string; text: string; border: string; dot: string } {
  const map: Record<SOStatus, { bg: string; text: string; border: string; dot: string }> = {
    'Waiting Payment': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-600' },
    'Pending Design': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-700' },
    'Waiting Spv Approval': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600' },
    'Waiting Pricing': { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-800' },
    'Waiting Client Approval': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-600' },
    'Waiting Approval': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    'Revision Required': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600' },
    'Ready for Production': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
    'In Production': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600' },
    'Paused': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    'QC': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
    'Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600' },
  };

  return map[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-600' };
}

export type QuotationStatus = 'draft' | 'pending_design' | 'design_review' | 'client_design_approval' | 'waiting_pricing' | 'client_price_approval' | 'won' | 'lost';

export interface Quotation {
  id: string;
  backendId?: string;
  quotationNumber?: string;
  customerId: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  deadline: string;
  status: QuotationStatus;
  designId?: string;
  designLink?: string;
  estimatedAmount?: number;
  customerImageUrl?: string;
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  assignedName?: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  revisions?: { revNumber: number; amount: number; date: string; notes: string }[];
  materials?: any[];
  notes?: string;
  timeline?: any[];
  invoice?: { status: string };
  lostReason?: string;
}

export function getQuotationStatusColor(status: QuotationStatus): { bg: string; text: string; border: string; label: string } {
  if (status === 'draft') return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Draft' };
  if (status === 'pending_design' || status === 'design_review') return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Design Process' };
  if (status === 'client_design_approval') return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Approve Design' };
  if (status === 'waiting_pricing') return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Waiting Pricing' };
  if (status === 'client_price_approval') return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Approve Price' };
  if (status === 'won') return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Won' };
  if (status === 'lost') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Lost' };
  return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Unknown' };
}

export function getCustomer(code: string, customers: Customer[]): Customer | undefined {
  return customers.find(customer => customer.code === code);
}

export function calcProductionDuration(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.round(diff / (1000 * 60 * 60));
}

export type PurchasingUrgency = 'Normal' | 'Urgent' | 'Critical';
export type PurchasingStatus = 'Pending' | 'Diproses' | 'Selesai' | 'Ditolak';

export interface PurchasingItem {
  itemId?: string;
  materialRequirementId?: string | null;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  purchaseCategory?: 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | string | null;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  supplierName?: string;
  estimatedPrice?: number;
  totalPrice?: number;
  purchaseStatus?: string;
}

export interface PurchasingRequest {
  id: string;
  backendId?: string;
  backendStatus?: string;
  soId?: string;
  salesOrderId?: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  items?: PurchasingItem[];
  urgency: PurchasingUrgency;
  notes: string;
  requestedBy: string;
  requestedByUserId?: string;
  requestedAt: string;
  status: PurchasingStatus;
  supplier?: string;
  poNumber?: string;
  estimatedPrice?: number;
  expectedDelivery?: string;
  receivedAt?: string;
  rejectionReason?: string;
}

export function getDefaultRouteForRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    Sales: '/app/sales',
    'Engineering': '/app/engineering',
    'Engineering Supervisor': '/app/engineering',
    Owner: '/app/dashboard',
    Admin: '/app/admin',
    Finance: '/app/finance',
    Purchasing: '/app/purchasing',
    QC: '/app/qc',
  };
  return map[role];
}
