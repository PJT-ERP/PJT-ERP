import apiClient from './apiClient';

export interface InvoiceCandidateItemDto {
  salesOrderItemId: string;
  productId: string;
  productPartNumber: string;
  productDescription: string;
  qty: number;
  unitPrice: number;
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
  fallbackCandidate?: {
    salesOrderNumber: string;
    customerId: string;
    customerCode: string;
    customerName: string;
    customerEmail?: string | null;
    items: Array<{
      salesOrderItemId: string;
      productId: string;
      productPartNumber: string;
      productDescription: string;
      qty: number;
    }>;
  } | null;
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

export interface SubmitPaymentProofRequest {
  paymentDate: string;
  amount: number;
  bankName?: string | null;
  bankReference?: string | null;
  proofFile?: File;
  notes?: string | null;
}

export interface PaymentVerificationRequestDto {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  bankName: string;
  bankReference?: string | null;
  proofFileName?: string | null;
  proofFileUrl?: string | null;
  notes?: string | null;
  status: string;
  submittedBy: string;
  submittedAtUtc: string;
  verifiedBy?: string | null;
  verifiedAtUtc?: string | null;
  rejectionReason?: string | null;
  rejectedAtUtc?: string | null;
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

export interface SupplierPaymentDto {
  id: string;
  poNumber: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  bankName: string;
  bankReference?: string | null;
  proofFileName?: string | null;
  proofFileUrl?: string | null;
  notes?: string | null;
  createdAtUtc: string;
}

export interface SubmitSupplierPaymentRequest {
  poNumber: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  bankName: string;
  bankReference?: string | null;
  notes?: string | null;
  proofFile?: File;
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

  async listPaymentVerifications(status?: string) {
    const response = await apiClient.get<PaymentVerificationRequestDto[]>('/api/v1/finance/payment-verifications', {
      params: { status },
    });
    return response.data;
  },

  async submitPaymentProof(invoiceId: string, request: SubmitPaymentProofRequest) {
    const formData = new FormData();
    formData.append('paymentDate', request.paymentDate);
    formData.append('amount', request.amount.toString());
    if (request.bankName) formData.append('bankName', request.bankName);
    if (request.bankReference) formData.append('bankReference', request.bankReference);
    if (request.notes) formData.append('notes', request.notes);
    if (request.proofFile) formData.append('proofFile', request.proofFile);

    const response = await apiClient.post<PaymentVerificationRequestDto>(`/api/v1/finance/payment-verifications/invoices/${invoiceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async verifyPaymentProof(requestId: string) {
    const response = await apiClient.post<PaymentVerificationRequestDto>(`/api/v1/finance/payment-verifications/${requestId}/verify`);
    return response.data;
  },

  async rejectPaymentProof(requestId: string, request: { reason: string }) {
    const response = await apiClient.post<PaymentVerificationRequestDto>(`/api/v1/finance/payment-verifications/${requestId}/reject`, request);
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

  async listSupplierPayments() {
    const response = await apiClient.get<SupplierPaymentDto[]>('/api/v1/finance/supplier-payments');
    return response.data;
  },

  async submitSupplierPayment(request: SubmitSupplierPaymentRequest) {
    const formData = new FormData();
    formData.append('poNumber', request.poNumber);
    formData.append('supplierName', request.supplierName);
    formData.append('paymentDate', request.paymentDate);
    formData.append('amount', request.amount.toString());
    formData.append('bankName', request.bankName);
    if (request.bankReference) formData.append('bankReference', request.bankReference);
    if (request.notes) formData.append('notes', request.notes);
    if (request.proofFile) formData.append('proofFile', request.proofFile);

    const response = await apiClient.post<SupplierPaymentDto>('/api/v1/finance/supplier-payments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
