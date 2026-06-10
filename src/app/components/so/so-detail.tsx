import React, { useState } from "react";
import {
  ChevronLeft,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText,
  CheckCircle2, Circle, Clock,
  Activity, Printer, Edit, Copy,
  AlertTriangle, ArrowRight, RefreshCw,
  Receipt, Download, Eye, Upload, X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useERPStore } from "../../store/useERPStore";
import { getStatusColor, SOStatus, SalesOrder } from "../data/mockData";
import type { Page } from "../layout/erp-layout";

type InvoiceStatus = "paid" | "waiting" | "not_created";
const invoiceStatusConfig: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  paid: { label: "Paid", textColor: "#065F46", bgColor: "#ECFDF5", borderColor: "#6EE7B7", dotColor: "#10B981" },
  waiting: { label: "Waiting", textColor: "#92400E", bgColor: "#FFFBEB", borderColor: "#FCD34D", dotColor: "#F59E0B" },
  not_created: { label: "Not Created", textColor: "#64748B", bgColor: "#F8FAFC", borderColor: "#CBD5E1", dotColor: "#94A3B8" },
};

interface SODetailProps {
  orderId: string;
  onNavigate: (page: Page, data?: unknown) => void;
  initialEditMode?: boolean;
}

const S = {
  font:      "Inter, sans-serif",
  cyan:      "#06B6D4",
  navy:      "#0F172A",
  slate:     "#1E293B",
  secondary: "#64748B",
  border:    "#E2E8F0",
  bg:        "#F8FAFC",
  white:     "#FFFFFF",
};

const WORKFLOW_STEPS = [
  { key: "customer_request", label: "Customer Request", dept: "SO Team"         },
  { key: "finance",          label: "Finance",          dept: "Finance Dept"    },
  { key: "engineering",      label: "Engineering",      dept: "Engineering"     },
  { key: "production",       label: "Production",       dept: "Production Floor"},
  { key: "qc",               label: "QC",               dept: "QC Team"         },
  { key: "completed",        label: "Completed",        dept: ""                },
];

function InfoRow({ icon, label, value, isEdit, onChange, type = "text" }: { icon: React.ReactNode; label: string; value: string; isEdit?: boolean; onChange?: (val: string) => void; type?: string }) {
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

// ─── Action button with hover ──────────────────────────────────────────────────
function ActionBtn({ icon, label, bg, color, border, onClick }: {
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

export function SODetail({ orderId, onNavigate, initialEditMode }: SODetailProps) {
  const { salesOrders, customers, updateSalesOrder } = useApp();
  const { allSOs, updateSOInFinance } = useERPStore();
  
  const order = salesOrders.find(o => o.id === orderId);
  const customer = customers.find(c => c.code === order?.customerId);
  const financeSo = allSOs.find(s => s.soNumber === orderId);

  const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
  const [editForm, setEditForm] = useState({
    customerName: customer?.name || "",
    company: financeSo?.company || customer?.name || "",
    phone: financeSo?.phone || customer?.phone || "",
    contact: financeSo?.email || customer?.contact || "",
    address: financeSo?.address || customer?.address || "",
    description: order?.description || "",
    quantity: String(order?.quantity || ""),
    unit: order?.unit || "",
    material: financeSo?.material || order?.material || "",
    spec: financeSo?.spec || order?.spec || "",
    deadline: order?.deadline || "",
    notes: financeSo?.notes || order?.notes || "",
  });

  const handleSave = () => {
    if (!order) return;
    updateSalesOrder(orderId, {
      description: editForm.description,
      quantity: Number(editForm.quantity),
      unit: editForm.unit,
      material: editForm.material,
      spec: editForm.spec,
      deadline: editForm.deadline,
      notes: editForm.notes,
    });
    if (financeSo) {
      updateSOInFinance(financeSo.id, {
        customerName: editForm.customerName,
        company: editForm.company,
        phone: editForm.phone,
        email: editForm.contact,
        address: editForm.address,
        productName: editForm.description,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        material: editForm.material,
        spec: editForm.spec,
        notes: editForm.notes,
      });
    }
    setIsEditMode(false);
  };

  if (!order) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: S.font }}>
        <div style={{ textAlign: "center" }}>
          <AlertTriangle size={36} style={{ color: "#CBD5E1", margin: "0 auto 12px" }} />
          <p style={{ color: S.secondary }}>Sales Order tidak ditemukan</p>
          <button onClick={() => onNavigate("so-list")}
            style={{ marginTop: 12, padding: "7px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.slate, fontSize: "13px", cursor: "pointer", fontFamily: S.font }}>
            Kembali ke Daftar SO
          </button>
        </div>
      </div>
    );
  }

  const cfg = getStatusColor(order.status as SOStatus);

  return (
    <div style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => onNavigate("so-list")}
            title="Kembali ke Daftar SO"
            style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, cursor: "pointer", flexShrink: 0, transition: "background 0.1s, color 0.1s" }}
            onMouseEnter={e => { (e.currentTarget).style.background = S.bg; (e.currentTarget).style.color = S.slate; }}
            onMouseLeave={e => { (e.currentTarget).style.background = S.white; (e.currentTarget).style.color = S.secondary; }}
          >
            <ChevronLeft size={15} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ color: S.slate, margin: 0 }}>{order.id}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, border: `1px solid`, borderColor: cfg.border.replace("border-", ""), background: cfg.bg.replace("bg-", ""), color: cfg.text.replace("text-", ""), fontSize: "12px", fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.text.replace("text-", ""), flexShrink: 0 }} />
                {order.status}
              </span>
            </div>
            <p style={{ color: S.secondary, fontSize: "12px", margin: "3px 0 0" }}>
              Dibuat {order.createdAt} · {customer?.name}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <HeaderBtn icon={<Printer size={13} />} label="Cetak"    />
          <HeaderBtn icon={<Copy size={13} />}    label="Duplikat" onClick={() => onNavigate("so-create", { customerId: order.customerId, orderType: "repeat" })} />
          <HeaderBtn icon={<Edit size={13} />}    label={isEditMode ? "Tutup Edit" : "Edit"} onClick={() => setIsEditMode(!isEditMode)} primary={!isEditMode} />
        </div>
      </div>

      {/* ── Workflow Pipeline ─────────────────────────────────────────────────── */}
      {order.status !== "cancelled" && (
        <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: "18px 20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "11px", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Workflow Pipeline
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
            {WORKFLOW_STEPS.map((step, idx) => {
              const tStep     = order.timeline?.find(t => t.step === step.key);
              const isDone    = tStep?.completed && !tStep?.current;
              const isCurrent = tStep?.current;

              return (
                <React.Fragment key={step.key}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, flex: "0 0 auto" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isDone ? "#ECFDF5" : isCurrent ? S.cyan : "#F1F5F9",
                      border: `2px solid ${isDone ? "#22C55E" : isCurrent ? S.cyan : "#CBD5E1"}`,
                      color: isDone ? "#22C55E" : isCurrent ? "#fff" : "#94A3B8",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(6,182,212,0.15)" : "none",
                      flexShrink: 0,
                    }}>
                      {isDone ? <CheckCircle2 size={14} /> : isCurrent ? <Clock size={13} /> : <Circle size={13} />}
                    </div>
                    <p style={{ margin: "6px 0 2px", fontSize: "11px", fontWeight: isCurrent ? 600 : 400, color: isCurrent ? S.slate : isDone ? "#334155" : "#94A3B8", textAlign: "center", whiteSpace: "nowrap" }}>
                      {step.label}
                    </p>
                    {step.dept && (
                      <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8", textAlign: "center", whiteSpace: "nowrap" }}>{step.dept}</p>
                    )}
                    {tStep?.date && (
                      <p style={{ margin: "2px 0 0", fontSize: "10px", color: S.cyan, textAlign: "center" }}>{tStep.date}</p>
                    )}
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div style={{ flex: 1, minWidth: 16, height: 2, marginTop: 15, background: isDone ? "#A7F3D0" : "#E2E8F0", alignSelf: "flex-start" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
          <p style={{ margin: 0, color: "#991B1B", fontSize: "13px" }}>Sales Order ini telah dibatalkan.</p>
        </div>
      )}

      {/* ── Main content grid ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 14 }} className="detail-grid">

        {/* ── Left column ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

          {/* Customer info */}
          <InfoCard title="Informasi Pelanggan" icon={<User size={13} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <InfoRow icon={<User size={11} />}     label="Nama"       value={isEditMode ? editForm.customerName : (customer?.name || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, customerName: v}))} />
              <InfoRow icon={<Building2 size={11} />} label="Perusahaan" value={isEditMode ? editForm.company : (financeSo?.company || customer?.name || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, company: v}))} />
              <InfoRow icon={<Phone size={11} />}    label="Telepon"    value={isEditMode ? editForm.phone : (financeSo?.phone || customer?.phone || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, phone: v}))} />
              <InfoRow icon={<Mail size={11} />}     label="Kontak"     value={isEditMode ? editForm.contact : (financeSo?.email || customer?.contact || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, contact: v}))} />
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoRow icon={<MapPin size={11} />} label="Alamat" value={isEditMode ? editForm.address : (financeSo?.address || customer?.address || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, address: v}))} />
              </div>
            </div>
          </InfoCard>

          {/* Product info */}
          <InfoCard title="Informasi Produk" icon={<Package size={13} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoRow icon={<Package size={11} />} label="Nama Produk" value={isEditMode ? editForm.description : order.description} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, description: v}))} />
              </div>
              <InfoRow icon={<Hash size={11} />}    label="Jumlah"   value={isEditMode ? editForm.quantity : order.quantity.toString()} isEdit={isEditMode} type="number" onChange={v => setEditForm(prev => ({...prev, quantity: v}))} />
              <InfoRow icon={<Hash size={11} />}    label="Unit"     value={isEditMode ? editForm.unit : order.unit} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, unit: v}))} />
              <InfoRow icon={<Package size={11} />} label="Material" value={isEditMode ? editForm.material : (financeSo?.material || order.material || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, material: v}))} />
              <InfoRow icon={<FileText size={11} />} label="Spesifikasi" value={isEditMode ? editForm.spec : (financeSo?.spec || order.spec || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, spec: v}))} />
              <InfoRow icon={<Calendar size={11} />} label="Deadline" value={isEditMode ? editForm.deadline : order.deadline} isEdit={isEditMode} type="date" onChange={v => setEditForm(prev => ({...prev, deadline: v}))} />
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoRow icon={<FileText size={11} />} label="Catatan" value={isEditMode ? editForm.notes : (order.notes || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({...prev, notes: v}))} />
              </div>
            </div>
          </InfoCard>

          {/* Invoice Information — read-only for SO staff */}
          <InvoiceSection invoice={order.invoice} />

          {/* Activity log */}
          {!isEditMode && (
            <InfoCard title="Log Aktivitas" icon={<Activity size={13} />}>
              <div>
                {(order.activities || []).map((act, idx) => (
                  <div key={act.id} style={{ display: "flex", gap: 12, paddingBottom: idx < (order.activities?.length || 0) - 1 ? 14 : 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(6,182,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Activity size={11} style={{ color: S.cyan }} />
                      </div>
                      {idx < (order.activities?.length || 0) - 1 && (
                        <div style={{ width: 1, flex: 1, background: "#F1F5F9", margin: "4px 0" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <p style={{ margin: 0, fontSize: "12.5px", color: S.slate }}>{act.action}</p>
                      <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94A3B8" }}>
                        <span style={{ fontWeight: 500, color: S.secondary }}>{act.user}</span>
                        {" · "}<span style={{ color: S.cyan }}>{act.role}</span>
                        {" · "}{act.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          {/* Edit Actions */}
          {isEditMode && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setIsEditMode(false)}
                style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = S.white)}
              >
                Batal
              </button>
              <button type="button" onClick={handleSave}
                style={{ padding: "8px 24px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "none")}
              >
                Simpan Perubahan
              </button>
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Key order info — compact, non-redundant */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Info Order</p>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>No. SO</p>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.cyan, fontWeight: 600 }}>{order.id}</p>
              </div>
              <div style={{ height: 1, background: "#F8FAFC" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Deadline</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{order.deadline}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Qty</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{order.quantity.toLocaleString("id-ID")} {order.unit}</p>
                </div>
              </div>
              {order.notes && (
                <>
                  <div style={{ height: 1, background: "#F8FAFC" }} />
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Catatan</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.secondary, lineHeight: 1.5 }}>{order.notes}</p>
                  </div>
                </>
              )}
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}

// ─── InvoiceSection ───────────────────────────────────────────────────────────
function InvoiceSection({ invoice }: { invoice?: SalesOrder["invoice"] }) {
  const status: InvoiceStatus = invoice?.status ?? "not_created";
  const cfg = invoiceStatusConfig[status];
  const hasInvoice = status !== "not_created" && !!invoice?.invoiceNumber;
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);

  return (
    <>
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={13} style={{ color: S.cyan }} />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: S.slate }}>Informasi Invoice</span>
            <span style={{ fontSize: "10px", color: "#94A3B8", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 6px" }}>
              Read-only
            </span>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 4,
            border: `1px solid ${cfg.borderColor}`,
            background: cfg.bgColor, color: cfg.textColor,
            fontSize: "11px", fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dotColor, flexShrink: 0 }} />
            {paymentReported ? "Menunggu Verifikasi Finance" : cfg.label}
          </span>
        </div>

        <div style={{ padding: 16 }}>
          {!hasInvoice ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 4, border: "1px solid #E2E8F0" }}>
              <Receipt size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "12.5px", color: S.secondary }}>
                Invoice belum dibuat. Finance akan menerbitkan invoice setelah SO disetujui.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>No. Invoice</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.cyan, fontWeight: 600 }}>{invoice!.invoiceNumber}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Invoice</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate }}>{invoice!.invoiceDate}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Jatuh Tempo</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: status === "overdue" ? "#EF4444" : S.slate }}>{invoice!.dueDate}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Jumlah Tagihan</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate, fontWeight: 600 }}>
                    Rp {invoice!.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                {invoice!.paymentDate && (
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Bayar</p>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#22C55E" }}>{invoice!.paymentDate}</p>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                <InvoiceBtn icon={<Eye size={12} />} label="Lihat Invoice" />
                <InvoiceBtn icon={<Download size={12} />} label="Download PDF" />
                {status === "waiting" && !paymentReported && (
                  <div style={{ marginLeft: "auto" }}>
                    <InvoiceBtn 
                      icon={<Upload size={12} />} 
                      label="Lapor Pembayaran" 
                      primary 
                      onClick={() => setShowUploadModal(true)} 
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showUploadModal && (
        <ReportPaymentModal 
          invoiceNumber={invoice?.invoiceNumber || ""}
          amount={invoice?.amount || 0}
          onClose={() => setShowUploadModal(false)}
          onSubmit={() => {
            setPaymentReported(true);
            setShowUploadModal(false);
          }}
        />
      )}
    </>
  );
}

function ReportPaymentModal({ invoiceNumber, amount, onClose, onSubmit }: { invoiceNumber: string, amount: number, onClose: () => void, onSubmit: () => void }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onSubmit();
    }, 800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, width: "100%", maxWidth: 450, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden", fontFamily: S.font }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", color: S.slate }}>Lapor Pembayaran</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: S.secondary }}>Invoice {invoiceNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Bank Tujuan</label>
              <select required style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none" }}>
                <option value="">Pilih Bank...</option>
                <option value="BCA">BCA - PT Pratama Jaya (1234567890)</option>
                <option value="Mandiri">Mandiri - PT Pratama Jaya (0987654321)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Nominal Transfer</label>
              <input required type="text" defaultValue={`Rp ${amount.toLocaleString('id-ID')}`} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Upload Bukti Transfer</label>
              <div style={{ position: "relative", border: "1px dashed #CBD5E1", borderRadius: 8, padding: 24, textAlign: "center", background: "#F8FAFC" }}>
                <Upload size={24} style={{ color: "#94A3B8", margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontSize: "12px", color: S.slate }}>Klik untuk memilih file PDF / Gambar</p>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>Max ukuran file 5MB</p>
                <input required type="file" style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Catatan Tambahan (Opsional)</label>
              <textarea rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box", resize: "none" }} placeholder="Misal: Sudah ditransfer atas nama Budi..." />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", color: S.slate, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Batal
            </button>
            <button type="submit" disabled={isUploading} style={{ flex: 1, padding: "10px", borderRadius: 6, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? "Mengunggah..." : "Kirim Bukti Bayar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6,
        border: primary ? "none" : `1px solid ${hov ? "#CBD5E1" : S.border}`,
        background: primary ? (hov ? "#2563EB" : "#3B82F6") : (hov ? S.bg : S.white),
        color: primary ? "#fff" : (hov ? S.slate : S.secondary),
        fontSize: "12.5px", fontWeight: primary ? 500 : 400,
        cursor: "pointer", fontFamily: S.font, transition: "all 0.1s",
        boxShadow: primary ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon} {label}
    </button>
  );
}

// ─── InfoCard ──────────────────────────────────────────────────────────────────
function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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

// ─── HeaderBtn ────────────────────────────────────────────────────────────────
function HeaderBtn({ icon, label, primary, onClick }: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void }) {
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
