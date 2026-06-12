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
  async login(email: string, password: string): Promise<LoginResponseDto> {
    const response = await apiClient.post<LoginResponseDto>("/api/v1/auth/login", {
      email,
      password,
    });

    const data = response.data;

    if (data.accessToken) {
      localStorage.setItem("auth_token", data.accessToken);
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          name: data.name,
          roles: data.roles,
          department: data.department,
        })
      );
    }

    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  },

  async me(): Promise<LoginResponseDto | null> {
    try {
      const response = await apiClient.get<LoginResponseDto>("/api/v1/auth/me");
      return response.data;
    } catch {
      return null;
    }
  },

  getCurrentUser(): Omit<LoginResponseDto, "accessToken"> | null {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem("auth_token");
  },

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) ?? false;
  },

  hasAnyRole(...roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user?.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  },
};
