import apiClient from './apiClient';

export interface MeetingMinuteDto {
  id: string;
  customerId?: string | null;
  customerName: string;
  location: string;
  meetingDate: string; // yyyy-MM-dd
  description: string;
  discussion: string;
  solution: string;
  participants: string;
  resultFileUrl?: string | null;
  resultFileName?: string | null;
  feedbackDeadline?: string | null; // yyyy-MM-dd
  createdByName: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  updatedByName?: string | null;
}

export interface SaveMeetingMinuteRequest {
  customerId?: string | null;
  customerName: string;
  location: string;
  meetingDate: string;
  description: string;
  discussion: string;
  solution: string;
  participants: string;
  resultFileUrl?: string | null;
  resultFileName?: string | null;
  feedbackDeadline?: string | null;
}

const BASE = '/api/v1/production/meeting-minutes';

export const meetingMinutesApi = {
  async list(): Promise<MeetingMinuteDto[]> {
    const response = await apiClient.get<MeetingMinuteDto[]>(BASE);
    return response.data;
  },

  async create(request: SaveMeetingMinuteRequest): Promise<MeetingMinuteDto> {
    const response = await apiClient.post<MeetingMinuteDto>(BASE, request);
    return response.data;
  },

  async update(id: string, request: SaveMeetingMinuteRequest): Promise<MeetingMinuteDto> {
    const response = await apiClient.put<MeetingMinuteDto>(`${BASE}/${id}`, request);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async uploadResultFile(file: File): Promise<{ url: string; fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string; fileName: string }>(`${BASE}/upload-file`, formData);
    return response.data;
  },

  async getResultFileBlob(url: string): Promise<Blob> {
    const response = await apiClient.get(url, { responseType: 'blob' });
    return response.data as Blob;
  },
};
