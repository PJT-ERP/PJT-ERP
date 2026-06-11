import apiClient from './apiClient';

export interface InvoiceCandidateItemDto {
  salesOrderItemId: string;
  productId: string;
  productPartNumber: string;
  productDescription: string;
  qty: number;
}

export interface InvoiceCandidateDto {
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerEmail?: string | null;
  targetDate?: string | null;
  completedAtUtc: string;
  status: string;
  items: InvoiceCandidateItemDto[];
}

export interface CreateInvoiceRequest {
  salesOrderId: string;
  invoiceDate: string;
  dueDate: string;
  taxPercent: number;
  items: Array<{
    salesOrderItemId: string;
    unitPrice: number;
  }>;
  paymentSchedules: Array<{
    label: string;
    percentage: number;
    dueDate: string;
  }>;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerEmail?: string | null;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPercent: number;
  status: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  items: Array<{
    salesOrderItemId: string;
    productId: string;
    partNumber: string;
    description: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  paymentSchedules: Array<{
    id: string;
    label: string;
    percentage: number;
    amount: number;
    dueDate: string;
    isPaid: boolean;
  }>;
  payments: Array<{
    id: string;
    paymentDate: string;
    amount: number;
    notes?: string | null;
  }>;
  collectionLetters: Array<{
    id: string;
    letterNumber: string;
    issuedDate: string;
    dueDate: string;
    notes?: string | null;
  }>;
}

export interface FinanceDashboardDto {
  customerId?: string | null;
  customerName?: string | null;
  invoiceCount: number;
  overdueInvoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
  averagePaymentPercent: number;
}

export const financeApi = {
  async listInvoiceCandidates(customerId?: string) {
    const response = await apiClient.get<InvoiceCandidateDto[]>('/api/v1/finance/invoice-candidates', {
      params: { customerId },
    });
    return response.data;
  },

  async listInvoices(params?: {
    customerId?: string;
    dueFrom?: string;
    dueTo?: string;
    status?: string;
    sortBy?: 'dueDateAsc' | 'dueDateDesc' | 'invoiceDateAsc' | 'invoiceDateDesc';
  }) {
    const response = await apiClient.get<InvoiceDto[]>('/api/v1/finance/invoices', { params });
    return response.data;
  },

  async createInvoice(request: CreateInvoiceRequest) {
    const response = await apiClient.post<InvoiceDto>('/api/v1/finance/invoices', request);
    return response.data;
  },

  async recordPayment(invoiceId: string, request: { paymentDate: string; amount: number; notes?: string | null }) {
    const response = await apiClient.post<InvoiceDto>(`/api/v1/finance/invoices/${invoiceId}/payments`, request);
    return response.data;
  },

  async createCollectionLetter(invoiceId: string, request: { issuedDate: string; dueDate: string; notes?: string | null }) {
    const response = await apiClient.post<InvoiceDto>(`/api/v1/finance/invoices/${invoiceId}/collection-letters`, request);
    return response.data;
  },

  async getDashboard(customerId?: string) {
    const response = await apiClient.get<FinanceDashboardDto>('/api/v1/finance/dashboard', {
      params: { customerId },
    });
    return response.data;
  },
};
