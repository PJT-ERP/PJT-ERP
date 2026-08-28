import { User } from "../components/data/mockData";

export const BACKEND_USER_IDS_BY_LOCAL_ID: Record<string, string> = {
  u1: "90000000-0000-4000-8000-000000000001",
  u2: "90000000-0000-4000-8000-000000000002",
  u3: "90000000-0000-4000-8000-000000000003",
  u4: "90000000-0000-4000-8000-000000000004",
  u5: "90000000-0000-4000-8000-000000000005",
  u6: "90000000-0000-4000-8000-000000000006",
  u7: "90000000-0000-4000-8000-000000000007",
};

export function isGuid(value?: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function toBackendUserId(user?: User | null): string | null {
  if (!user) {
    return null;
  }

  if (isGuid(user.id)) {
    return user.id;
  }

  return BACKEND_USER_IDS_BY_LOCAL_ID[user.id] || null;
}

export function formatUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url}`;
  }
  return url;
}
