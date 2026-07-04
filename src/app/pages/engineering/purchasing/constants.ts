import { PurchasingUrgency, PurchasingStatus } from "../../../components/data/mockData";

export const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

export const URGENCY_COLORS: Record<PurchasingUrgency, { bg: string, text: string, border: string, dot: string }> = {
  Normal: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' },
  Urgent: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

export const PR_STATUS_COLORS: Record<PurchasingStatus, { bg: string, text: string, border: string, dot: string }> = {
  Pending: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
  Diproses: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  Selesai: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  Ditolak: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};
