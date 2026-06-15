export type UserRole = 'Sales' | 'Engineering Worker' | 'Engineering Supervisor' | 'Owner' | 'Admin' | 'Finance' | 'Purchasing';

export type SOStatus =
  | 'Menunggu Invoice DP'
  | 'Pending Design'
  | 'Waiting Spv Approval'
  | 'Waiting Pricing'
  | 'Waiting Client Approval'
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
  backendId?: string;
  soNumber?: string;
  customerId: string;
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
  backendDesignStatus?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  startTime?: string;
  endTime?: string;
  lateReason?: string;
  qcStatus?: 'Go' | 'NoGo';
  qcNotes?: string;
  qcPhotos?: string[];
  qcAt?: string;
  completedAt?: string;
  isRework?: boolean;
  notes?: string;
  timeline?: { id: string; step: string; label: string; date: string; completed: boolean; current?: boolean; assignedTo?: string }[];
  activities?: { id: string; user: string; role: string; action: string; timestamp: string }[];
  invoice?: { invoiceId?: string; invoiceNumber: string; invoiceDate: string; dueDate: string; amount: number; status: string; paymentDate: string };
  quotationDate?: string;
  designApprovedAt?: string;
  assignedTo?: string;
  assignedName?: string;
  materialRequestStatus?: 'none' | 'requested' | 'approved';
  materialShortageDetected?: boolean;
  estimatedAmount?: number;
  customerImageUrl?: string;
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

export function getStatusColor(status: SOStatus): { bg: string; text: string; border: string } {
  const map: Record<SOStatus, { bg: string; text: string; border: string }> = {
    'Menunggu Invoice DP': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    'Pending Design': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    'Waiting Spv Approval': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'Waiting Pricing': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Waiting Client Approval': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Waiting Approval': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Revision Required': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    'Ready for Production': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'In Production': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    QC: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
    Completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    Rejected: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  };

  return map[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
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
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
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
    'Engineering Worker': '/app/engineering',
    'Engineering Supervisor': '/app/engineering',
    Owner: '/app/dashboard',
    Admin: '/app/admin',
    Finance: '/app/finance',
    Purchasing: '/app/purchasing',
  };
  return map[role];
}
