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
  completionNote?: string | null;
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

export interface ExecutiveDashboardDto {
  totalOrders: number;
  inProgress: number;
  completed: number;
  paused: number;
  waitingQC: number;
  overdueCount: number;
}

export interface SalesOrderMaterialTrackingDto {
  salesOrderId: string;
  soNumber: string;
  items: Array<{
    productId: string;
    productPartNumber: string;
    productDescription: string;
    qty: number;
    materialRequirements: Array<{
      materialRequirementId: string;
      inventoryItemId: string;
      inventoryItemCode: string;
      inventoryItemName: string;
      materialSpec?: string;
      requiredQty: number;
      stockOnHand: number;
      status: string;
    }>;
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

export interface ProductionQueuesDto {
  pendingAssignment: any[];
  readyToStart: any[];
  inProduction: any[];
  waitingQc: any[];
}

export interface EngineeringQueuesDto {
  pendingDesign: any[];
  revisionRequired: any[];
  waitingApproval: any[];
  completed: any[];
}

export interface FinanceCostingQueuesDto {
  waitingPricing: any[];
  pricingHistory: any[];
}

export interface ApprovalQueuesDto {
  waitingClientApproval: any[];
  log: any[];
}

export interface DashboardCountersDto {
  totalActive: number;
  pendingDesign: number;
  inProduction: number;
  waitingQc: number;
  overdueCount: number;
  readyForProduction: number;
}

export interface QcQueuesDto {
  readyForInspection: any[];
  inspectionHistory: any[];
}

export interface ProductionBoardQueuesDto {
  pendingAssignment: any[];
  readyToStart: any[];
  inProduction: any[];
  paused: any[];
  waitingQc: any[];
}

export const productionApi = {
  async getProductionQueues() {
    const response = await apiClient.get<ProductionQueuesDto>('/api/v1/production/sales-orders/queues');
    return response.data;
  },

  async getEngineeringQueues() {
    const response = await apiClient.get<EngineeringQueuesDto>('/api/v1/production/sales-orders/queues/engineering');
    return response.data;
  },

  async getFinanceCostingQueues() {
    const response = await apiClient.get<FinanceCostingQueuesDto>('/api/v1/production/sales-orders/queues/finance-costing');
    return response.data;
  },

  async getApprovalQueues() {
    const response = await apiClient.get<ApprovalQueuesDto>('/api/v1/production/sales-orders/queues/approvals');
    return response.data;
  },

  async getDashboardCounters() {
    const response = await apiClient.get<DashboardCountersDto>('/api/v1/production/dashboard/counters');
    return response.data;
  },

  async getQcQueues() {
    const response = await apiClient.get<QcQueuesDto>('/api/v1/production/sales-orders/queues/qc');
    return response.data;
  },

  async getProductionBoardQueues() {
    const response = await apiClient.get<ProductionBoardQueuesDto>('/api/v1/production/sales-orders/queues/board');
    return response.data;
  },

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
    reason?: string;
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

  async getExecutiveDashboard() {
    const response = await apiClient.get<ExecutiveDashboardDto>('/api/v1/production/dashboard/executive');
    return response.data;
  },

  async getSalesOrderMaterialTracking(salesOrderId: string) {
    const response = await apiClient.get<SalesOrderMaterialTrackingDto>(
      `/api/v1/purchasing/sales-orders/${salesOrderId}/material-tracking`,
    );
    return response.data;
  },
};
