import apiClient from './apiClient';

export interface QcInspectionDto {
  id: string;
  refNo: string;
  salesOrderNumber: string;
  productName?: string | null;
  productCode?: string | null;
  drawingRef?: string | null;
  customerDrawingUrl?: string | null;
  designReference?: string | null;
  orderQty?: number | null;
  materialSpec?: string | null;
  productionFinishedAtUtc?: string | null;
  assignedReviewerUserId?: string | null;
  assignedReviewerName?: string | null;
  qcImageUrl?: string | null;
  notes?: string | null;
  status: string;
  decision?: string | null;
  reviewedByUserId?: string | null;
  reviewerName?: string | null;
  reviewedAtUtc?: string | null;
  updatedAtUtc: string;
}

export interface UploadQcResultPayload {
  reviewerUserId: string;
  reviewerName: string;
  qcImageUrl: string;
  notes?: string | null;
  decision: 'Go' | 'NoGo';
}

export const qcApi = {
  async listInspections() {
    const response = await apiClient.get<QcInspectionDto[]>('/api/v1/qc/inspections');
    return response.data;
  },

  async uploadResult(inspectionId: string, request: UploadQcResultPayload) {
    const response = await apiClient.put<QcInspectionDto>(
      `/api/v1/qc/inspections/${inspectionId}/result`,
      request,
    );
    return response.data;
  },
};
