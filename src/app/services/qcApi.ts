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
  productionPhotos?: string[] | null;
  qcPhotos?: string[] | null;
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
  productionPhotos: string[];
  qcPhotos: string[];
  notes?: string | null;
  decision: 'Go' | 'NoGo';
}

export const qcApi = {
  async listInspections() {
    const response = await apiClient.get<QcInspectionDto[]>('/api/v1/qc/inspections');
    return response.data;
  },

  async uploadPhotos(files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await apiClient.post<string[]>('/api/v1/qc/inspections/upload', formData);
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
