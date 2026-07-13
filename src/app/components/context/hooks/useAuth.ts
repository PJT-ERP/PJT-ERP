import { useCallback, useEffect, useState } from "react";
import { User, UserRole } from "../../data/mockData";
import { authApi } from "../../../services/authApi";

export const AUTH_USER_KEY = "erp_current_username";
export const AUTH_TOKEN_KEY = "auth_token";
export const AUTH_PROFILE_KEY = "auth_user";
export const HAS_DEV_TOKEN = Boolean(import.meta.env.VITE_DEV_MASTER_TOKEN?.trim());

export interface StoredAuthUser {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
  department?: string;
  status?: string;
}

export function mapBackendRoleToUserRole(role?: string | null): UserRole {
  const normalized = (role || "").replace(/[\s_-]/g, "").toLowerCase();

  switch (normalized) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "finance":
      return "Finance";
    case "purchasing":
      return "Purchasing";
    case "engineering":
    case "engineer":
    case "engineeringworker":
    case "engineeringreviewer":
    case "production":
    case "productionworker":
      return "Engineering";
    case "engineeringsupervisor":
    case "supervisorengineering":
    case "productionsupervisor":
    case "supervisorproduction":
      return "Engineering Supervisor";
    case "sales":
    default:
      return "Sales";
  }
}

export function mapAuthProfileToUser(profile: StoredAuthUser): User {
  const email = profile.email || "";
  const role = mapBackendRoleToUserRole(profile.roles?.[0] || profile.department);

  return {
    id: profile.userId || email || crypto.randomUUID(),
    name: profile.name || email || "ERP User",
    username: email,
    password: "",
    role,
    email,
    isActive: profile.status !== "Inactive",
  };
}

export function restoreStoredUser(): User | null {
  try {
    const storedAuthUser = localStorage.getItem(AUTH_PROFILE_KEY);
    const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY) || HAS_DEV_TOKEN);

    if (storedAuthUser && hasToken) {
      return mapAuthProfileToUser(JSON.parse(storedAuthUser));
    }

    if (!localStorage.getItem(AUTH_TOKEN_KEY) && !HAS_DEV_TOKEN) {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export function canLoadPurchaseRequests(role?: UserRole | null) {
  return role === "Purchasing"
    || role === "Finance"
    || role === "Engineering"
    || role === "Engineering Supervisor"
    || role === "Admin"
    || role === "Owner";
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => restoreStoredUser());
  const [users, setUsers] = useState<User[]>([]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const auth = await authApi.login(email, password);
      const user = mapAuthProfileToUser(auth);

      localStorage.setItem(AUTH_USER_KEY, user.username);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.warn("Backend login failed.", error);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_PROFILE_KEY);
      return false;
    }
  };

  const logout = () => {
    void authApi.logout();
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROFILE_KEY);
    setCurrentUser(null);
  };

  const addUser = async (user: Omit<User, 'id'>): Promise<boolean> => {
    const created = await authApi.createUser({
      name: user.name,
      email: user.email,
      password: (user as any).password || "DefaultPass123!",
      role: user.role,
      isActive: user.isActive
    });

    if (created) {
      setUsers(prev => [...prev, { ...user, id: created.userId }]);
      return true;
    }
    return false;
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
    if (!id.startsWith('u')) {
      const currentUserData = users.find(u => u.id === id);
      if (currentUserData) {
        const updated = await authApi.updateUser(id, {
          name: updates.name ?? currentUserData.name,
          email: updates.email ?? currentUserData.email,
          role: updates.role ?? currentUserData.role,
          isActive: updates.isActive ?? currentUserData.isActive,
          password: (updates as any).password
        });

        if (!updated) {
          return false;
        }
      }
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    return true;
  };

  const deleteUser = (id: string) => {
    if (!id.startsWith('u')) {
      void authApi.deleteUser(id);
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (users.length === 0) {
      return;
    }

    const latestUser = users.find(user => user.id === currentUser.id && user.isActive);
    if (!latestUser) {
      logout();
      return;
    }

    if (latestUser.username !== currentUser.username || latestUser.role !== currentUser.role || latestUser.name !== currentUser.name) {
      setCurrentUser(latestUser);
      localStorage.setItem(AUTH_USER_KEY, latestUser.username);

      const storedAuthUser = localStorage.getItem(AUTH_PROFILE_KEY);
      if (storedAuthUser) {
        try {
          const parsed = JSON.parse(storedAuthUser);
          parsed.email = latestUser.email;
          parsed.name = latestUser.name;
          parsed.roles = [latestUser.role];
          localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error("Failed to update stored auth profile", e);
        }
      }
    }
  }, [currentUser, users]);

  return {
    currentUser,
    login,
    logout,
    users,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
  };
}
