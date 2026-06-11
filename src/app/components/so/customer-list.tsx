import React, { useState, useMemo } from "react";
import {
  Search, Plus, Download, Eye, Edit, X,
  Phone, Mail, Building2, MapPin,
  ShoppingCart, Calendar, Users,
  ChevronLeft, ChevronRight,
  Hash, RefreshCw, CheckCircle2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Customer } from "../data/mockData";
import type { Page } from "../layout/erp-layout";

interface CustomerListProps {
  onNavigate: (page: Page, data?: unknown) => void;
}

const S = {
  font:      "Inter, sans-serif",
  cyan:      "#C8102E",
  slate:     "#111827",
  secondary: "#64748B",
  border:    "#E2E8F0",
  bg:        "#F8FAFC",
  white:     "#FFFFFF",
  red:       "#EF4444",
};

const PAGE_SIZE = 8;

// ─── empty form ───────────────────────────────────────────────────────────────
const emptyForm = (): Partial<Customer> => ({
  name: "", contact: "", phone: "", address: "",
});

// ─── Form field helpers ────────────────────────────────────────────────────────
function ModalLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 500, color: "#475569", marginBottom: 4, fontFamily: S.font }}>
      {text}{required && <span style={{ color: S.red, marginLeft: 2 }}>*</span>}
    </label>
  );
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        width: "100%", boxSizing: "border-box",
        background: focused ? S.white : "#FAFAFA",
        border: `1px solid ${focused ? S.cyan : S.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none",
        transition: "border-color 0.12s, background 0.12s",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

// ─── Customer Add/Edit Modal ───────────────────────────────────────────────────
interface ModalState {
  mode: "add" | "edit";
  customer: Partial<Customer>;
}

function CustomerModal({ state, onSave, onClose }: {
  state: ModalState;
  onSave: (c: Partial<Customer>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>(state.customer);

  const set = (key: keyof Customer, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: "relative", zIndex: 1,
        background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", borderRadius: 8,
        border: `1px solid ${S.border}`,
        width: "100%", maxWidth: 520,
        margin: "0 16px",
        fontFamily: S.font,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(200,16,46,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} style={{ color: S.cyan }} />
            </div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: S.slate }}>
              {state.mode === "add" ? "Tambah Pelanggan" : "Edit Pelanggan"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, cursor: "pointer", transition: "all 0.1s" }}
            onMouseEnter={e => { (e.currentTarget).style.background = "#FEF2F2"; (e.currentTarget).style.color = S.red; (e.currentTarget).style.borderColor = "#FCA5A5"; }}
            onMouseLeave={e => { (e.currentTarget).style.background = S.white; (e.currentTarget).style.color = S.secondary; (e.currentTarget).style.borderColor = S.border; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <ModalLabel text="Perusahaan" required />
                <ModalInput placeholder="PT / CV ..." value={form.name ?? ""} onChange={e => set("name", e.target.value)} required />
              </div>
              <div>
                <ModalLabel text="Kontak PIC" required />
                <ModalInput placeholder="Nama kontak" value={form.contact ?? ""} onChange={e => set("contact", e.target.value)} required />
              </div>
              <div>
                <ModalLabel text="No. Telepon" required />
                <ModalInput type="tel" placeholder="08xxxxxxxxxx" value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} required />
              </div>
            </div>
            <div>
              <ModalLabel text="Alamat Lengkap" required />
              <ModalInput placeholder="Jl. ... No. ..., Kecamatan, Kota" value={form.address ?? ""} onChange={e => set("address", e.target.value)} required />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: `1px solid ${S.border}`, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "7px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "12.5px", cursor: "pointer", fontFamily: S.font, transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 18px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "12.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "opacity 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <CheckCircle2 size={13} />
              {state.mode === "add" ? "Simpan Pelanggan" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CustomerList({ onNavigate }: CustomerListProps) {
  const { customers, salesOrders, addCustomer, updateCustomer } = useApp();
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [modal, setModal]     = useState<ModalState | null>(null);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contact && c.contact.toLowerCase().includes(q)) ||
      c.phone.includes(q)
    );
  }, [search, customers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCustomers = customers.filter(c =>
    salesOrders.some(o => o.customerId === c.code && !["Completed", "Rejected", "Cancelled"].includes(o.status))
  ).length;

  const getActiveOrders = (cid: string) =>
    salesOrders.filter(o => o.customerId === cid && !["Completed", "Rejected", "Cancelled"].includes(o.status)).length;

  const summaryCards = [
    { label: "Total Pelanggan",  value: customers.length,                                             color: "#C8102E", bg: "rgba(200,16,46,0.08)"   },
    { label: "Pelanggan Aktif",  value: activeCustomers,                                                   color: "#22C55E", bg: "rgba(34,197,94,0.08)"   },
    { label: "Order Bulan Ini",  value: salesOrders.filter(o => o.createdAt.startsWith("2026-05")).length, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    { label: "Kota Terjangkau",  value: new Set(customers.map(c => c.address)).size,                     color: "#8B5CF6", bg: "rgba(139,92,246,0.08)"  },
  ];

  // ── Modal handlers ──────────────────────────────────────────────────────────
  const openAdd  = () => setModal({ mode: "add",  customer: emptyForm() });
  const openEdit = (c: Customer) => setModal({ mode: "edit", customer: { ...c } });

  const handleSave = (data: Partial<Customer>) => {
    if (modal?.mode === "add") {
      const newCustomer: Customer = {
        code:          `C${String(customers.length + 1).padStart(3, "0")}`,
        name:          data.name    ?? "",
        contact:       data.contact ?? "",
        phone:         data.phone   ?? "",
        address:       data.address ?? "",
      };
      addCustomer(newCustomer);
    } else if (modal?.mode === "edit" && data.code) {
      updateCustomer(data.code, data);
    }
    setModal(null);
  };

  const goCreateSO    = (cid: string) => onNavigate("so-create", { customerId: cid, orderType: "new"    });
  const goRepeatOrder = (cid: string) => onNavigate("so-create", { customerId: cid, orderType: "repeat" });

  return (
    <div style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Modal */}
      {modal && <CustomerModal state={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Data Pelanggan</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>{customers.length} pelanggan terdaftar</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <HeaderBtn icon={<Download size={12} />} label="Export" onClick={() => {}} />
          <HeaderBtn icon={<Plus size={12} />} label="Tambah Pelanggan" onClick={openAdd} primary />
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 6, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={16} style={{ color: c.color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "10.5px", color: S.secondary }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: S.slate, lineHeight: 1.2 }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: "11px 14px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "6px 10px", flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Cari nama, perusahaan, kota, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ background: "transparent", border: "none", outline: "none", fontSize: "12.5px", color: S.slate, fontFamily: S.font, width: "100%" }}
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }}
              style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = S.slate)}
              onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", borderRadius: 4, border: `1px solid ${S.border}`, overflow: "hidden" }}>
          {(["table", "card"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: "5px 12px", fontSize: "12px", background: viewMode === mode ? S.cyan : S.white, color: viewMode === mode ? "#fff" : S.secondary, border: "none", cursor: "pointer", fontFamily: S.font, fontWeight: viewMode === mode ? 500 : 400, transition: "background 0.1s" }}
            >
              {mode === "table" ? "Tabel" : "Kartu"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table view ────────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
                  {["Pelanggan", "Kontak", "Kota", "Total Order", "Order Aktif", "Order Terakhir", "Aksi"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: i === 6 ? "right" : "left", fontSize: "10.5px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "#94A3B8", fontSize: "13px" }}>Tidak ada pelanggan yang sesuai pencarian</td></tr>
                ) : paginated.map((c, idx) => {
                  const initials    = (c.name || "UN").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  const active      = getActiveOrders(c.code);
                  const isLast      = idx === paginated.length - 1;
                  return (
                    <CustomerTableRow
                      key={c.code}
                      customer={c}
                      initials={initials}
                      active={active}
                      isLast={isLast}
                      onEdit={() => openEdit(c)}
                      onCreateSO={() => goCreateSO(c.code)}
                      onRepeat={() => goRepeatOrder(c.code)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Card view ─────────────────────────────────────────────────────────── */}
      {viewMode === "card" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {paginated.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "#94A3B8", fontSize: "13px", background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", borderRadius: 6, border: `1px solid ${S.border}` }}>
              Tidak ada pelanggan yang sesuai pencarian
            </div>
          ) : paginated.map(c => {
            const initials = (c.name || "UN").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const active   = getActiveOrders(c.code);
            return (
              <div key={c.code}
                style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: 16, transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = S.cyan; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = S.border; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #1F1F1F, #1E3A5F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: S.cyan, fontSize: "13px", fontWeight: 700 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: S.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: S.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.contact}</p>
                    </div>
                  </div>
                  <button title="Edit pelanggan" onClick={() => openEdit(c)}
                    style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${S.border}`, background: S.bg, color: S.secondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s", flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget).style.background = "#FFFBEB"; (e.currentTarget).style.color = "#D97706"; (e.currentTarget).style.borderColor = "#FCD34D"; }}
                    onMouseLeave={e => { (e.currentTarget).style.background = S.bg; (e.currentTarget).style.color = S.secondary; (e.currentTarget).style.borderColor = S.border; }}
                  >
                    <Edit size={12} />
                  </button>
                </div>

                <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { icon: <Phone size={10} />, val: c.phone },
                    { icon: <Mail size={10} />,  val: c.contact },
                    { icon: <MapPin size={10} />,val: c.address  },
                  ].map((f, i) => (
                    <p key={i} style={{ margin: 0, fontSize: "11.5px", color: S.secondary, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#94A3B8", flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.val}</span>
                    </p>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10, padding: "8px 0", borderTop: `1px solid #F8FAFC`, borderBottom: `1px solid #F8FAFC` }}>
                  {[
                    { label: "Total Order", value: salesOrders.filter(o => o.customerId === c.code).length, color: S.slate },
                    { label: "Aktif",       value: active,        color: active > 0 ? S.cyan : S.secondary },
                    { label: "Terakhir",    value: salesOrders.filter(o => o.customerId === c.code).pop()?.createdAt || "-", color: S.slate },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8" }}>{s.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <CardActionBtn label="Buat SO" icon={<ShoppingCart size={11} />} bg="#ECFEFF" color={S.cyan} onClick={() => goCreateSO(c.code)} />
                  <CardActionBtn label="Repeat" icon={<RefreshCw size={11} />} bg="#F5F3FF" color="#7C3AED" onClick={() => goRepeatOrder(c.code)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: S.secondary, fontSize: "12px" }}>
          {filtered.length === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} dari {filtered.length} pelanggan
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          <PagBtn icon={<ChevronLeft size={12} />} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <PagBtn key={p} label={p} onClick={() => setPage(p)} active={p === page} />
          ))}
          <PagBtn icon={<ChevronRight size={12} />} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
        </div>
      </div>
    </div>
  );
}

// ─── CustomerTableRow ─────────────────────────────────────────────────────────
function CustomerTableRow({ customer: c, initials, active, isLast, onEdit, onCreateSO, onRepeat }: {
  customer: Customer; initials: string; active: number; isLast: boolean;
  onEdit: () => void; onCreateSO: () => void; onRepeat: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      style={{ borderBottom: isLast ? "none" : "1px solid #F1F5F9", background: hov ? "#FAFAFA" : "transparent", transition: "background 0.1s" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: "linear-gradient(135deg, #1F1F1F, #1E3A5F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#C8102E", fontSize: "10px", fontWeight: 700 }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 500, color: S.slate }}>{c.name}</p>
            <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>{c.contact}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: S.slate, display: "flex", alignItems: "center", gap: 5 }}><Phone size={10} style={{ color: "#94A3B8" }} /> {c.phone}</p>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.secondary, display: "flex", alignItems: "center", gap: 5 }}><Mail size={10} style={{ color: "#94A3B8" }} /> {c.contact}</p>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "12.5px", color: S.slate }}>{c.address.split(",")[0]}</span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{1}</span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "12.5px", fontWeight: 500, color: active > 0 ? S.cyan : S.secondary }}>{active}</span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "12px", color: S.secondary }}>-</span>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          {[
            { icon: <Edit size={12} />,        title: "Edit Pelanggan",  hb: "#FFFBEB",  hc: "#D97706", act: onEdit      },
            { icon: <ShoppingCart size={12} />, title: "Buat SO Baru",   hb: "#ECFEFF",  hc: S.cyan,    act: onCreateSO  },
            { icon: <RefreshCw size={12} />,    title: "Repeat Order",   hb: "#F5F3FF",  hc: "#7C3AED", act: onRepeat    },
          ].map(btn => (
            <button key={btn.title} title={btn.title} onClick={btn.act}
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", transition: "all 0.1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = btn.hb; (e.currentTarget as HTMLButtonElement).style.color = btn.hc; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8"; }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ─── HeaderBtn ────────────────────────────────────────────────────────────────
function HeaderBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 4, border: primary ? "none" : `1px solid ${S.border}`, background: primary ? (hov ? "#0EA5CF" : S.cyan) : (hov ? S.bg : S.white), color: primary ? "#fff" : hov ? S.slate : S.secondary, fontSize: "12.5px", fontWeight: primary ? 500 : 400, cursor: "pointer", fontFamily: S.font, transition: "all 0.1s" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon} {label}
    </button>
  );
}

// ─── CardActionBtn ────────────────────────────────────────────────────────────
function CardActionBtn({ icon, label, bg, color, onClick }: { icon: React.ReactNode; label: string; bg: string; color: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: "6px", borderRadius: 4, border: "none", background: bg, color, fontSize: "11.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: hov ? 0.82 : 1, transition: "opacity 0.1s" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon}{label}
    </button>
  );
}

// ─── PagBtn ───────────────────────────────────────────────────────────────────
function PagBtn({ icon, label, onClick, active, disabled }: { icon?: React.ReactNode; label?: number; onClick: () => void; active?: boolean; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${active ? S.cyan : S.border}`, background: active ? S.cyan : hov && !disabled ? S.bg : S.white, color: active ? "#fff" : disabled ? "#CBD5E1" : hov ? S.slate : S.secondary, fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer", fontFamily: S.font, transition: "all 0.1s", opacity: disabled ? 0.4 : 1 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon ?? label}
    </button>
  );
}
