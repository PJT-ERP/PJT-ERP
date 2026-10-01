import apiClient from "./apiClient";

export interface DailyReportTask { id: string; description: string; sortOrder: number; }
export interface DailyReportAttachment { id: string; originalFileName: string; contentType: string; fileSizeBytes: number; caption?: string | null; createdAtUtc: string; }
export interface DailyReport { id: string; userId: string; userName: string; userRole: string; reportDate: string; summary: string; tasks: DailyReportTask[]; attachments: DailyReportAttachment[]; createdAtUtc: string; updatedAtUtc: string; }
export interface PagedResult<T> { items: T[]; page: number; pageSize: number; totalCount: number; }

const toFormData = (data: { reportDate?: string; summary?: string; tasks?: string[]; images?: File[]; captions?: string[] }) => {
  const form = new FormData();
  if (data.reportDate) form.append("reportDate", data.reportDate);
  if (data.summary !== undefined) form.append("summary", data.summary);
  data.tasks?.forEach(task => form.append("tasks", task));
  data.images?.forEach(image => form.append("images", image));
  data.captions?.forEach(caption => form.append("attachmentCaptions", caption));
  return form;
};

export const dailyReportApi = {
  async create(data: { reportDate: string; summary: string; tasks: string[]; images: File[]; captions: string[] }) {
    return (await apiClient.post<DailyReport>("/api/v1/reports", toFormData(data))).data;
  },
  async mine(page = 1, pageSize = 10) {
    return (await apiClient.get<PagedResult<DailyReport>>("/api/v1/reports/me", { params: { page, pageSize } })).data;
  },
  async all(filters: { from?: string; to?: string; role?: string; employee?: string; page?: number; pageSize?: number }) {
    return (await apiClient.get<PagedResult<DailyReport>>("/api/v1/reports", { params: filters })).data;
  },
  async get(id: string) { return (await apiClient.get<DailyReport>(`/api/v1/reports/${id}`)).data; },
  async update(id: string, summary: string, tasks: string[]) { return (await apiClient.put<DailyReport>(`/api/v1/reports/${id}`, { summary, tasks })).data; },
  async remove(id: string) { await apiClient.delete(`/api/v1/reports/${id}`); },
  async addAttachments(id: string, images: File[], captions: string[]) {
    return (await apiClient.post<DailyReportAttachment[]>(`/api/v1/reports/${id}/attachments`, toFormData({ images, captions }))).data;
  },
  async deleteAttachment(reportId: string, attachmentId: string) { await apiClient.delete(`/api/v1/reports/${reportId}/attachments/${attachmentId}`); },
  async attachmentBlob(reportId: string, attachmentId: string) {
    return (await apiClient.get<Blob>(`/api/v1/reports/${reportId}/attachments/${attachmentId}`, { responseType: "blob" })).data;
  },
};
