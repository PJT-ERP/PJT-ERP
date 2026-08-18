import React from "react";

export interface IncomingShipment {
  po: string;
  supplier: string;
  eta: string;
  qty: number;
  unit: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  location: string;
  lastUpdated: string;
  supplier: string;
  unitPrice: number;
  incoming?: IncomingShipment;
}

export type StockStatus = "critical" | "low" | "normal" | "excess";

export function getStatus(item: InventoryItem): StockStatus {
  if (item.currentStock === 0) return "critical";
  if (item.currentStock < item.minStock) return "critical";
  if (item.currentStock <= item.reorderPoint) return "low";
  if (item.currentStock >= item.maxStock * 0.9) return "excess";
  return "normal";
}

export const statusCfg: Record<StockStatus, { label: string; bg: string; color: string; dot: string; barColor: string }> = {
  critical: { label: "Kritis", bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", barColor: "#dc2626" },
  low: { label: "Rendah", bg: "#fef9c3", color: "#92400e", dot: "#f59e0b", barColor: "#f59e0b" },
  normal: { label: "Normal", bg: "#dcfce7", color: "#166534", dot: "#16a34a", barColor: "#16a34a" },
  excess: { label: "Berlebih", bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", barColor: "#3b82f6" },
};

export const formatRp = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

export function TH({ children, className = "", right = false }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "9px 16px", textAlign: right ? "right" : "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

export function TD({ children, className = "", right = false }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <td className={className} style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", textAlign: right ? "right" : "left" }}>
      {children}
    </td>
  );
}

export const CHART_COLORS = ["#C8102E", "#0891b2", "#7c3aed", "#16a34a", "#d97706"];
