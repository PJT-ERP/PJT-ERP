import apiClient from './apiClient';

export interface MaterialRequirementDto {
  id: string;
  salesOrderId: string;
  salesOrderNumber: string;
  productionOrderId: string;
  salesOrderItemId?: string | null;
  spkNumber: string;
  barcodeUid: string;
  productId: string;
  productPartNumber: string;
  productDescription: string;
  materialSpec?: string | null;
  requiredQty: number;
  stockOnHand: number;
  projectName: string;
  status: string;
}

export interface PurchaseRequestDto {
  id: string;
  prNumber: string;
  requestDate: string;
  requesterName: string;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  status: string;
  items: Array<{
    id: string;
    itemName: string;
    size?: string | null;
    qty: number;
    urgency: string;
    purchaseCategory: string;
    supplierName?: string | null;
    poNumber?: string | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    purchaseStatus: string;
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

  async reviewPurchaseRequest(purchaseRequestId: string, request: {
    reviewedByUserId: string;
    decision: 'Accept' | 'Reject';
    rejectionReason?: string | null;
  }) {
    const response = await apiClient.post<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/review`,
      request,
    );
    return response.data;
  },

  async processPurchaseRequestItem(purchaseRequestId: string, itemId: string, request: {
    supplierName: string;
    expectedArrivalDate?: string | null;
    poNumber?: string | null;
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

  async receivePurchaseRequestItem(purchaseRequestId: string, itemId: string, request: {
    receivedDate: string;
    purchaseNotes?: string | null;
  }) {
    const response = await apiClient.put<PurchaseRequestDto>(
      `/api/v1/purchasing/purchase-requests/${purchaseRequestId}/items/${itemId}/receive`,
      request,
    );
    return response.data;
  },
};
