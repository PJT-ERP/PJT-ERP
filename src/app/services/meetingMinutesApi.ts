import apiClient from './apiClient';
import type { UserRole } from '../components/data/mockData';

// Harus sama dengan otorisasi di MeetingMinutesController.
export const MEETING_MINUTE_EDITOR_ROLES: UserRole[] = ['Sales', 'Engineering Supervisor'];
export const MEETING_MINUTE_VIEWER_ROLES: UserRole[] = [...MEETING_MINUTE_EDITOR_ROLES, 'Owner', 'Finance', 'Admin'];

export interface MeetingMinuteDto {
  id: string;
  customerId?: string | null;
  customerName: string;
  location: string;
  meetingDate: string; // yyyy-MM-dd
  description: string;
  discussion: string;
  solution: string;
  feedbackDeadline?: string | null; // yyyy-MM-dd
  createdByName: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface SaveMeetingMinuteRequest {
  customerId?: string | null;
  customerName: string;
  location: string;
  meetingDate: string;
  description: string;
  discussion: string;
  solution: string;
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
};
