import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusColor, SOStatus } from "../../../data/mockData";
import { SalesInvoiceStatus } from "../../invoice-sync";

export const S = {
  font: "Inter, sans-serif",
  cyan: "#0284C7",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bg: "#F1F5F9",
  white: "#FFFFFF",
};

export const invoiceStatusConfig: Record<SalesInvoiceStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  paid: { label: "Paid", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  verified: { label: "Partial", textColor: "#FFFFFF", bgColor: "#3B82F6", borderColor: "transparent", dotColor: "#FFFFFF" },
  waiting: { label: "Waiting", textColor: "#FFFFFF", bgColor: "#F59E0B", borderColor: "transparent", dotColor: "#FFFFFF" },
  not_created: { label: "Not Created", textColor: "#FFFFFF", bgColor: "#DC2626", borderColor: "transparent", dotColor: "#FFFFFF" },
  pending_verification: { label: "Menunggu Verifikasi", textColor: "#C8102E", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#C8102E" },
  overdue: { label: "Overdue", textColor: "#B91C1C", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#DC2626" },
};

export const STATUS_OPTIONS = [
  { value: "all",                 label: "Semua Status"         },
  { value: "Waiting Payment", label: "Waiting Payment"   },
  { value: "Pending Design",      label: "Pending Design"        },
  { value: "Waiting Approval",    label: "Waiting Approval"      },
  { value: "Ready for Production",label: "Ready for Production"  },
  { value: "In Production",       label: "In Production"         },
  { value: "QC",                  label: "QC"                    },
  { value: "Completed",           label: "Completed"             },
  { value: "Rejected",            label: "Rejected"              },
];

export function StatusBadge({ status }: { status: SOStatus }) {
  const cfg = getStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

export function InvoiceBadge({ status }: { status: SalesInvoiceStatus }) {
  const cfg = invoiceStatusConfig[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 4,
      border: `1px solid ${cfg.borderColor}`,
      background: cfg.bgColor, color: cfg.textColor,
      fontSize: "11px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dotColor, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

export function FilterDropdown({
  // eslint-disable-next-line unused-imports/no-unused-vars
  value, onChange, active, children,
}: {
  value: string; onChange: (v: string) => void; active?: boolean; children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          appearance: "none",
          background: S.white,
          border: `1px solid ${focused ? S.secondary : S.border}`,
          borderRadius: 4, padding: "6px 32px 6px 12px", minWidth: "140px",
          fontSize: "12px", color: S.secondary,
          fontWeight: 400,
          cursor: "pointer", fontFamily: S.font, outline: "none",
          transition: "border-color 0.12s, background 0.12s, color 0.12s",
        }}
      >
        {children}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: "absolute", right: 8, pointerEvents: "none", color: "#94A3B8" }} fill="none">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ActionBtn({
  icon, label, hoverBg, hoverColor, onClick, title,
}: {
  icon: React.ReactNode; label: string;
  hoverBg: string; hoverColor: string;
  onClick: () => void; title: string;
}) {
  const [hov, setHov] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => { setHov(false); setActive(false); }}
      onMouseEnter={() => setHov(true)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px",
        borderRadius: 6, border: `1px solid ${active || hov ? hoverColor : S.border}`,
        background: active ? hoverColor : hov ? hoverBg : S.white,
        color: active ? "#FFF" : hov ? hoverColor : S.secondary,
        fontSize: "11px", fontWeight: 600, cursor: "pointer",
        fontFamily: S.font, transition: "all 0.1s", whiteSpace: "nowrap",
        boxShadow: active ? "none" : hov ? "0 2px 4px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)",
        transform: active ? "scale(0.96)" : "scale(1)",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function HoverBtn({ icon, label, onClick, style: baseStyle, hoverStyle, primary }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  style: React.CSSProperties; hoverStyle: React.CSSProperties; primary?: boolean;
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
        padding: "8px 14px", borderRadius: 6,
        fontSize: "12.5px", fontWeight: 600,
        cursor: "pointer", fontFamily: S.font,
        border: `1px solid ${S.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.1s",
        transform: active ? "scale(0.96)" : hov ? "translateY(-1px)" : "none",
        ...(hov ? { ...baseStyle, ...hoverStyle, boxShadow: active ? "none" : "0 4px 6px rgba(0,0,0,0.05)" } : baseStyle),
        ...(active && primary ? { filter: "brightness(0.9)" } : {}),
      }}
    >
      {icon} {label}
    </button>
  );
}

export function MobileActionBtn({ label, bg, color, action }: { label: string, bg: string, color: string, action: () => void }) {
  const [hov, setHov] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={action}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => { setHov(false); setActive(false); }}
      onMouseEnter={() => setHov(true)}
      style={{
        flex: 1, padding: "8px 4px", borderRadius: 6,
        border: `1px solid ${active || hov ? color : S.border}`,
        background: active ? color : hov ? bg : S.white,
        color: active ? "#FFF" : hov ? color : S.secondary,
        fontSize: "12px", fontWeight: 600, cursor: "pointer",
        fontFamily: S.font, transition: "all 0.1s",
        boxShadow: active ? "none" : hov ? "0 2px 4px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)",
        transform: active ? "scale(0.96)" : "scale(1)",
      }}
    >
      {label}
    </button>
  );
}

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      <PagBtn label={<ChevronLeft size={12} />} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} />
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <PagBtn key={p} label={p} onClick={() => onChange(p)} active={p === page} />
      ))}
      <PagBtn label={<ChevronRight size={12} />} onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} />
    </div>
  );
}

function PagBtn({ label, onClick, active, disabled }: {
  label: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4,
        border: `1px solid ${active ? "#C8102E" : "#E2E8F0"}`,
        background: active ? "#C8102E" : hov && !disabled ? "#F8FAFC" : "#fff",
        color: active ? "#fff" : disabled ? "#CBD5E1" : hov ? "#111827" : "#64748B",
        fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "Inter, sans-serif", transition: "all 0.12s",
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  );
}
