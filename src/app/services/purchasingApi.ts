import apiClient from './apiClient';

export interface MaterialRequirementDto {
  id: string;
  salesOrderId: string;
  salesOrderNumber: string;
  salesOrderItemId?: string | null;
  productId: string;
  productPartNumber: string;
  productDescription: string;
  materialSpec?: string | null;
  requiredQty: number;
  stockOnHand: number;
  stockBalanceAfterRequirement: number;
  requiresPurchase: boolean;
  stockNotes?: string | null;
  stockUpdatedAtUtc?: string | null;
  projectName: string;
  status: string;
  updatedAtUtc: string;
  purchaseItems: LinkedPurchaseItemDto[];
}

export interface LinkedPurchaseItemDto {
  purchaseRequestId: string;
  prNumber: string;
  purchaseRequestItemId: string;
  purchaseRequestStatus: string;
  purchaseStatus: string;
  purchaseCategory: string;
  supplierName?: string | null;
  poNumber?: string | null;
  estimatedPrice?: number | null;
  totalPrice?: number | null;
  unitPrice?: number | null;
  purchaseDate?: string | null;
  expectedArrivalDate?: string | null;
  receivedDate?: string | null;
  purchaseNotes?: string | null;
  rejectionReason?: string | null;
}

export interface PurchaseRequestDto {
  id: string;
  prNumber: string;
  requestDate: string;
  requestedByUserId: string;
  requesterName: string;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  status: string;
  reviewedByUserId?: string | null;
  reviewedAtUtc?: string | null;
  rejectionReason?: string | null;
  supervisorReviewedByUserId?: string | null;
  supervisorReviewedAtUtc?: string | null;
  supervisorRejectionReason?: string | null;
  financeReviewedByUserId?: string | null;
  financeReviewedAtUtc?: string | null;
  financeRejectionReason?: string | null;
  updatedAtUtc: string;
  items: Array<{
    id: string;
    materialRequirementId?: string | null;
    salesOrderId?: string | null;
    salesOrderNumber?: string | null;
    projectName?: string | null;
    itemName: string;
    size?: string | null;
    qty: number;
    urgency: string;
    purchaseCategory: string;
    suggestedSupplier?: string | null;
    supplierName?: string | null;
    poNumber?: string | null;
    estimatedPrice?: number | null;
    totalPrice?: number | null;
    unitPrice?: number | null;
    purchaseDate?: string | null;
    expectedArrivalDate?: string | null;
    receivedDate?: string | null;
    purchaseStatus: string;
    purchaseNotes?: string | null;
    rejectionReason?: string | null;
    notes?: string | null;
  }>;
}

export interface CreatePurchaseRequestPayload {
  requestDate: string;
  requestedByUserId: string;
  requesterName: string;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  items: Array<{
    id?: string;
    materialRequirementId?: string | null;
    salesOrderId?: string | null;
    salesOrderNumber?: string | null;
    projectName?: string | null;
    itemName: string;
    size?: string | null;
    qty: number;
    suggestedSupplier?: string | null;
    notes?: string | null;
    urgency?: 'Normal' | 'Urgent' | 'Critical' | string | null;
    purchaseCategory?: 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | string | null;
    totalPrice?: number | null;
  }>;
}

export const purchasingApi = {
  async listMaterialRequirements(salesOrderId?: string) {
    const response = await apiClient.get<MaterialRequirementDto[]>('/api/v1/purchasing/material-requirements', {
      params: { salesOrderId },
    });
    return response.data;
  },

  async listPurchaseRequests(params?: { salesOrderId?: string; status?: string }) {
    const response = await apiClient.get<PurchaseRequestDto[]>('/api/v1/purchasing/purchase-requests', { params });
    return response.data;
  },

  async createPurchaseRequest(request: CreatePurchaseRequestPayload) {
    const response = await apiClient.post<PurchaseRequestDto>('/api/v1/purchasing/purchase-requests', request);
    return response.data;
  },

  async updatePurchaseRequest(purchaseRequestId: string, request: CreatePurchaseRequestPayload) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}`,
      request,
    );
    return response.data;
  },

  async reviewPurchaseRequest(purchaseRequestId: string, request: {
    reviewedByUserId: string;
    decision: 'Accept' | 'Reject';
    rejectionReason?: string | null;
    reviewStage?: 'Supervisor' | 'Finance';
  }) {
    const response = await apiClient.post<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/review`,
      request,
    );
    return response.data;
  },

  async supervisorReviewPurchaseRequest(purchaseRequestId: string, request: {
    reviewedByUserId: string;
    decision: 'Accept' | 'Reject';
    rejectionReason?: string | null;
  }) {
    const response = await apiClient.post<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/supervisor-review`,
      request,
    );
    return response.data;
  },

  async financeReviewPurchaseRequest(purchaseRequestId: string, request: {
    reviewedByUserId: string;
    decision: 'Accept' | 'Reject';
    rejectionReason?: string | null;
  }) {
    const response = await apiClient.post<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/finance-review`,
      request,
    );
    return response.data;
  },

  async processPurchaseRequestItem(purchaseRequestId: string, itemId: string, request: {
    supplierName: string;
    expectedArrivalDate: string;
    poNumber?: string | null;
    estimatedPrice?: number | null;
    totalPrice?: number | null;
    purchaseCategory: string;
    purchaseNotes?: string | null;
  }) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/items/${itemId}/process`,
      request,
    );
    return response.data;
  },

  async updatePurchaseRequestItemInfo(purchaseRequestId: string, itemId: string, request: {
    supplierName?: string | null;
    purchaseDate?: string | null;
    expectedArrivalDate?: string | null;
    receivedDate?: string | null;
    purchaseStatus?: string | null;
    purchaseNotes?: string | null;
    poNumber?: string | null;
    estimatedPrice?: number | null;
    totalPrice?: number | null;
    purchaseCategory?: string | null;
    qty?: number | null;
    itemName?: string | null;
  }) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/items/${itemId}/purchase-info`,
      request,
    );
    return response.data;
  },

  async rejectPurchaseRequestItem(purchaseRequestId: string, itemId: string, request: {
    rejectionReason?: string | null;
  }) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/items/${itemId}/reject`,
      request,
    );
    return response.data;
  },

  async receivePurchaseRequestItem(purchaseRequestId: string, itemId: string, request: {
    receivedDate: string;
    purchaseNotes?: string | null;
    receivedQty?: number;
  }) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/items/${itemId}/receive`,
      request,
    );
    return response.data;
  },

  async getPurchaseRequest(id: string) {
    const response = await apiClient.get<PurchaseRequestDto>(`/api/v1/purchasing/purchase-requests/${id}`);
    return response.data;
  },

  async updateMaterialRequirementStock(id: string, data: { currentStock: number, minimumStock: number, unit: string }) {
    const response = await apiClient.put<MaterialRequirementDto>(
      `/api/v1/purchasing/material-requirements/${id}/stock`,
      data,
    );
    return response.data;
  },
};
