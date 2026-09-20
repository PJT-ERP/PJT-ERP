import React from "react";
import {
  Search, Plus, Eye, Edit, Trash2,
  X, SlidersHorizontal, LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";
import { useDeleteSalesOrderMutation } from "../../services/queries";
import { SalesOrder, SOStatus } from "../data/mockData";
import { type SalesInvoiceStatus } from "./invoice-sync";
import { useSOList, PAGE_SIZE } from "./hooks/useSOList";
import { useAuth } from "../context/hooks/useAuth";
import { 
  S, STATUS_OPTIONS, StatusBadge, InvoiceBadge, FilterDropdown, 
  ActionBtn, HoverBtn, MobileActionBtn, Pagination
} from "./components/so-list/SOListHelpers";

interface SOListProps {
  onNavigate: (page: string, data?: unknown) => void;
}



export function SOList({ onNavigate }: SOListProps) {
  const { currentUser } = useAuth();
  const board = useSOList();
  const deleteMutation = useDeleteSalesOrderMutation();
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string } | null>(null);

  const canEdit = currentUser?.role === 'Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Sales Order ${deleteTarget.id} berhasil dihapus.`);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(`Gagal menghapus SO: ${err?.response?.data?.message || err.message}`);
      }
    });
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
            {board.salesOrders.length} order terdaftar
            {board.filtered.length !== board.salesOrders.length && (
              <span style={{ color: "#C8102E" }}> · {board.filtered.length} ditampilkan</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>

          {currentUser?.role === 'Sales' && (
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
          )}
        </div>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────────── */}
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6 }}>
        {/* Row 1: Search + actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${S.border}` }}>
          {/* Search */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 7,
            background: S.bg, border: `1px solid ${board.searchFocused ? S.cyan : S.border}`,
            borderRadius: 4, padding: "6px 10px",
            transition: "border-color 0.12s",
          }}>
            <Search size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari no. SO, nama pelanggan, produk..."
              value={board.search}
              onChange={e => { board.setSearch(e.target.value); board.setPage(1); }}
              onFocus={() => board.setSearchFocused(true)}
              onBlur={() => board.setSearchFocused(false)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "12.5px", color: S.slate, fontFamily: S.font, width: "100%", minWidth: 0 }}
            />
            {board.search && (
              <button
                onClick={() => { board.setSearch(""); board.setPage(1); }}
                style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = S.slate)}
                onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Active filter badge */}
          {board.hasActiveFilters && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, background: "rgba(200,16,46,0.08)", border: "1px solid rgba(200,16,46,0.25)" }}>
              <SlidersHorizontal size={11} style={{ color: "#C8102E" }} />
              <span style={{ fontSize: "11.5px", color: "#C8102E", fontWeight: 500 }}>{board.activeFilterCount} filter aktif</span>
              <button
                onClick={board.resetAll}
                style={{ color: "#C8102E", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                title="Hapus semua filter"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* View toggle */}
          <div style={{ display: "flex", background: S.bg, borderRadius: 6, padding: 3, border: `1px solid ${S.border}` }}>
            <button
              onClick={() => board.setViewMode("table")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
                background: board.viewMode === "table" ? S.white : "transparent",
                boxShadow: board.viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                color: board.viewMode === "table" ? "#C8102E" : S.secondary,
                transition: "all 0.2s"
              }}
              title="Tampilan Tabel"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => board.setViewMode("card")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
                background: board.viewMode === "card" ? S.white : "transparent",
                boxShadow: board.viewMode === "card" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                color: board.viewMode === "card" ? "#C8102E" : S.secondary,
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
            value={board.statusFilter}
            onChange={v => { board.setStatusFilter(v); board.setPage(1); }}
            active={board.statusFilter !== "all"}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterDropdown>

          <FilterDropdown
            value={board.customerFilter}
            onChange={v => { board.setCustomerFilter(v); board.setPage(1); }}
            active={board.customerFilter !== "all"}
          >
            <option value="all">Semua Pelanggan</option>
            {board.customers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </FilterDropdown>

          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            border: `1px solid ${S.border}`,
            background: S.white,
            borderRadius: 4, padding: "5px 10px", transition: "border-color 0.12s",
          }}>
            <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: S.font, fontWeight: 500, flexShrink: 0 }}>Bulan:</span>
            <input
              type="month"
              value={board.dateFilter}
              onChange={e => { board.setDateFilter(e.target.value); board.setPage(1); }}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "12px", color: S.secondary, fontFamily: S.font, cursor: "pointer" }}
            />
          </div>

        </div>
      </div>

      {/* ── Table / Cards ─────────────────────────────────────────────────────────── */}
      {board.viewMode === "table" ? (
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
              {board.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} style={{ padding: "12px 14px" }}>
                      <div className="animate-pulse" style={{ height: 20, background: "#f1f5f9", borderRadius: 4, width: "100%" }} />
                    </td>
                  </tr>
                ))
              ) : board.paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "52px 0", color: "#94A3B8", fontSize: "13px" }}>
                    Tidak ada data yang sesuai dengan filter
                  </td>
                </tr>
              ) : board.paginated.map((order, idx) => (
                <TableRow
                  key={order.id}
                  order={order as SalesOrder}
                  customerName={board.customers.find(c => c.code === order.customerId)?.name || "Unknown"}
                  isLast={idx === board.paginated.length - 1}
                  onView={() => onNavigate("so-detail", order.id)}
                  onEdit={() => onNavigate("so-detail", { id: order.id, isEditMode: true })}
                  onDelete={() => setDeleteTarget({ id: order.id })}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderTop: `1px solid ${S.border}`, background: "#FAFAFA" }}>
            <span style={{ color: S.secondary, fontSize: "12px" }}>
              {board.filtered.length === 0
                ? "Tidak ada hasil"
                : `${(board.page - 1) * PAGE_SIZE + 1}–${Math.min(board.page * PAGE_SIZE, board.filtered.length)} dari ${board.filtered.length} hasil`}
            </span>
            <Pagination page={board.page} total={board.totalPages} onChange={board.setPage} />
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16
          }}>
            {board.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: 16, height: 180, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ height: 24, background: "#f1f5f9", borderRadius: 4, width: "60%" }} />
                  <div style={{ height: 40, background: "#f1f5f9", borderRadius: 4, width: "100%" }} />
                  <div style={{ height: 32, background: "#f1f5f9", borderRadius: 4, width: "100%", marginTop: "auto" }} />
                </div>
              ))
            ) : board.paginated.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "52px 0", color: "#94A3B8", fontSize: "13px", background: S.white, borderRadius: 8, border: `1px solid ${S.border}` }}>
                Tidak ada data yang sesuai dengan filter
              </div>
            ) : board.paginated.map((order) => {
              const customerName = board.customers.find(c => c.code === order.customerId)?.name || "Unknown";
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
                    {canEdit && !(order.status === "Completed" && order.invoice?.status === "paid") && (
                      <MobileActionBtn label="Edit" bg="#FFFBEB" color="#D97706" action={() => onNavigate("so-detail", { id: order.id, isEditMode: true })} />
                    )}
                    {canEdit && (
                      <MobileActionBtn label="Hapus" bg="#FEF2F2" color="#EF4444" action={() => setDeleteTarget({ id: order.id })} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for cards */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", marginTop: 8 }}>
            <span style={{ color: S.secondary, fontSize: "12px" }}>
              {board.filtered.length === 0
                ? "Tidak ada hasil"
                : `${(board.page - 1) * PAGE_SIZE + 1}–${Math.min(board.page * PAGE_SIZE, board.filtered.length)} dari ${board.filtered.length} hasil`}
            </span>
            <Pagination page={board.page} total={board.totalPages} onChange={board.setPage} />
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, border: `1px solid ${S.border}`,
            maxWidth: 420, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            fontFamily: S.font
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: S.slate, fontWeight: 700 }}>Hapus Sales Order?</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: S.secondary }}>Konfirmasi Hapus Permanen</p>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: 20 }}>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.id}</strong> secara permanen? Data yang sudah dihapus tidak dapat dikembalikan lagi.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${S.border}`, background: "#fff", color: S.slate, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#EF4444", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus SO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TableRow ─────────────────────────────────────────────────────────────────
function TableRow({ order, customerName, isLast, onView, onEdit, onDelete, canEdit }: {
  order: SalesOrder;
  customerName: string;
  isLast: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const [hov, React_useState] = React.useState(false);

  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : `1px solid ${S.border}`,
        background: hov ? S.bg : "transparent",
        transition: "background 0.1s",
        cursor: "pointer",
      }}
      onClick={onView}
      onMouseEnter={() => React_useState(true)}
      onMouseLeave={() => React_useState(false)}
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
          {canEdit && !(order.status === "Completed" && order.invoice?.status === "paid") && (
            <ActionBtn icon={<Edit size={12} />}    label="Edit"     hoverBg="#FFFBEB" hoverColor="#D97706" onClick={onEdit}      title="Edit order" />
          )}
          {canEdit && (
            <ActionBtn icon={<Trash2 size={12} />}  label="Hapus"    hoverBg="#FEF2F2" hoverColor="#EF4444" onClick={onDelete}    title="Hapus Sales Order" />
          )}
        </div>
      </td>
    </tr>
  );
}

export default SOList;
