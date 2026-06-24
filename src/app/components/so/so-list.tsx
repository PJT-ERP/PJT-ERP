import React, { useState, useMemo } from "react";
import {
  Search, Plus, Download, Eye, Edit, Copy, Printer,
  ChevronLeft, ChevronRight, X, SlidersHorizontal, LayoutGrid, List,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getStatusColor, SOStatus, SalesOrder } from "../data/mockData";
import { useFinanceData } from "../finance/useFinanceData";

import { getSalesOrderInvoiceStatus, mergeSalesOrderInvoice, type SalesInvoiceStatus } from "./invoice-sync";

const invoiceStatusConfig: Record<SalesInvoiceStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  paid: { label: "Paid", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  verified: { label: "Verified", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  waiting: { label: "Waiting", textColor: "#FFFFFF", bgColor: "#F59E0B", borderColor: "transparent", dotColor: "#FFFFFF" },
  not_created: { label: "Not Created", textColor: "#FFFFFF", bgColor: "#DC2626", borderColor: "transparent", dotColor: "#FFFFFF" },
};

interface SOListProps {
  onNavigate: (page: string, data?: unknown) => void;
}

const S = {
  font: "Inter, sans-serif",
  cyan: "#0284C7", // Deeper cyan (sky-600)
  slate: "#1F1F1F", // Darker slate
  secondary: "#475569",
  border: "#CBD5E1", // Darker border for visibility
  bg: "#F1F5F9",
  white: "#FFFFFF",
};

const PAGE_SIZE = 8;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const STATUS_OPTIONS = [
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

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SOStatus }) {
  const cfg = getStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

// ─── InvoiceBadge ─────────────────────────────────────────────────────────────
function InvoiceBadge({ status }: { status: SalesInvoiceStatus }) {
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

// ─── FilterDropdown ───────────────────────────────────────────────────────────
function FilterDropdown({
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
          background: active ? "rgba(200,16,46,0.06)" : S.white,
          border: `1px solid ${focused ? S.cyan : active ? S.cyan : S.border}`,
          borderRadius: 4, padding: "6px 26px 6px 10px",
          fontSize: "12px", color: active ? S.cyan : S.secondary,
          fontWeight: active ? 500 : 400,
          cursor: "pointer", fontFamily: S.font, outline: "none",
          transition: "border-color 0.12s, background 0.12s, color 0.12s",
        }}
      >
        {children}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: "absolute", right: 8, pointerEvents: "none", color: active ? S.cyan : "#94A3B8" }} fill="none">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── HoverActionBtn ───────────────────────────────────────────────────────────
function ActionBtn({
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

// ─── Main component ───────────────────────────────────────────────────────────
export function SOList({ onNavigate }: SOListProps) {
  const { salesOrders, customers } = useApp();
  const { invoices, payments } = useFinanceData();
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFilter, setDateFilter]       = useState("");
  const [page, setPage]                   = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode]           = useState<"table" | "card">("table");

  const hasActiveFilters = statusFilter !== "all" || customerFilter !== "all" || !!dateFilter;
  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (customerFilter !== "all" ? 1 : 0) + (dateFilter ? 1 : 0);

  const mergedSalesOrders = useMemo(() => salesOrders.map(o => mergeSalesOrderInvoice(o, invoices, payments)), [salesOrders, invoices, payments]);

  const filtered = useMemo(() => mergedSalesOrders.filter(o => {
    if (o.id.startsWith("QU")) return false; // Hide quotations from SO List
    
    const cust = customers.find(c => c.code === o.customerId);
    const cName = cust?.name || "";
    const q = search.toLowerCase();
    const matchSearch = !search ||
      o.id.toLowerCase().includes(q) ||
      cName.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q);
    return matchSearch &&
      (statusFilter === "all" || o.status === statusFilter) &&
      (customerFilter === "all" || o.customerId === customerFilter) &&
      (!dateFilter || o.createdAt.startsWith(dateFilter));
  }), [mergedSalesOrders, customers, search, statusFilter, customerFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetAll = () => {
    setSearch(""); setStatusFilter("all");
    setCustomerFilter("all"); setDateFilter(""); setPage(1);
  };

  const exportOrders = () => {
    downloadCsv("sales-orders.csv", [
      ["No. SO", "Customer", "Company", "Product", "Qty", "Unit", "Deadline", "Invoice Status", "Workflow Status"],
      ...filtered.map(order => {
        const cust = customers.find(c => c.code === order.customerId);
        return [
        order.id,
        cust?.name || "",
        cust?.name || "",
        order.description,
        String(order.quantity),
        order.unit,
        order.deadline,
        invoiceStatusConfig[getSalesOrderInvoiceStatus(order, invoices)].label,
        order.status,
      ]})
    ]);
  };

  const showEditUnavailable = () => {
    window.alert("Edit Sales Order belum tersedia di demo ini. Gunakan Duplikat untuk membuat order baru dari data yang mirip.");
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, fontFamily: S.font }}>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, marginBottom: 4 }}>
        <button
          style={{ padding: "10px 20px", border: "none", background: "none", color: "#C8102E", borderBottom: "2px solid #C8102E", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
        >
          Sales Order (SO)
        </button>
      </div>

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Sales Order</h1>
          <p style={{ color: S.secondary, fontSize: "12.5px", marginTop: 2 }}>
            {salesOrders.length} order terdaftar
            {filtered.length !== salesOrders.length && (
              <span style={{ color: S.cyan }}> · {filtered.length} ditampilkan</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>

          <HoverBtn
            icon={<Plus size={12} />}
            label="Buat SO"
            onClick={() => onNavigate("so-create")}
            style={{ 
              background: "linear-gradient(135deg, #EF4444 0%, #C8102E 100%)", 
              border: "none", 
              color: "#fff",
              boxShadow: "0 4px 12px rgba(200, 16, 46, 0.25)",
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: "6px"
            }}
            hoverStyle={{ transform: "translateY(-1px)", boxShadow: "0 6px 16px rgba(200, 16, 46, 0.35)" }}
            primary
          />
        </div>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────────── */}
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6 }}>
        {/* Row 1: Search + actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${S.border}` }}>
          {/* Search */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 7,
            background: S.bg, border: `1px solid ${searchFocused ? S.cyan : S.border}`,
            borderRadius: 4, padding: "6px 10px",
            transition: "border-color 0.12s",
          }}>
            <Search size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari no. SO, nama pelanggan, produk..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "12.5px", color: S.slate, fontFamily: S.font, width: "100%", minWidth: 0 }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = S.slate)}
                onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Active filter badge */}
          {hasActiveFilters && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, background: "rgba(200,16,46,0.08)", border: "1px solid rgba(200,16,46,0.25)" }}>
              <SlidersHorizontal size={11} style={{ color: S.cyan }} />
              <span style={{ fontSize: "11.5px", color: S.cyan, fontWeight: 500 }}>{activeFilterCount} filter aktif</span>
              <button
                onClick={resetAll}
                style={{ color: S.cyan, background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                title="Hapus semua filter"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* View toggle */}
          <div style={{ display: "flex", background: S.bg, borderRadius: 6, padding: 3, border: `1px solid ${S.border}` }}>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
                background: viewMode === "table" ? S.white : "transparent",
                boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                color: viewMode === "table" ? S.cyan : S.secondary,
                transition: "all 0.2s"
              }}
              title="Tampilan Tabel"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
                background: viewMode === "card" ? S.white : "transparent",
                boxShadow: viewMode === "card" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                color: viewMode === "card" ? S.cyan : S.secondary,
                transition: "all 0.2s"
              }}
              title="Tampilan Kartu"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Dropdown filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", alignItems: "center" }}>
          <span style={{ fontSize: "11.5px", color: "#94A3B8", flexShrink: 0 }}>Filter:</span>

          <FilterDropdown
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            active={statusFilter !== "all"}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterDropdown>

          <FilterDropdown
            value={customerFilter}
            onChange={v => { setCustomerFilter(v); setPage(1); }}
            active={customerFilter !== "all"}
          >
            <option value="all">Semua Pelanggan</option>
            {customers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </FilterDropdown>

          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            border: `1px solid ${dateFilter ? S.cyan : S.border}`,
            background: dateFilter ? "rgba(200,16,46,0.06)" : S.white,
            borderRadius: 4, padding: "5px 10px", transition: "border-color 0.12s",
          }}>
            <span style={{ fontSize: "11px", color: dateFilter ? S.cyan : "#94A3B8", fontFamily: S.font, fontWeight: 500, flexShrink: 0 }}>Bulan:</span>
            <input
              type="month"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1); }}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "12px", color: dateFilter ? S.cyan : S.secondary, fontFamily: S.font, cursor: "pointer" }}
            />
            {dateFilter && (
              <button onClick={() => { setDateFilter(""); setPage(1); }} style={{ color: S.cyan, background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAll}
              style={{ fontSize: "12px", color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontFamily: S.font, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Hapus semua
            </button>
          )}
        </div>
      </div>

      {/* ── Table / Cards ─────────────────────────────────────────────────────────── */}
      {viewMode === "table" ? (
        <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1200, tableLayout: "auto", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
                {[
                  { label: "No. SO",          align: "left"  },
                  { label: "Pelanggan",        align: "left"  },
                  { label: "Produk",           align: "left"  },
                  { label: "Qty",              align: "left"  },
                  { label: "Deadline",         align: "left"  },
                  { label: "Status Invoice",   align: "left"  },
                  { label: "Status Workflow",  align: "left"  },
                  { label: "Dibuat",           align: "left"  },
                  { label: "Aksi",             align: "right" },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: "8px 14px", textAlign: h.align as "left"|"right",
                    fontSize: "10px", fontWeight: 700, color: "#94A3B8",
                    letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "52px 0", color: "#94A3B8", fontSize: "13px" }}>
                    Tidak ada data yang sesuai dengan filter
                  </td>
                </tr>
              ) : paginated.map((order, idx) => (
                <TableRow
                  key={order.id}
                  order={order}
                  customerName={customers.find(c => c.code === order.customerId)?.name || "Unknown"}
                  isLast={idx === paginated.length - 1}
                  onView={() => onNavigate("so-detail", order.id)}
                  onEdit={() => onNavigate("so-detail", { id: order.id, isEditMode: true })}
                  onDuplicate={() => onNavigate("so-create")}
                  onPrint={() => window.print()}
                />
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderTop: `1px solid ${S.border}`, background: "#FAFAFA" }}>
            <span style={{ color: S.secondary, fontSize: "12px" }}>
              {filtered.length === 0
                ? "Tidak ada hasil"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} dari ${filtered.length} hasil`}
            </span>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16
          }}>
            {paginated.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "52px 0", color: "#94A3B8", fontSize: "13px", background: S.white, borderRadius: 8, border: `1px solid ${S.border}` }}>
                Tidak ada data yang sesuai dengan filter
              </div>
            ) : paginated.map((order) => {
              const customerName = customers.find(c => c.code === order.customerId)?.name || "Unknown";
              return (
                <div key={order.id} style={{
                  background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: 16,
                  display: "flex", flexDirection: "column", gap: 12,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ color: "#C8102E", fontSize: "14px", fontWeight: 600 }}>{order.id}</span>
                      <p style={{ margin: "2px 0 0", color: "#111827", fontSize: "13px", fontWeight: 500 }}>{customerName}</p>
                    </div>
                    <StatusBadge status={order.status as SOStatus} />
                  </div>
                  
                  <div>
                    <p style={{ margin: 0, color: "#64748B", fontSize: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{order.description}</p>
                    <p style={{ margin: "4px 0 0", color: "#334155", fontSize: "12px", fontWeight: 500 }}>
                      Qty: {order.quantity.toLocaleString("id-ID")} {order.unit}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0", borderTop: `1px solid #F1F5F9`, borderBottom: `1px solid #F1F5F9` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8", textTransform: "uppercase" }}>Deadline</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#334155" }}>{order.deadline}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8", textTransform: "uppercase" }}>Invoice</p>
                      <div style={{ marginTop: 2 }}>
                        <InvoiceBadge status={(order.invoice?.status ?? "not_created") as SalesInvoiceStatus} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: "auto" }}>
                    <MobileActionBtn label="Detail" bg="#EFF6FF" color="#C8102E" action={() => onNavigate("so-detail", order.id)} />
                    <MobileActionBtn label="Edit" bg="#FFFBEB" color="#D97706" action={() => onNavigate("so-detail", { id: order.id, isEditMode: true })} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for cards */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", marginTop: 8 }}>
            <span style={{ color: S.secondary, fontSize: "12px" }}>
              {filtered.length === 0
                ? "Tidak ada hasil"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} dari ${filtered.length} hasil`}
            </span>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TableRow ─────────────────────────────────────────────────────────────────
function TableRow({ order, customerName, isLast, onView, onEdit, onDuplicate, onPrint }: {
  order: SalesOrder;
  customerName: string;
  isLast: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : `1px solid ${S.border}`,
        background: hov ? S.bg : "transparent",
        transition: "background 0.1s",
        cursor: "pointer",
      }}
      onClick={onView}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Left accent bar on hover */}
      <td style={{ padding: "9px 14px", position: "relative" }}>
        {hov && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#C8102E", borderRadius: "0 1px 1px 0" }} />}
        <span style={{ color: "#C8102E", fontSize: "12.5px", fontWeight: 500 }}>{order.id}</span>
      </td>
      <td style={{ padding: "9px 14px", width: 170 }}>
        <p style={{ margin: 0, color: "#111827", fontSize: "12.5px", fontWeight: 500 }}>{customerName}</p>
        <p style={{ margin: 0, color: "#64748B", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customerName}</p>
      </td>
      <td style={{ padding: "9px 14px", maxWidth: 200 }}>
        <span style={{ color: "#334155", fontSize: "12px", display: "block" }}>
          {order.description}
        </span>
      </td>
      <td style={{ padding: "9px 14px" }}>
        <span style={{ color: "#334155", fontSize: "12px", whiteSpace: "nowrap" }}>
          {order.quantity.toLocaleString("id-ID")} {order.unit}
        </span>
      </td>
      <td style={{ padding: "9px 14px" }}>
        <span style={{ color: "#334155", fontSize: "12px" }}>{order.deadline}</span>
      </td>
      <td style={{ padding: "9px 14px" }}>
        <InvoiceBadge status={(order.invoice?.status ?? "not_created") as SalesInvoiceStatus} />
      </td>
      <td style={{ padding: "9px 14px" }}>
        <StatusBadge status={order.status as SOStatus} />
      </td>
      <td style={{ padding: "9px 14px" }}>
        <span style={{ color: "#64748B", fontSize: "12px" }}>{order.createdAt}</span>
      </td>
      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <ActionBtn icon={<Eye size={12} />}     label="Detail"   hoverBg="#EFF6FF" hoverColor="#C8102E" onClick={onView}      title="Lihat detail" />
          <ActionBtn icon={<Edit size={12} />}    label="Edit"     hoverBg="#FFFBEB" hoverColor="#D97706" onClick={onEdit}      title="Edit order" />
        </div>
      </td>
    </tr>
  );
}

// ─── HoverBtn ─────────────────────────────────────────────────────────────────
function HoverBtn({ icon, label, onClick, style: baseStyle, hoverStyle, primary }: {
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

function MobileActionBtn({ label, bg, color, action }: { label: string, bg: string, color: string, action: () => void }) {
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

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
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
