import apiClient from './apiClient';

export type QuotationStatus =
  | 'draft'
  | 'pending_design'
  | 'design_review'
  | 'client_design_approval'
  | 'waiting_pricing'
  | 'client_price_approval'
  | 'won'
  | 'lost';

export interface QuotationBomItemDto {
  id?: string;
  itemCode?: string | null;
  name: string;
  specification?: string | null;
  quantity: number;
  unit: string;
}

export interface QuotationItemDto {
  id?: string;
  productId?: string | null;
  productName: string;
  description?: string | null;
  quantity: number;
  unit: string;
  customerImageUrl?: string | null;
  designLink?: string | null;
  bomItems: QuotationBomItemDto[];
}

export interface QuotationRevisionDto {
  revisionNumber: number;
  amount: number;
  date: string;
  notes?: string | null;
}

export interface QuotationDto {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerEmail?: string | null;
  deadline: string;
  status: QuotationStatus;
  assignedEngineerId?: string | null;
  assignedEngineerName?: string | null;
  designLink?: string | null;
  estimatedAmount?: number | null;
  lostReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: QuotationItemDto[];
  revisions: QuotationRevisionDto[];
}

export interface CreateQuotationRequest {
  customerId: string;
  deadline: string;
  notes?: string | null;
  items: QuotationItemDto[];
}

export interface SubmitDesignRequest {
  designLink: string;
  bomItems: QuotationBomItemDto[];
  engineerId: string;
  engineerName: string;
}

export interface SubmitPricingRequest {
  amount: number;
  notes?: string | null;
  financeUserId: string;
  financeUserName: string;
}

export const quotationApi = {
  async list(params?: { status?: QuotationStatus; customerId?: string }) {
    const response = await apiClient.get<QuotationDto[]>('/api/v1/sales/quotations', { params });
    return response.data;
  },

  async create(request: CreateQuotationRequest) {
    const response = await apiClient.post<QuotationDto>('/api/v1/sales/quotations', request);
    return response.data;
  },

  async assignEngineer(quotationId: string, request: { engineerId: string; engineerName: string }) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/assign-engineer`, request);
    return response.data;
  },

  async submitDesign(quotationId: string, request: SubmitDesignRequest) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/design-submission`, request);
    return response.data;
  },

  async approveClientDesign(quotationId: string) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/client-design-approval`);
    return response.data;
  },

  async requestDesignRevision(quotationId: string, request: { notes?: string | null }) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/design-revision`, request);
    return response.data;
  },

  async submitPricing(quotationId: string, request: SubmitPricingRequest) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/pricing`, request);
    return response.data;
  },

  async markWon(quotationId: string) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/won`);
    return response.data;
  },

  async markLost(quotationId: string, request: { reason: string }) {
    const response = await apiClient.post<QuotationDto>(`/api/v1/sales/quotations/${quotationId}/lost`, request);
    return response.data;
  },

  async convertToSalesOrder(quotationId: string, request: { dpPercentage: number; dueDate: string }) {
    const response = await apiClient.post(`/api/v1/sales/quotations/${quotationId}/convert-to-sales-order`, request);
    return response.data;
  },
};
