import React, { useState } from "react";
import { BASE_URL } from "../../../services/apiClient";

export const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  navy: "#1F1F1F",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

export function getFullUrl(url: string) {
  if (!url || url === 'undefined' || url === 'null') return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

export function isGo(value?: string | null) {
  return value === 'Go' || value === 'Pass';
}

export const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

export const WORKFLOW_STEPS = [
  { key: "customer_request", label: "Customer Request", dept: "SO Team" },
  { key: "finance", label: "Finance", dept: "Finance Dept" },
  { key: "engineering", label: "Engineering", dept: "Engineering" },
  { key: "production", label: "Production", dept: "Production Floor" },
  { key: "qc", label: "QC", dept: "QC Team" },
  { key: "completed", label: "Completed", dept: "" },
];

export function InfoRow({ icon, label, value, isEdit, onChange, type = "text" }: {
  icon: React.ReactNode; label: string; value: string; isEdit?: boolean;
  onChange?: (val: string) => void; type?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "#CBD5E1" }}>{icon}</span>
        {label}
      </p>
      {isEdit ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          style={{ padding: "4px 8px", fontSize: "13px", color: S.slate, border: `1px solid ${S.border}`, borderRadius: 4, background: "#fff", outline: "none", width: "100%", fontFamily: S.font, boxSizing: "border-box" }}
        />
      ) : (
        <p style={{ margin: 0, fontSize: "13px", color: S.slate }}>{value}</p>
      )}
    </div>
  );
}

export function ActionBtn({ icon, label, bg, color, border, onClick }: {
  icon: React.ReactNode; label: string;
  bg: string; color: string; border?: string;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 4,
        border: border ?? `1px solid ${S.border}`,
        background: hov ? (bg === S.white ? S.bg : bg) : bg,
        color,
        fontSize: "12.5px", cursor: "pointer", fontFamily: S.font,
        marginBottom: 6, transition: "opacity 0.1s, background 0.1s",
        opacity: hov && bg !== S.white ? 0.88 : 1,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon} {label}
    </button>
  );
}

export function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
        <span style={{ color: S.cyan }}>{icon}</span>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: S.slate }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export function HeaderBtn({ icon, label, primary, onClick }: {
  icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => { setHov(false); setActive(false); }}
      onMouseEnter={() => setHov(true)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 4,
        border: primary ? "none" : `1px solid ${S.border}`,
        background: primary ? (hov ? "#0EA5CF" : S.cyan) : (hov ? S.bg : S.white),
        color: primary ? "#fff" : hov ? S.slate : S.secondary,
        fontSize: "12.5px", fontWeight: primary ? 500 : 400,
        cursor: "pointer", fontFamily: S.font, transition: "all 0.1s",
        transform: active ? "scale(0.96)" : "scale(1)",
        boxShadow: active ? "none" : primary ? "0 1px 2px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.03)",
        ...(active && primary ? { filter: "brightness(0.9)" } : {}),
      }}
    >
      {icon} {label}
    </button>
  );
}
