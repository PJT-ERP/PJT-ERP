import React from "react";
import {
  ShoppingCart,
  Clock,
  Factory,
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
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getStatusColor, SOStatus } from "../data/mockData";
import type { Page } from "../layout/erp-layout";
import { useFinanceData } from "../finance/useFinanceData";

interface SODashboardProps {
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

function StatusBadge({ status }: { status: SOStatus }) {
  const cfg = getStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

export function SODashboard({ onNavigate }: SODashboardProps) {
  const { salesOrders, customers } = useApp();
  const { invoices } = useFinanceData();
  const readyInvoices = invoices.filter(invoice => invoice.status === "PENDING" && invoice.paidAmount <= 0);
  const paidInvoices = invoices.filter(invoice => invoice.status === "PAID");
  const total = salesOrders.length;
  const waitingFinance = salesOrders.filter((o) => o.status === "Menunggu Invoice DP" || o.status === "Pending Design" || o.status === "Waiting Approval").length;
  const inProduction = salesOrders.filter((o) => o.status === "In Production" || o.status === "Ready for Production" || o.status === "QC").length;
  const completed = salesOrders.filter((o) => o.status === "Completed").length;

  const recentOrders = [...salesOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const workflowStats = [
    { label: "Menunggu Invoice DP", count: salesOrders.filter(o => o.status === "Menunggu Invoice DP").length, color: "#F59E0B" },
    { label: "Pending Design", count: salesOrders.filter(o => o.status === "Pending Design").length, color: "#94A3B8" },
    { label: "Waiting Approval", count: salesOrders.filter(o => o.status === "Waiting Approval").length, color: "#F59E0B" },
    { label: "Revision Required", count: salesOrders.filter(o => o.status === "Revision Required").length, color: "#EF4444" },
    { label: "In Production", count: salesOrders.filter(o => o.status === "In Production" || o.status === "Ready for Production").length, color: "#C8102E" },
    { label: "QC", count: salesOrders.filter(o => o.status === "QC").length, color: "#3B82F6" },
    { label: "Completed", count: salesOrders.filter(o => o.status === "Completed").length, color: "#22C55E" },
  ];

  const allActivities = salesOrders
    .flatMap((o) => (o.activities || []).map((a) => ({ ...a, soNumber: o.id, orderId: o.id })))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 7);

  const summaryCards = [
    {
      label: "Total Orders",
      value: total,
      icon: <ShoppingCart size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: "+3 minggu ini",
    },
    {
      label: "Waiting Finance",
      value: waitingFinance,
      icon: <Clock size={18} />,
      accent: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
      change: "Perlu tindakan",
    },
    {
      label: "In Production",
      value: inProduction,
      icon: <Factory size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: "Aktif di workshop",
    },
    {
      label: "Completed Orders",
      value: completed,
      icon: <CheckCircle2 size={18} />,
      accent: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
      change: "Bulan ini",
    },
  ];

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Sales Order Dashboard</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            PT Pratama Jaya Tekindo · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => onNavigate("so-create")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 6, border: "none",
            background: "linear-gradient(135deg, #EF4444 0%, #C8102E 100%)",
            color: "#fff", cursor: "pointer",
            fontSize: "13px", fontWeight: 600, fontFamily: S.font, whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(200, 16, 46, 0.25)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(200, 16, 46, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(200, 16, 46, 0.25)";
          }}
        >
          <Plus size={14} /> Buat SO
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {summaryCards.map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate("so-list", { filter: card.label })}
            style={{
              background: S.white,
              boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)",
              border: `1px solid ${S.cardBorder}`,
              borderRadius: 6,
              padding: "16px 18px",
              textAlign: "left",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              fontFamily: S.font,
              width: "100%",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 28px -4px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)";
            }}
          >
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
          </button>
        ))}
      </div>

      {readyInvoices.length > 0 && (
        <div style={{
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: 6,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #DBEAFE",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "#DBEAFE", color: "#C8102E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Receipt size={16} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#1E3A8A", fontSize: "13.5px", fontWeight: 700 }}>
                  {readyInvoices.length} invoice siap dikirim ke customer
                </p>
                <p style={{ margin: "2px 0 0", color: "#C8102E", fontSize: "12px" }}>
                  Finance sudah membuat invoice. SO team bisa follow up dan kirim ke customer.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("so-list")}
              style={{
                border: "1px solid #93C5FD",
                background: "#fff",
                color: "#1D4ED8",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Lihat Invoice
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, padding: 12 }}>
            {readyInvoices.slice(0, 4).map(invoice => (
              <div key={invoice.id} style={{ background: "#fff", border: "1px solid #DBEAFE", borderRadius: 6, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: "#1D4ED8", fontSize: "12.5px", fontWeight: 700 }}>{invoice.invoiceNumber}</p>
                    <p style={{ margin: "2px 0 0", color: S.slate, fontSize: "12.5px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {invoice.customerName}
                    </p>
                    <p style={{ margin: "2px 0 0", color: S.secondary, fontSize: "11px" }}>{invoice.soNumber}</p>
                  </div>
                  <span style={{ color: "#1F1F1F", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {formatIDR(invoice.amount)}
                  </span>
                </div>
                <button
                  onClick={() => onNavigate("so-detail", invoice.soNumber)}
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: "100%",
                    border: "none",
                    borderRadius: 4,
                    background: "#C8102E",
                    color: "#fff",
                    padding: "7px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Receipt size={12} />
                  Lihat Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidInvoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: 14 }}>
            <p style={{ margin: 0, color: "#065F46", fontSize: "13px", fontWeight: 700 }}>Customer paid</p>
            <p style={{ margin: "2px 0 0", color: "#047857", fontSize: "12px" }}>{paidInvoices.length} invoice sudah dibayar dan siap lanjut ke tahap berikutnya.</p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }} className="lg-grid-cols-1">

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Recent orders table */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Order Terbaru</span>
              </div>
              <button
                onClick={() => onNavigate("so-list")}
                style={{ display: "flex", alignItems: "center", gap: 4, color: S.cyan, fontSize: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: S.font }}
              >
                Lihat semua <ArrowRight size={12} />
              </button>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
              {["No. SO", "Pelanggan", "Produk", "Qty", "Status"].map((h) => (
                <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {recentOrders.map((order, idx) => (
              <div
                key={order.id}
                onClick={() => onNavigate("so-detail", order.id)}
                style={{
                  display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px",
                  padding: "10px 18px", cursor: "pointer",
                  borderBottom: idx < recentOrders.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500 }}>{order.id}</span>
                <div>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500 }}>{customers.find(c => c.code === order.customerId)?.name || "-"}</p>
                  <p style={{ color: S.secondary, fontSize: "11px", margin: 0 }}>{customers.find(c => c.code === order.customerId)?.name || "-"}</p>
                </div>
                <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{order.description}</span>
                <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center" }}>{order.quantity.toLocaleString("id-ID")} {order.unit}</span>
                <div style={{ alignSelf: "center" }}>
                  <StatusBadge status={order.status as SOStatus} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity log */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <Activity size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Aktivitas Terbaru</span>
            </div>
            <div>
              {allActivities.map((act, idx) => (
                <div key={`${act.id}-${idx}`} style={{
                  display: "flex", gap: 12, padding: "10px 18px",
                  borderBottom: idx < allActivities.length - 1 ? `1px solid ${S.border}` : "none",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "rgba(200,16,46,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: S.cyan,
                  }}>
                    <Activity size={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "12.5px", color: S.slate }}>
                      <span style={{ color: S.cyan, fontWeight: 500 }}>{act.soNumber}</span>
                      {" — "}
                      {act.action}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94A3B8" }}>
                      <span style={{ fontWeight: 500, color: "#64748B" }}>{act.user}</span>
                      {" · "}{act.role}{" · "}{act.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
                { label: "Buat SO", icon: <Plus size={13} />, page: "so-create" as Page, primary: true },
                { label: "Lihat Semua Order", icon: <List size={13} />, page: "so-list" as Page, primary: false },
                { label: "Data Pelanggan", icon: <Users size={13} />, page: "customer-list" as Page, primary: false },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => onNavigate(action.page)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 6, cursor: "pointer",
                    background: action.primary ? "linear-gradient(135deg, #EF4444 0%, #C8102E 100%)" : S.bg,
                    border: `1px solid ${action.primary ? "transparent" : S.border}`,
                    color: action.primary ? "#fff" : S.slate,
                    fontSize: "12.5px", fontWeight: 500, fontFamily: S.font,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: action.primary ? "0 4px 12px rgba(200, 16, 46, 0.25)" : "none",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateX(4px)";
                    if (action.primary) e.currentTarget.style.boxShadow = "0 6px 16px rgba(200, 16, 46, 0.35)";
                    else e.currentTarget.style.background = S.white;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateX(0)";
                    if (action.primary) e.currentTarget.style.boxShadow = "0 4px 12px rgba(200, 16, 46, 0.25)";
                    else e.currentTarget.style.background = S.bg;
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>{action.icon}{action.label}</span>
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </div>

          {/* Deadline reminder */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Clock size={14} style={{ color: "#F59E0B" }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Deadline Mendekati</span>
            </div>
            {salesOrders
              .filter(o => !["completed", "cancelled"].includes(o.status))
              .sort((a, b) => a.deadline.localeCompare(b.deadline))
              .slice(0, 4)
              .map((o) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, paddingBottom: 9, borderBottom: `1px solid #F8FAFC` }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", color: S.slate, fontWeight: 500 }}>{o.id}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>{customers.find(c => c.code === o.customerId)?.name || "-"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#F59E0B", fontWeight: 500 }}>{o.deadline}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
