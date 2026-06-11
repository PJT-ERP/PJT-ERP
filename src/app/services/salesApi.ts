import apiClient from './apiClient';

export interface CustomerDto {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface CreateCustomerRequest {
  code: string;
  name: string;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
}

export interface ProductDto {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  materialSpec?: string | null;
  isActive?: boolean;
}

export interface CreateProductRequest {
  partNumber: string;
  description: string;
  unit: string;
  materialSpec?: string | null;
}

export interface SalesOrderDto {
  id: string;
  soNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerEmail?: string | null;
  customerDrawingUrl?: string | null;
  designReference?: string | null;
  designStatus: string;
  designApprovedAtUtc?: string | null;
  soDate: string;
  targetDate?: string | null;
  productionWorkerUserId?: string | null;
  productionWorkerName?: string | null;
  qcReviewerUserId?: string | null;
  qcReviewerName?: string | null;
  status: string;
  productionStatus: string;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  qcDecision?: string | null;
  drawingFileUrl?: string | null;
  items: Array<{
    id: string;
    productId: string;
    productPartNumber: string;
    productDescription: string;
    qty: number;
    notes?: string | null;
  }>;
}

export interface CreateSalesOrderRequest {
  customerId: string;
  soDate: string;
  targetDate?: string | null;
  items: Array<{
    productId: string;
    qty: number;
    notes?: string | null;
  }>;
  productionWorker?: {
    userId: string;
    name: string;
  } | null;
  qcReviewer?: {
    userId: string;
    name: string;
  } | null;
  customerDrawingUrl?: string | null;
  designReference?: string | null;
  designStatus?: string | null;
}

export interface AssignSalesOrderEngineersRequest {
  productionWorker?: {
    userId: string;
    name: string;
  } | null;
  qcReviewer?: {
    userId: string;
    name: string;
  } | null;
}

export const salesApi = {
  async listCustomers() {
    const response = await apiClient.get<CustomerDto[]>('/api/v1/master-data/customers');
    return response.data;
  },

  async createCustomer(request: CreateCustomerRequest) {
    const response = await apiClient.post<CustomerDto>('/api/v1/master-data/customers', request);
    return response.data;
  },

  async listProducts() {
    const response = await apiClient.get<ProductDto[]>('/api/v1/master-data/products');
    return response.data;
  },

  async createProduct(request: CreateProductRequest) {
    const response = await apiClient.post<ProductDto>('/api/v1/master-data/products', request);
    return response.data;
  },

  async listSalesOrders() {
    const response = await apiClient.get<SalesOrderDto[]>('/api/v1/production/sales-orders');
    return response.data;
  },

  async createSalesOrder(request: CreateSalesOrderRequest) {
    const response = await apiClient.post<SalesOrderDto>('/api/v1/production/sales-orders', request);
    return response.data;
  },

  async assignSalesOrderEngineers(salesOrderId: string, request: AssignSalesOrderEngineersRequest) {
    const response = await apiClient.put<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/engineers`, request);
    return response.data;
  },

  async getSalesOrderProgress(salesOrderId: string) {
    const response = await apiClient.get(`/api/v1/production/sales-orders/${salesOrderId}/progress`);
    return response.data;
  },

  async confirmSalesOrder(salesOrderId: string, approvedByUserId: string) {
    const response = await apiClient.post(`/api/v1/production/sales-orders/${salesOrderId}/confirm`, {
      approvedByUserId,
    });
    return response.data;
  },
};
