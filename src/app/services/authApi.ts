import apiClient from "./apiClient";

export interface LoginResponseDto {
  accessToken: string;
  userId: string;
  email: string;
  name: string;
  roles: string[];
  department: string;
}

export const authApi = {
  async login(email: string): Promise<LoginResponseDto> {
    const response = await apiClient.post<LoginResponseDto>("/api/v1/auth/login", { email });
    return response.data;
  },
};
