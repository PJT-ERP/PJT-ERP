import React from "react";
import { PO, calcTotal } from "../../purchase-orders-page";

export interface Contact {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary?: boolean;
}

export interface MonthData {
  month: string;
  value: number;
  pos: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  city: string;
  province: string;
  address: string;
  status: "Active" | "Inactive" | "On Hold" | "Blacklisted";

  totalPOs: number;
  totalValue: number;
  onTimeRate: number;
  defectRate: number;
  contacts: Contact[];
  history: MonthData[];
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  npwp: string;
  paymentTerms: string;
  since: string;
}

export const calculateSupplierHistory = (supplierPos: PO[]) => {
  const monthPairs = [
    { label: "Jan", idx: 0, aliases: ["Jan", "01/", "-01-", "-01", ".01.", "2026-01"] },
    { label: "Feb", idx: 1, aliases: ["Feb", "02/", "-02-", "-02", ".02.", "2026-02"] },
    { label: "Mar", idx: 2, aliases: ["Mar", "03/", "-03-", "-03", ".03.", "2026-03"] },
    { label: "Apr", idx: 3, aliases: ["Apr", "04/", "-04-", "-04", ".04.", "2026-04"] },
    { label: "May", idx: 4, aliases: ["May", "Mei", "05/", "-05-", "-05", ".05.", "2026-05"] },
    { label: "Jun", idx: 5, aliases: ["Jun", "06/", "-06-", "-06", ".06.", "2026-06"] },
    { label: "Jul", idx: 6, aliases: ["Jul", "07/", "-07-", "-07", ".07.", "2026-07"] },
    { label: "Aug", idx: 7, aliases: ["Aug", "Ags", "08/", "-08-", "-08", ".08.", "2026-08"] },
    { label: "Sep", idx: 8, aliases: ["Sep", "09/", "-09-", "-09", ".09.", "2026-09"] },
    { label: "Oct", idx: 9, aliases: ["Oct", "Okt", "10/", "-10-", "-10", ".10.", "2026-10"] },
    { label: "Nov", idx: 10, aliases: ["Nov", "11/", "-11-", "-11", ".11.", "2026-11"] },
    { label: "Dec", idx: 11, aliases: ["Dec", "Des", "12/", "-12-", "-12", ".12.", "2026-12"] }
  ];
  return monthPairs.map(mp => {
    const posInMonth = supplierPos.filter(po => {
      if (!po.orderDate) return false;
      if (mp.aliases.some(alias => po.orderDate.includes(alias))) return true;
      try {
        const d = new Date(po.orderDate);
        return !isNaN(d.getTime()) && d.getMonth() === mp.idx;
      } catch {
        return false;
      }
    });
    const value = posInMonth.reduce((sum, po) => sum + calcTotal(po.items), 0);
    return {
      month: mp.label,
      pos: posInMonth.length,
      value: Math.round(value / 1000000)
    };
  });
};

export const statusCfg: Record<string, { bg: string; color: string; dot: string }> = {
  Active:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
  Inactive:    { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  "On Hold":   { bg: "#fef9c3", color: "#92400e", dot: "#f59e0b" },
  Blacklisted: { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
};

export function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: bg, color, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "9px 16px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

export function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

export const formatRpM = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} M`;
  return `${(n / 1_000_000).toFixed(0)} Jt`;
};
