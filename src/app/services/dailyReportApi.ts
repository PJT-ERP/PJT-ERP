import apiClient from "./apiClient";

export type ActivityStatus = "Selesai" | "On Progress" | "Pending";
export interface ReportUser { id: string; name: string; role: string; }
export interface ReportSalesOrder { id: string; soNumber: string; customerName: string; }
export interface ReportTaskInput {
  id?: string; description: string; target: string; status: ActivityStatus; result: string;
  salesOrderId?: string | null; salesOrderNumber?: string | null; taggedUserIds: string[];
  images?: File[]; captions?: string[];
}
export interface DailyReportTask extends Omit<ReportTaskInput, "id" | "taggedUserIds" | "images" | "captions"> { id: string; sortOrder: number; taggedUsers: ReportUser[]; }
export interface DailyReportAttachment { id: string; taskId?: string | null; originalFileName: string; contentType: string; fileSizeBytes: number; caption?: string | null; createdAtUtc: string; }
export interface DailyReport { id: string; userId: string; userName: string; userRole: string; reportDate: string; summary: string; tasks: DailyReportTask[]; attachments: DailyReportAttachment[]; createdAtUtc: string; updatedAtUtc: string; }
export interface PagedResult<T> { items: T[]; page: number; pageSize: number; totalCount: number; }
export interface ReportFilters { from?: string; to?: string; role?: string; employee?: string; salesOrder?: string; status?: string; page?: number; pageSize?: number; }

export function reportFormData(data: { reportDate?: string; summary: string; tasks: ReportTaskInput[]; removedAttachmentIds?: string[] }) {
  const form = new FormData();
  if (data.reportDate) form.append("reportDate", data.reportDate);
  data.removedAttachmentIds?.forEach(id => form.append("removedAttachmentIds", id));
  form.append("summary", data.summary);
  data.tasks.forEach((task, index) => {
    const prefix = `tasks[${index}]`;
    for (const key of ["id", "description", "target", "status", "result", "salesOrderId", "salesOrderNumber"] as const) {
      if (task[key]) form.append(`${prefix}.${key}`, task[key]);
    }
    task.taggedUserIds.forEach(id => form.append(`${prefix}.taggedUserIds`, id));
    task.images?.forEach(image => form.append(`${prefix}.images`, image));
    task.captions?.forEach(caption => form.append(`${prefix}.attachmentCaptions`, caption));
  });
  return form;
}

export const dailyReportApi = {
  async create(data: { reportDate: string; summary: string; tasks: ReportTaskInput[] }) {
    return (await apiClient.post<DailyReport>("/api/v1/reports", reportFormData(data))).data;
  },
  async users() { return (await apiClient.get<ReportUser[]>("/api/v1/reports/users")).data; },
  async salesOrders(search = "") { return (await apiClient.get<ReportSalesOrder[]>("/api/v1/production/sales-orders/report-options", { params: { search } })).data; },
  async mine(page = 1, pageSize = 10) {
    return (await apiClient.get<PagedResult<DailyReport>>("/api/v1/reports/me", { params: { page, pageSize } })).data;
  },
  async mentioned(page = 1, pageSize = 10) {
    return (await apiClient.get<PagedResult<DailyReport>>("/api/v1/reports/mentioned", { params: { page, pageSize } })).data;
  },
  async all(filters: ReportFilters) {
    return (await apiClient.get<PagedResult<DailyReport>>("/api/v1/reports", { params: filters })).data;
  },
  async get(id: string) { return (await apiClient.get<DailyReport>(`/api/v1/reports/${id}`)).data; },
  async update(id: string, summary: string, tasks: ReportTaskInput[], removedAttachmentIds: string[] = []) {
    return (await apiClient.put<DailyReport>(`/api/v1/reports/${id}`, reportFormData({ summary, tasks, removedAttachmentIds }))).data;
  },
  async remove(id: string) { await apiClient.delete(`/api/v1/reports/${id}`); },
  async addAttachments(id: string, taskId: string, images: File[], captions: string[]) {
    const form = new FormData(); form.append("taskId", taskId);
    images.forEach(image => form.append("images", image));
    captions.forEach(caption => form.append("attachmentCaptions", caption));
    return (await apiClient.post<DailyReportAttachment[]>(`/api/v1/reports/${id}/attachments`, form)).data;
  },
  async deleteAttachment(reportId: string, attachmentId: string) { await apiClient.delete(`/api/v1/reports/${reportId}/attachments/${attachmentId}`); },
  async attachmentBlob(reportId: string, attachmentId: string) {
    return (await apiClient.get<Blob>(`/api/v1/reports/${reportId}/attachments/${attachmentId}`, { responseType: "blob" })).data;
  },
};
