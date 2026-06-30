import apiClient from './apiClient';

export interface SalesOrderProgressItemDto {
  salesOrderItemId: string;
  productId: string;
  productPartNumber: string;
  productDescription: string;
  qty: number;
}

export interface SalesOrderProductionProgressDto {
  salesOrderId: string;
  soNumber: string;
  customerCode: string;
  customerName: string;
  customerEmail?: string | null;
  customerDrawingUrl?: string | null;
  designReference?: string | null;
  designStatus: string;
  productionWorkerUserId?: string | null;
  productionWorkerName?: string | null;
  qcReviewerUserId?: string | null;
  qcReviewerName?: string | null;
  salesOrderStatus: string;
  productionStatus: string;
  totalItems: number;
  totalQuantity: number;
  progressPercent: number;
  drawingRef?: string | null;
  drawingFileUrl?: string | null;
  trackingBarcodeUid?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  qcDecision?: string | null;
  updatedAtUtc: string;
  items: SalesOrderProgressItemDto[];
}

export interface PublicProductionTrackingDto {
  soNumber: string;
  customerName: string;
  customerDrawingUrl?: string | null;
  designReference?: string | null;
  salesOrderStatus: string;
  productionStatus: string;
  totalItems: number;
  totalQuantity: number;
  progressPercent: number;
  drawingFileUrl?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  durationSeconds?: number | null;
  updatedAtUtc: string;
  items: Array<{
    productPartNumber: string;
    productDescription: string;
    qty: number;
  }>;
}

export interface SubmitProductionMaterialRequestPayload {
  requestedByUserId: string;
  requesterName: string;
  notes?: string | null;
  items: Array<{
    materialRequirementId?: string | null;
    salesOrderItemId?: string | null;
    itemName: string;
    size?: string | null;
    qty: number;
    urgency?: 'Normal' | 'Urgent' | 'Critical' | string | null;
    suggestedSupplier?: string | null;
    notes?: string | null;
    purchaseCategory?: 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | string | null;
  }>;
}

export const productionApi = {
  async lookupTracking(trackingCode: string) {
    const response = await apiClient.post<SalesOrderProductionProgressDto>('/api/v1/production/tracking/lookup', {
      trackingCode,
    });
    return response.data;
  },

  async getPublicTracking(trackingCode: string) {
    const response = await apiClient.get<PublicProductionTrackingDto>(
      `/api/v1/production/tracking/${encodeURIComponent(trackingCode)}`,
    );
    return response.data;
  },

  async uploadEngineeringDrawing(salesOrderId: string, request: {
    drawingFileUrl: string;
    uploadedByUserId: string;
    uploaderName: string;
    drawingRef?: string | null;
  }) {
    const response = await apiClient.put<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/engineering-drawing`,
      request,
    );
    return response.data;
  },

  async submitMaterialRequest(salesOrderId: string, request: SubmitProductionMaterialRequestPayload) {
    const response = await apiClient.post<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/material-requests`,
      request,
    );
    return response.data;
  },

  async startProduction(salesOrderId: string, request: {
    workerUserId: string;
    workerName: string;
  }) {
    const response = await apiClient.put<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/production/start`,
      request,
    );
    return response.data;
  },

  async finishProduction(salesOrderId: string, request: {
    workerUserId: string;
    workerName: string;
  }) {
    const response = await apiClient.put<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/production/finish`,
      request,
    );
    return response.data;
  },

  async pauseProduction(salesOrderId: string, request: {
    workerUserId: string;
    workerName: string;
    reason: string;
  }) {
    const response = await apiClient.put<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/production/pause`,
      request,
    );
    return response.data;
  },

  async resumeProduction(salesOrderId: string, request: {
    workerUserId: string;
    workerName: string;
  }) {
    const response = await apiClient.put<SalesOrderProductionProgressDto>(
      `/api/v1/production/sales-orders/${salesOrderId}/production/resume`,
      request,
    );
    return response.data;
  },

  async updateSalesOrderDesignStatus(salesOrderId: string, request: {
    designStatus: string;
    reviewedByUserId?: string | null;
    reviewerName?: string | null;
    designReference?: string | null;
    customerDrawingUrl?: string | null;
  }) {
    const response = await apiClient.put(
      `/api/v1/production/sales-orders/${salesOrderId}/design-status`,
      request,
    );
    return response.data;
  },
};
