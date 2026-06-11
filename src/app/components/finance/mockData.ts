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
  paymentDate?: string;
  dueDate: string;
  issueDate: string;
  status: InvoiceStatus;
  notes: string;
  items: InvoiceItem[];
  ppn: number;
  paymentSchedules?: Array<{
    id: string;
    label: string;
    percentage: number;
    amount: number;
    dueDate: string;
    isPaid: boolean;
  }>;
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
