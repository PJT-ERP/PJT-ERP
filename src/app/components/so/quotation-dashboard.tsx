import React from "react";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Plus,
  List,
  Users,
  ArrowRight,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Circle,
  Receipt,
  Send,
  XCircle,
  Trophy,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getStatusColor, QuotationStatus } from "../data/mockData";
import type { Page } from "../layout/erp-layout";

interface QuotationDashboardProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

const S = {
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

const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

function StatusBadge({ status }: { status: QuotationStatus }) {
  let bg = "#F1F5F9", text = "#64748B", border = "#CBD5E1";
  if (status === 'draft') { bg = "#F1F5F9"; text = "#64748B"; border = "#CBD5E1"; }
  else if (status === 'pending_design' || status === 'design_review') { bg = "#F5F3FF"; text = "#7C3AED"; border = "#C4B5FD"; }
  else if (status === 'client_design_approval') { bg = "#EFF6FF"; text = "#2563EB"; border = "#BFDBFE"; }
  else if (status === 'waiting_pricing') { bg = "#FFFBEB"; text = "#D97706"; border = "#FDE68A"; }
  else if (status === 'client_price_approval') { bg = "#EFF6FF"; text = "#2563EB"; border = "#BFDBFE"; }
  else if (status === 'won') { bg = "#ECFDF5"; text = "#059669"; border = "#A7F3D0"; }
  else if (status === 'lost') { bg = "#FEF2F2"; text = "#DC2626"; border = "#FECACA"; }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "2px 8px", borderRadius: "4px",
      border: `1px solid ${border}`,
      background: bg, color: text,
      fontSize: "11.5px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: text, flexShrink: 0, display: "inline-block" }} />
      {status === 'pending_design' ? 'Pending Design' : 
       status === 'design_review' ? 'Design Review' :
       status === 'client_design_approval' ? 'Approve Design' :
       status === 'waiting_pricing' ? 'Waiting Pricing' :
       status === 'client_price_approval' ? 'Approve Price' :
       status === 'won' ? 'Won' :
       status === 'lost' ? 'Lost' : 'Draft'}
    </span>
  );
}

export function QuotationDashboard({ onNavigate }: QuotationDashboardProps) {
  const { quotations, customers } = useApp();
  
  const total = quotations.length;
  const won = quotations.filter((o) => o.status === "won").length;
  const lost = quotations.filter((o) => o.status === "lost").length;
  const pending = quotations.filter((o) => !["won", "lost"].includes(o.status)).length;
  
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  const recentQuotations = [...quotations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const workflowStats = [
    { label: "Draft",              count: quotations.filter(o => o.status === "draft").length,           color: "#94A3B8" },
    { label: "Design Process",     count: quotations.filter(o => o.status === "pending_design" || o.status === "design_review").length,  color: "#8B5CF6" },
    { label: "Nego Desain",        count: quotations.filter(o => o.status === "client_design_approval").length, color: "#3B82F6" },
    { label: "Waiting Pricing",    count: quotations.filter(o => o.status === "waiting_pricing").length, color: "#F59E0B" },
    { label: "Nego Harga",         count: quotations.filter(o => o.status === "client_price_approval").length,  color: "#2563EB" },
    { label: "Won",                count: won,                                                           color: "#10B981" },
    { label: "Lost",               count: lost,                                                          color: "#EF4444" },
  ];

  const summaryCards = [
    {
      label: "Total Quotations",
      value: total,
      icon: <ShoppingCart size={18} />,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.1)",
      change: "Bulan ini",
    },
    {
      label: "Pipeline (Pending)",
      value: pending,
      icon: <Clock size={18} />,
      accent: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      change: "Sedang diproses",
    },
    {
      label: "Won (Closing)",
      value: won,
      icon: <Trophy size={18} />,
      accent: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      change: "Berhasil Deal",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: <Activity size={18} />,
      accent: "#8B5CF6",
      bg: "rgba(139,92,246,0.1)",
      change: "Konversi Penjualan",
    },
  ];

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Sales Pipeline & Quotations</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            PT Pratama Jaya Tekindo · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => onNavigate("quotation-create")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 4, border: "none",
            background: S.cyan, color: "#fff", cursor: "pointer",
            fontSize: "13px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
          }}
        >
          <Plus size={14} /> Buat Penawaran
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>{card.label}</p>
                <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{card.value}</p>
                <p style={{ color: card.accent, fontSize: "11px", margin: 0 }}>{card.change}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", color: card.accent, flexShrink: 0 }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }} className="lg-grid-cols-1">

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Recent quotations table */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Receipt size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Quotation Terbaru</span>
              </div>
              <button
                onClick={() => onNavigate("quotation-list")}
                style={{ display: "flex", alignItems: "center", gap: 4, color: S.cyan, fontSize: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: S.font }}
              >
                Lihat semua <ArrowRight size={12} />
              </button>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 130px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
              {["No. QUT", "Pelanggan", "Produk", "Status"].map((h) => (
                <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {recentQuotations.map((q, idx) => (
              <div
                key={q.id}
                onClick={() => onNavigate("quotation-detail", q.id)}
                style={{
                  display: "grid", gridTemplateColumns: "130px 1fr 1fr 130px",
                  padding: "10px 18px", cursor: "pointer",
                  borderBottom: idx < recentQuotations.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500 }}>{q.id}</span>
                <div>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500 }}>{customers.find(c => c.code === q.customerId)?.name || "-"}</p>
                </div>
                <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{q.productName}</span>
                <div style={{ alignSelf: "center" }}>
                  <StatusBadge status={q.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Workflow stats */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
              <TrendingUp size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Pipeline Status</span>
            </div>
            {workflowStats.map((w) => (
              <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: S.secondary, fontSize: "12.5px" }}>{w.label}</span>
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 600, minWidth: 20, textAlign: "right" }}>{w.count}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden", display: "flex" }}>
              {workflowStats.filter(w => w.count > 0).map((w) => (
                <div key={w.label} style={{ flex: w.count, background: w.color, height: "100%" }} />
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <p style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600, margin: "0 0 12px" }}>Quick Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Buat Quotation", icon: <Plus size={13} />, page: "quotation-create" as Page, primary: true },
                { label: "Buat SO (Langsung)", icon: <Plus size={13} />, page: "so-create" as Page, primary: false },
                { label: "Lihat Quotations", icon: <List size={13} />, page: "quotation-list" as Page, primary: false },
                { label: "Data Pelanggan", icon: <Users size={13} />, page: "customer-list" as Page, primary: false },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => onNavigate(action.page)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 4, cursor: "pointer",
                    background: action.primary ? S.cyan : S.bg,
                    border: `1px solid ${action.primary ? S.cyan : S.border}`,
                    color: action.primary ? "#fff" : S.slate,
                    fontSize: "12.5px", fontWeight: 500, fontFamily: S.font,
                    transition: "opacity 0.1s",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>{action.icon}{action.label}</span>
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
