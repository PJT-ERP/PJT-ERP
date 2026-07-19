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
  phone?: string | null;
}

export interface UpdateCustomerRequest {
  name: string;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface ProductBomItemDto {
  id: string;
  inventoryItemId: string;
  inventoryItemCode: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  specification?: string | null;
  spec?: string | null;
}

export interface ProductDto {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  materialSpec?: string | null;
  isActive?: boolean;
  bomItems?: ProductBomItemDto[];
}

export interface CreateProductBomItemRequest {
  inventoryItemId: string;
  quantity: number;
  specification?: string | null;
  spec?: string | null;
}

export interface CreateProductRequest {
  partNumber: string;
  description: string;
  unit: string;
  materialSpec?: string | null;
  bomItems?: CreateProductBomItemRequest[];
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
  designWorkerUserId?: string | null;
  designWorkerName?: string | null;
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
  designRevisions?: Array<{
    version: number;
    url: string;
    changedBy: string;
    changedAtUtc: string;
  }>;
  items: Array<{
    id: string;
    productId: string;
    productPartNumber: string;
    productDescription: string;
    qty: number;
    unitPrice?: number;
    notes?: string | null;
    designReference?: string | null;
    customerDrawingUrl?: string | null;
  }>;
  qcPhotos?: string[] | null;
  productionPhotos?: string[] | null;
  estimatedAmount?: number | null;
  completionNote?: string | null;
}

export interface CreateSalesOrderRequest {
  customerId: string;
  soDate: string;
  targetDate?: string | null;
  items: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    notes?: string | null;
    designReference?: string | null;
    customerDrawingUrl?: string | null;
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
  designWorker?: {
    userId: string;
    name: string;
  } | null;
  productionWorker?: {
    userId: string;
    name: string;
  } | null;
  qcReviewer?: {
    userId: string;
    name: string;
  } | null;
  notes?: string;
}

export interface CompleteSalesOrderRequest {
  customer: {
    code: string;
    name: string;
    address?: string | null;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  products: Array<{
    tempId: string;
    description: string;
    unit: string;
    materialSpec?: string | null;
  }>;
  order: {
    soDate: string;
    targetDate?: string | null;
    items: Array<{
      productTempId?: string | null;
      existingProductId?: string | null;
      qty: number;
      unitPrice: number;
      notes?: string | null;
      designReference?: string | null;
      customerDrawingUrl?: string | null;
    }>;
    designWorker?: { userId: string; name: string } | null;
    productionWorker?: { userId: string; name: string } | null;
    qcReviewer?: { userId: string; name: string } | null;
    customerDrawingUrl?: string | null;
    designReference?: string | null;
    designStatus?: string | null;
  };
}

export const salesApi = {
  async listCustomers() {
    const response = await apiClient.get<CustomerDto[]>('/api/v1/master-data/customers');
    return response.data;
  },

  async getNextCustomerCode() {
    const response = await apiClient.get<{ code: string }>('/api/v1/master-data/customers/next-code');
    return response.data;
  },

  async createCustomer(request: CreateCustomerRequest) {
    const response = await apiClient.post<CustomerDto>('/api/v1/master-data/customers', request);
    return response.data;
  },

  async updateCustomer(code: string, request: UpdateCustomerRequest) {
    const response = await apiClient.put<CustomerDto>(`/api/v1/master-data/customers/${code}`, request);
    return response.data;
  },

  async deleteCustomer(code: string) {
    await apiClient.delete(`/api/v1/master-data/customers/${code}`);
  },

  async listProducts() {
    const response = await apiClient.get<ProductDto[]>('/api/v1/master-data/products');
    return response.data;
  },

  async createProduct(request: CreateProductRequest) {
    const response = await apiClient.post<ProductDto>('/api/v1/master-data/products', request);
    return response.data;
  },

  async updateProduct(productId: string, request: CreateProductRequest) {
    const response = await apiClient.put<ProductDto>(`/api/v1/master-data/products/${productId}`, request);
    return response.data;
  },

  async updateProductBom(productId: string, request: { bomItems: CreateProductBomItemRequest[] }) {
    await apiClient.put(`/api/v1/master-data/products/${productId}/bom`, request);
  },

  async deleteProduct(productId: string) {
    await apiClient.delete(`/api/v1/master-data/products/${productId}`);
  },

  async listSalesOrders() {
    const response = await apiClient.get<SalesOrderDto[]>('/api/v1/production/sales-orders');
    return response.data;
  },

  async createSalesOrder(request: CreateSalesOrderRequest) {
    const response = await apiClient.post<SalesOrderDto>('/api/v1/production/sales-orders', request);
    return response.data;
  },

  async createCompleteSalesOrder(request: CompleteSalesOrderRequest) {
    const response = await apiClient.post<SalesOrderDto>('/api/v1/production/sales-orders/complete', request);
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

  async updateSalesOrderDesignStatus(salesOrderId: string, request: { designStatus: string, reviewedByUserId?: string, reviewerName?: string, notes?: string, designReference?: string, customerDrawingUrl?: string }) {
    const response = await apiClient.put<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/design-status`, request);
    return response.data;
  },

  async updateSalesOrderPricing(salesOrderId: string, request: { items: Array<{ salesOrderItemId: string, unitPrice: number }> }) {
    const response = await apiClient.put<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/pricing`, request);
    return response.data;
  },

  async submitSalesOrderDesign(salesOrderId: string, request: { designReference: string, drawingFileUrl?: string, updatedByName?: string }) {
    const response = await apiClient.post<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/submit-design`, request);
    return response.data;
  },

  async updateSalesOrderItems(salesOrderId: string, request: { items: any[] }) {
    const response = await apiClient.put<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/items`, request);
    return response.data;
  },

  async updateCustomerDrawing(salesOrderId: string, request: { customerDrawingUrl: string, updatedByName: string }) {
    const response = await apiClient.put<SalesOrderDto>(`/api/v1/production/sales-orders/${salesOrderId}/customer-drawing`, request);
    return response.data;
  },

  async confirmSalesOrder(salesOrderId: string, approvedByUserId: string) {
    const response = await apiClient.post(`/api/v1/production/sales-orders/${salesOrderId}/confirm`, {
      approvedByUserId
    });
    return response.data;
  },

  async submitConsultation(request: { name: string, phone: string, email: string, serviceDescription: string, message: string }) {
    const response = await apiClient.post(`/api/v1/production/consultations`, request);
    return response.data;
  },

  async getConsultations() {
    const response = await apiClient.get(`/api/v1/production/consultations`);
    return response.data;
  },
  
  async updateConsultationStatus(id: string, status: string) {
    const response = await apiClient.put(`/api/v1/production/consultations/${id}/status`, { status });
    return response.data;
  }
};
