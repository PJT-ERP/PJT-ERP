import React, { useState } from "react";
import {
  ChevronLeft,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText,
  CheckCircle2, Circle, Clock,
  Activity, Printer, Edit, Copy,
  AlertTriangle, ArrowRight, RefreshCw,
  Receipt, Download, Eye, Upload, X, Box, Plus
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getStatusColor, SOStatus, SalesOrder } from "../data/mockData";

import { useFinanceData } from "../finance/useFinanceData";
import { mergeSalesOrderInvoice, type SalesInvoiceStatus } from "./invoice-sync";
import { financeApi } from "../../services/financeApi";

const invoiceStatusConfig: Record<SalesInvoiceStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  paid: { label: "Paid", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  verified: { label: "Verified", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  waiting: { label: "Waiting", textColor: "#FFFFFF", bgColor: "#F59E0B", borderColor: "transparent", dotColor: "#FFFFFF" },
  not_created: { label: "Not Created", textColor: "#FFFFFF", bgColor: "#DC2626", borderColor: "transparent", dotColor: "#FFFFFF" },
  pending_verification: { label: "Menunggu Verifikasi", textColor: "#C8102E", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#C8102E" },
  overdue: { label: "Overdue", textColor: "#B91C1C", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#DC2626" },
};

interface SODetailProps {
  orderId: string;
  onNavigate: (page: string, data?: unknown) => void;
  initialEditMode?: boolean;
}

const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  navy: "#1F1F1F",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

function isGo(value?: string | null) {
  return value === 'Go' || value === 'Pass';
}

const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const parseCurrencyAmount = (value: string) => {
  const normalized = value
    .replace(/[^\d,.-]/g, "") // Allow minus, dot, comma, digit
    .replace(/\./g, "")       // Remove dots (assuming they are thousand separators)
    .replace(",", ".");       // Convert comma to dot for decimal
  return Math.round((Number(normalized) || 0) * 100) / 100;
};

const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

const WORKFLOW_STEPS = [
  { key: "customer_request", label: "Customer Request", dept: "SO Team" },
  { key: "finance", label: "Finance", dept: "Finance Dept" },
  { key: "engineering", label: "Engineering", dept: "Engineering" },
  { key: "production", label: "Production", dept: "Production Floor" },
  { key: "qc", label: "QC", dept: "QC Team" },
  { key: "completed", label: "Completed", dept: "" },
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
  const { salesOrders, customers, updateSalesOrder, updateCustomer, productCatalog } = useApp();
  const { invoices, payments } = useFinanceData();

  const baseOrder = salesOrders.find(o => o.id === orderId);
  const order = baseOrder ? mergeSalesOrderInvoice(baseOrder, invoices, payments) : undefined;
  const customer = customers.find(c => c.code === order?.customerId);
  const pendingPaymentProof = !!order?.invoice?.invoiceId
    && payments.some(payment => payment.invoiceId === order.invoice?.invoiceId && payment.status === "PENDING");
  const invoicePayments = order?.invoice?.invoiceId
    ? payments.filter(payment => payment.invoiceId === order.invoice?.invoiceId)
    : [];

  const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const currentUser = useApp().currentUser;

  const isDesignLocked = ["In Production", "QC", "Ready for Delivery", "Delivered", "Completed", "Finished", "Cancelled"].includes(order?.status || "");
  const isCustomBackend = order?.backendDesignStatus === "PendingDesign" || order?.backendDesignStatus === "RevisionRequired" || order?.partNumber?.startsWith("FG-");
  const isStandard = !isCustomBackend;

  let displayMaterials = order?.materials || [];
  if (isStandard && productCatalog && order) {
    const matchedProduct = productCatalog.find(p => p.partNumber === order.partNumber || p.description === order.description);
    if (matchedProduct && matchedProduct.materialSpec) {
      displayMaterials = matchedProduct.materialSpec.split(/ \/ | and | \+ /).map((specPart, idx) => ({
        id: matchedProduct.id + "-mat-" + idx,
        name: `MAT-${String(parseInt(matchedProduct.partNumber.split('-')[1] || "0") + idx).padStart(4, '0')} - ${specPart.trim().split(' ')[0]}`,
        spec: specPart.trim(),
        quantity: "1",
        unit: matchedProduct.unit.toLowerCase(),
      }));
    }
  }

  const [actionForm, setActionForm] = useState({
    estimatedAmount: order?.estimatedAmount || 0,
    engineerName: order?.assignedName || "",
    designUrl: order?.designLink || "",
  });

  const [editForm, setEditForm] = useState({
    customerName: "",
    company: "",
    phone: "",
    contact: "",
    address: "",
    description: "",
    quantity: "",
    unit: "",
    deadline: "",
    notes: "",
    customerDrawingUrl: "",
  });

  React.useEffect(() => {
    if (isEditMode) {
      setEditForm({
        customerName: customer?.contactPerson || customer?.contact || "",
        company: customer?.name || "",
        phone: customer?.phone || "",
        contact: customer?.email || order?.customerEmail || "",
        address: customer?.address || "",
        description: order?.description || "",
        quantity: String(order?.quantity || ""),
        unit: order?.unit || "",
        deadline: order?.deadline || "",
        notes: order?.notes || "",
        customerDrawingUrl: order?.customerDrawingUrl || order?.designLink || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const handleAction = async (action: string) => {
    if (!order) return;
    setIsSubmittingAction(true);

    try {
      if (action === 'deal') {
        const nextStatus = (order.customerDrawingUrl || order.designLink) ? 'Ready for Production' : 'Pending Design';
        updateSalesOrder(orderId, { status: nextStatus });
      } else if (action === 'reject') {
        updateSalesOrder(orderId, { status: 'Rejected' });
      } else if (action === 'revise_price') {
        updateSalesOrder(orderId, { status: 'Waiting Pricing' });
      } else if (action === 'submit_price') {
        updateSalesOrder(orderId, { status: 'Waiting Client Approval', estimatedAmount: actionForm.estimatedAmount });
      } else if (action === 'assign_engineer') {
        updateSalesOrder(orderId, { assignedName: actionForm.engineerName });
      } else if (action === 'upload_design') {
        updateSalesOrder(orderId, { status: 'Waiting Spv Approval', designLink: actionForm.designUrl });
      } else if (action === 'approve_design') {
        updateSalesOrder(orderId, { status: 'Waiting Pricing', backendDesignStatus: 'Approved' });
      } else if (action === 'reject_design') {
        updateSalesOrder(orderId, { status: 'Pending Design' });
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSave = () => {
    if (!order) return;

    const isDesignChanged = editForm.customerDrawingUrl !== order.customerDrawingUrl;
    let newRevisions = order.designRevisions || [];

    if (isDesignChanged) {
      const isProductionStage = ['Ready for Production', 'In Production', 'QC', 'Completed'].includes(order.status);
      if (isProductionStage) {
        window.alert("Engineering sudah dalam tahap produksi. Desain tidak dapat diubah lagi.");
        return;
      }

      let finalUrl = editForm.customerDrawingUrl.trim();
      if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      newRevisions = [
        ...newRevisions,
        {
          version: newRevisions.length + 1,
          url: finalUrl,
          changedAt: new Date().toISOString(),
          changedBy: currentUser?.name || "Unknown"
        }
      ];

      updateSalesOrder(orderId, {
        description: editForm.description,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        deadline: editForm.deadline,
        notes: editForm.notes,
        customerDrawingUrl: finalUrl,
        designRevisions: newRevisions,
      });
    } else {
      updateSalesOrder(orderId, {
        description: editForm.description,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        deadline: editForm.deadline,
        notes: editForm.notes,
        customerDrawingUrl: editForm.customerDrawingUrl,
      });
    }
    if (customer) {
      updateCustomer(customer.code, {
        name: editForm.company || editForm.customerName,
        phone: editForm.phone,
        contact: editForm.contact,
        email: editForm.contact,
        address: editForm.address,
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
  const productLines = (order.items && order.items.length > 0)
    ? order.items.map((item, index) => {
      const quantity = Number(item.quantity || item.qty || 0) || 0;
      let unitPrice = Number(item.unitPrice || 0) || 0;
      if (unitPrice === 0 && order.items!.length === 1 && (order.estimatedAmount || 0) > 0 && quantity > 0) {
        unitPrice = (order.estimatedAmount || 0) / quantity;
      }
      return {
        id: item.id || `${order.id}-${index}`,
        productCode: item.productPartNumber || item.partNumber || order.partNumber || "-",
        productName: item.productName || item.productDescription || item.description || order.description,
        quantity,
        unit: item.unit || order.unit || "PCS",
        unitPrice,
        lineTotal: unitPrice > 0 ? unitPrice * quantity : 0,
        notes: item.notes || "",
      };
    })
    : [{
      id: `${order.id}-legacy`,
      productCode: order.partNumber || "-",
      productName: order.description,
      quantity: order.quantity,
      unit: order.unit,
      unitPrice: order.estimatedAmount && order.quantity ? order.estimatedAmount / order.quantity : 0,
      lineTotal: order.estimatedAmount || order.invoice?.amount || 0,
      notes: order.notes || "",
    }];
  const hasUnitPrice = productLines.some(item => item.unitPrice > 0);
  const orderValue = order.invoice?.amount || (hasUnitPrice ? productLines.reduce((sum, item) => sum + item.lineTotal, 0) : order.estimatedAmount) || 0;

  return (
    <>
      <div className="print-hide" style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>


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
              <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
                <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
                {order.status}
              </span>
            </div>
            <p style={{ color: S.secondary, fontSize: "12px", margin: "3px 0 0" }}>
              Dibuat {order.createdAt} · {customer?.name}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <HeaderBtn icon={<Printer size={13} />} label="Cetak" onClick={() => window.print()} />
          <HeaderBtn icon={<Copy size={13} />} label="Duplikat" onClick={() => onNavigate("so-create", { customerId: order.customerId, orderType: "repeat", soId: order.id })} />
          <HeaderBtn icon={<Edit size={13} />} label={isEditMode ? "Batal Edit" : "Edit"} onClick={() => setIsEditMode(!isEditMode)} primary={!isEditMode} />
        </div>
      </div>

      {/* ── Workflow Pipeline ─────────────────────────────────────────────────── */}
      {order.status !== "Rejected" && (
        <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: "18px 20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "11px", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Workflow Pipeline
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
            {WORKFLOW_STEPS.map((step, idx) => {
              const tStep = order.timeline?.find(t => t.step === step.key);

              const getWorkflowProgress = (status: string) => {
                if (status === 'Completed' || order.completedAt || isGo(order.qcStatus)) return 5;
                if (status === 'QC') return 4;
                if (['Ready for Production', 'In Production', 'Paused'].includes(status)) return 3;
                if (['Pending Design', 'Waiting Spv Approval', 'Waiting Approval', 'Revision Required'].includes(status)) return 2;
                if (['Waiting Pricing', 'Waiting Payment', 'Waiting Client Approval'].includes(status)) return 1;
                return 0;
              };

              const currentIdx = getWorkflowProgress(order.status);
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isUnpaidCompleted = isCurrent && idx === 5 && order.status === 'Waiting Payment';
              const isFinancePending = idx === 1 && !order.invoice?.invoiceId && currentIdx > 1;

              return (
                <React.Fragment key={step.key}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, flex: "0 0 auto", position: "relative" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isUnpaidCompleted || isFinancePending ? "#FEF3C7" : (isDone && !isFinancePending) ? "#ECFDF5" : isCurrent ? S.cyan : "#F1F5F9",
                      border: `2px solid ${isUnpaidCompleted || isFinancePending ? "#F59E0B" : (isDone && !isFinancePending) ? "#22C55E" : isCurrent ? S.cyan : "#CBD5E1"}`,
                      color: isUnpaidCompleted || isFinancePending ? "#D97706" : (isDone && !isFinancePending) ? "#22C55E" : isCurrent ? "#fff" : "#94A3B8",
                      boxShadow: isUnpaidCompleted || isFinancePending ? "0 0 0 3px rgba(245, 158, 11, 0.15)" : isCurrent ? "0 0 0 3px rgba(200,16,46,0.15)" : "none",
                      flexShrink: 0,
                    }}>
                      {isUnpaidCompleted ? <AlertTriangle size={14} /> : isFinancePending ? <Clock size={13} /> : (isDone && !isFinancePending) ? <CheckCircle2 size={14} /> : isCurrent ? <Clock size={13} /> : <Circle size={13} />}
                    </div>
                    {(isUnpaidCompleted || isFinancePending) && (
                      <div style={{ position: "absolute", top: -25, background: "#F59E0B", color: "#fff", fontSize: "9px", padding: "2px 6px", borderRadius: 4, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {isFinancePending ? "Pending Invoice" : "Unpaid"}
                      </div>
                    )}
                    <p style={{ margin: "6px 0 2px", fontSize: "11px", fontWeight: isCurrent ? 600 : 400, color: isCurrent ? S.slate : (isDone && !isFinancePending) ? "#334155" : "#94A3B8", textAlign: "center", whiteSpace: "nowrap" }}>
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

      {order.status === "Rejected" && (
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
              <InfoRow icon={<User size={11} />} label="Nama" value={isEditMode ? editForm.customerName : (customer?.contactPerson || customer?.contact || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, customerName: v }))} />
              <InfoRow icon={<Building2 size={11} />} label="Perusahaan" value={isEditMode ? editForm.company : (customer?.name || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, company: v }))} />
              <InfoRow icon={<Phone size={11} />} label="Telepon" value={isEditMode ? editForm.phone : (customer?.phone || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, phone: v }))} />
              <InfoRow icon={<Mail size={11} />} label="Email" value={isEditMode ? editForm.contact : (customer?.email || order?.customerEmail || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, contact: v }))} />
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoRow icon={<MapPin size={11} />} label="Alamat" value={isEditMode ? editForm.address : (customer?.address || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, address: v }))} />
              </div>
            </div>
          </InfoCard>

          {/* Product info */}
          <InfoCard title="Informasi Produk" icon={<Package size={13} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
              <InfoRow icon={<Hash size={11} />} label="No. PO" value={order.soNumber || order.id} isEdit={false} />
              <InfoRow icon={<Calendar size={11} />} label="Deadline" value={isEditMode ? editForm.deadline : order.deadline} isEdit={isEditMode} type="date" onChange={v => setEditForm(prev => ({ ...prev, deadline: v }))} />
              <InfoRow icon={<Receipt size={11} />} label="Nilai SO" value={formatCurrency(orderValue)} isEdit={false} />
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoRow icon={<FileText size={11} />} label="Catatan Umum" value={isEditMode ? editForm.notes : (order.notes || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, notes: v }))} />
              </div>
            </div>

            <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "52px minmax(180px, 1.6fr) 110px 120px 120px", gap: 0, background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
                {["No.", "Produk", "Qty", "Harga", "Subtotal"].map(label => (
                  <div key={label} style={{ padding: "8px 10px", fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                ))}
              </div>
              {productLines.map((item, index) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "52px minmax(180px, 1.6fr) 110px 120px 120px", borderBottom: index === productLines.length - 1 ? "none" : "1px solid #F1F5F9", alignItems: "center" }}>
                  <div style={{ padding: "10px", fontSize: "12px", color: S.secondary }}>{index + 1}</div>
                  <div style={{ padding: "10px", minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", color: S.slate, fontWeight: 600 }}>{item.productName}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.secondary }}>Kode Produk: {item.productCode}</p>
                    {item.notes && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94A3B8" }}>{item.notes}</p>}
                  </div>
                  <div style={{ padding: "10px", fontSize: "12px", color: S.slate }}>{item.quantity} {item.unit}</div>
                  <div style={{ padding: "10px", fontSize: "12px", color: S.slate }}>{formatCurrency(item.unitPrice)}</div>
                  <div style={{ padding: "10px", fontSize: "12px", color: S.slate, fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</div>
                </div>
              ))}
            </div>

            {isEditMode && (
              <p style={{ margin: "10px 0 0", fontSize: "11px", color: S.secondary }}>
                Edit multi item SO masih mengikuti kontrak backend. Gunakan Duplikat untuk membuat SO baru dengan item tambahan.
              </p>
            )}
          </InfoCard>

          {/* Bill of Materials */}
          <InfoCard title="Bill of Materials (Kebutuhan Bahan)" icon={<Box size={13} />}>
            {(displayMaterials && displayMaterials.length > 0) ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: S.font }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, color: S.secondary, textAlign: "left" }}>
                      <th style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Nama Material</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Spesifikasi</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMaterials.map((mat: any) => (
                      <tr key={mat.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                        <td style={{ padding: "8px 12px", color: S.slate }}>{mat.name || "-"}</td>
                        <td style={{ padding: "8px 12px", color: S.slate }}>{mat.spec || "-"}</td>
                        <td style={{ padding: "8px 12px", color: S.slate, textAlign: "right", fontWeight: 500, whiteSpace: "nowrap" }}>{mat.quantity} {mat.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: S.secondary, textAlign: "center", padding: "10px 0" }}>Belum ada data material.</p>
            )}
          </InfoCard>


          {/* Jadwal Eksekusi Produksi */}
          {(order.startTime || order.endTime) && (
            <InfoCard title="Jadwal Eksekusi Produksi" icon={<Clock size={13} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                    <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>Waktu Mulai Mesin</p>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: S.slate, fontWeight: 500 }}>{order.startTime ? new Date(order.startTime).toLocaleString("id-ID") : '-'}</p>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                    <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>Waktu Selesai Produksi</p>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: S.slate, fontWeight: 500 }}>{order.endTime ? new Date(order.endTime).toLocaleString("id-ID") : '-'}</p>
                  </div>
                </div>
                {order.lateReason && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", borderRadius: 6, display: "flex", gap: 10 }}>
                    <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#B45309" }}>Catatan Keterlambatan</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#92400E" }}>{order.lateReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          {/* Invoice Information — read-only for SO staff */}
          <InvoiceSection invoice={order.invoice} pendingPaymentProof={pendingPaymentProof} invoicePayments={invoicePayments} />



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
              {(!order.designId || order.designId === "none" || order.designId === "customer") && (
                <>
                  <div style={{ height: 1, background: "#F8FAFC" }} />
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Referensi Desain</p>
                    {isEditMode ? (
                      <>
                        <input
                          type="text"
                          placeholder="https://... (Opsional)"
                          value={editForm.customerDrawingUrl}
                          onChange={e => setEditForm(prev => ({ ...prev, customerDrawingUrl: e.target.value }))}
                          disabled={isDesignLocked}
                          style={{ marginTop: 4, width: "100%", padding: "6px 8px", fontSize: "11.5px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", backgroundColor: isDesignLocked ? "#F1F5F9" : "white", cursor: isDesignLocked ? "not-allowed" : "text" }}
                        />
                        {isDesignLocked && (
                          <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#EF4444" }}>
                            Desain tidak dapat diubah karena pesanan sudah masuk tahap produksi.
                          </p>
                        )}
                      </>
                    ) : order.designId === "none" && !order.designLink ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 4 }}>
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#64748B", fontWeight: 600 }}>Menunggu desain dari tim Engineering</p>
                      </div>
                    ) : !order.customerDrawingUrl && !order.designLink ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 4 }}>
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#F59E0B", fontWeight: 600 }}>Menunggu desain dari pelanggan</p>
                        {currentUser?.role !== 'Engineering' && (
                          <button onClick={() => setIsEditMode(true)} style={{ padding: "4px 10px", background: "#EFF6FF", border: `1px solid #BFDBFE`, color: "#1D4ED8", borderRadius: 4, fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"} onMouseLeave={e => e.currentTarget.style.background = "#EFF6FF"}>
                            <Plus size={10} /> Link Desain
                          </button>
                        )}
                      </div>
                    ) : order.customerDrawingUrl || order.designLink ? (
                      <a href={order.customerDrawingUrl || order.designLink} target="_blank" rel="noreferrer" style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.cyan, textDecoration: "none", wordBreak: "break-all", display: "inline-block" }}>
                        {order.customerDrawingUrl || order.designLink}
                      </a>
                    ) : (
                      <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.secondary }}>Tidak ada referensi desain dari pelanggan</p>
                    )}
                  </div>

                  {order.designRevisions && order.designRevisions.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: "10.5px", color: "#94A3B8" }}>Riwayat Revisi Desain</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 8, borderLeft: `2px solid ${S.border}` }}>
                        {order.designRevisions.map(rev => (
                          <div key={rev.version} style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: -13, top: 4, width: 6, height: 6, borderRadius: "50%", background: S.cyan }} />
                            <p style={{ margin: 0, fontSize: "11px", color: S.slate }}>
                              <span style={{ fontWeight: 600 }}>v{rev.version}</span> oleh {rev.changedBy}
                            </p>
                            <a href={rev.url} target="_blank" rel="noreferrer" style={{ margin: "2px 0 0", fontSize: "10px", color: S.secondary, textDecoration: "none", display: "inline-block", wordBreak: "break-all" }}>
                              {rev.url || "(URL Dihapus)"}
                            </a>
                            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#94A3B8" }}>
                              {new Date(rev.changedAt).toLocaleString("id-ID")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Laporan Quality Control (QC) ── */}
          {order.qcStatus && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Laporan QC</p>
                <span style={{ padding: "3px 8px", borderRadius: 4, background: isGo(order.qcStatus) ? "#ECFDF5" : "#FEF2F2", color: isGo(order.qcStatus) ? "#059669" : "#DC2626", border: `1px solid ${isGo(order.qcStatus) ? "#10B981" : "#EF4444"}`, fontSize: "10px", fontWeight: 600 }}>
                  {isGo(order.qcStatus) ? 'Go' : 'NoGo'}
                </span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {order.qcAt && (
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Inspeksi</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{new Date(order.qcAt).toLocaleString("id-ID")}</p>
                  </div>
                )}
                {order.qcNotes && (
                  <>
                    <div style={{ height: 1, background: "#F8FAFC" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Catatan QC</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.secondary, lineHeight: 1.5 }}>{order.qcNotes}</p>
                    </div>
                  </>
                )}
                {order.qcPhotos && order.qcPhotos.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "#F8FAFC" }} />
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: "10.5px", color: "#94A3B8" }}>Foto Bukti</p>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                        {order.qcPhotos.map((photo, i) => (
                          <img key={i} src={photo} alt={`QC Photo ${i + 1}`} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4, border: `1px solid ${S.border}` }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Action Panel (Sales Validation) ── */}
          {(currentUser?.role === 'Sales' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && (order.status === 'Waiting Client Approval') && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FFFBEB" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#D97706", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={14} /> Validasi Klien
                </p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
                  Finance telah memberikan Estimasi Harga: <strong style={{ color: S.slate }}>Rp {(order.estimatedAmount || 0).toLocaleString("id-ID")}</strong>
                </p>
                <ActionBtn icon={<CheckCircle2 size={13} />} label="Klien Deal (Lanjut SO)" bg="#ECFDF5" color="#059669" border="1px solid #10B981" onClick={() => handleAction('deal')} />
                <ActionBtn icon={<RefreshCw size={13} />} label="Nego / Revisi Harga" bg="#FFFBEB" color="#D97706" border="1px solid #F59E0B" onClick={() => handleAction('revise_price')} />
                <ActionBtn icon={<X size={13} />} label="Gagal / Batal (Rejected)" bg="#FEF2F2" color="#DC2626" border="1px solid #EF4444" onClick={() => handleAction('reject')} />
              </div>
            </div>
          )}

          {/* ── Action Panel (Finance Pricing) ── */}
          {(currentUser?.role === 'Finance' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && order.status === 'Waiting Pricing' && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Finance: Estimasi Harga Jual</p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "11px", color: S.secondary }}>Estimasi Total Harga (Rp)</label>
                <input
                  type="number"
                  value={actionForm.estimatedAmount}
                  onChange={e => setActionForm(prev => ({ ...prev, estimatedAmount: Number(e.target.value) }))}
                  style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box" }}
                />
                <ActionBtn icon={<CheckCircle2 size={13} />} label="Submit Harga" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('submit_price')} />
              </div>
            </div>
          )}

          {/* ── Action Panel (Engineering Supervisor Assign) ── */}
          {(currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && order.status === 'Pending Design' && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Spv Engineering: Assign Task</p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "11px", color: S.secondary }}>Assign to Engineer</label>
                <select
                  value={actionForm.engineerName}
                  onChange={e => setActionForm(prev => ({ ...prev, engineerName: e.target.value }))}
                  style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff" }}
                >
                  <option value="">-- Pilih Engineer --</option>
                  <option value="Budi Santoso">Budi Santoso</option>
                  <option value="Andi Pratama">Andi Pratama</option>
                </select>
                <ActionBtn icon={<CheckCircle2 size={13} />} label="Assign Engineer" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('assign_engineer')} />
              </div>
            </div>
          )}

          {/* ── Action Panel (Engineering Supervisor Approve) ── */}
          {(currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && order.status === 'Waiting Spv Approval' && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Spv Engineering: Approval Desain</p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
                  Engineer {order.assignedName || "Engineer"} telah mensubmit desain. Mohon review.
                </p>
                <ActionBtn icon={<CheckCircle2 size={13} />} label="Approve Desain" bg="#ECFDF5" color="#059669" border="1px solid #10B981" onClick={() => handleAction('approve_design')} />
                <ActionBtn icon={<RefreshCw size={13} />} label="Reject & Minta Revisi" bg="#FEF2F2" color="#DC2626" border="1px solid #EF4444" onClick={() => handleAction('reject_design')} />
              </div>
            </div>
          )}

          {/* ── Action Panel (Engineer Upload) ── */}
          {(currentUser?.role === 'Engineering' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && order.status === 'Pending Design' && (order.assignedName === currentUser?.name || currentUser?.role !== 'Engineering') && (
            <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Engineering: Upload Desain</p>
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "11px", color: S.secondary }}>URL Gambar Desain</label>
                <input
                  type="text"
                  value={actionForm.designUrl}
                  onChange={e => setActionForm(prev => ({ ...prev, designUrl: e.target.value }))}
                  placeholder="https://example.com/design.png"
                  style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box" }}
                />
                <ActionBtn icon={<Upload size={13} />} label="Submit ke Supervisor" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('upload_design')} />
              </div>
            </div>
          )}

          {/* ── End-to-End History (Jejak Rekam Proyek) ── */}
          <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>End-to-End History</p>
            </div>
            <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
              {(() => {
                const historySteps: { label: string; date?: string; active: boolean; isRejection?: boolean; reason?: string }[] = [
                  { label: 'Desain Disetujui', date: order.designApprovedAt, active: !!order.designApprovedAt },
                  { label: 'Sales Order Rilis', date: order.createdAt, active: !!order.createdAt },
                  { label: 'Invoice Diterbitkan', date: order.invoice?.invoiceDate, active: !!order.invoice?.invoiceDate }
                ];

                if (order.invoice?.rejectedPayments) {
                  order.invoice.rejectedPayments.forEach(rp => {
                    historySteps.push({
                      label: 'Pembayaran Ditolak',
                      date: rp.date,
                      active: true,
                      isRejection: true,
                      reason: rp.reason
                    });
                  });
                }

                historySteps.push(
                  { label: 'Lunas', date: order.invoice?.paymentDate, active: !!order.invoice?.paymentDate }
                );

                return historySteps.map((step, idx, arr) => (
                  <div key={idx} style={{ display: "flex", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: step.isRejection ? "#FEF2F2" : (step.active ? S.cyan : "#F1F5F9"), border: `2px solid ${step.isRejection ? "#EF4444" : (step.active ? S.cyan : "#CBD5E1")}`, zIndex: 1 }} />
                      {idx < arr.length - 1 && (
                        <div style={{ width: 2, flex: 1, background: step.active ? (step.isRejection ? "#F1F5F9" : "#A5F3FC") : "#F1F5F9", marginTop: -2, marginBottom: -4 }} />
                      )}
                    </div>
                    <div style={{ paddingTop: -1, paddingBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: step.active ? 600 : 400, color: step.isRejection ? "#DC2626" : (step.active ? S.slate : "#94A3B8") }}>{step.label}</p>
                      {step.date && <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.secondary }}>{step.date}</p>}
                      {step.reason && <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#EF4444", fontStyle: "italic" }}>Alasan: {step.reason}</p>}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>
      </div>
      </div>
      <SOPrintView order={order} customer={customer} displayMaterials={displayMaterials} currentUser={currentUser} />
    </>
  );
}

// ─── InvoiceSection ───────────────────────────────────────────────────────────
function InvoiceSection({ invoice, pendingPaymentProof, invoicePayments }: { invoice?: SalesOrder["invoice"]; pendingPaymentProof: boolean; invoicePayments: any[] }) {
  const status = (invoice?.status ?? "not_created") as SalesInvoiceStatus;
  const cfg = invoiceStatusConfig[status];
  const hasInvoice = status !== "not_created" && !!invoice?.invoiceNumber;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);
  const hasPendingPaymentProof = pendingPaymentProof || paymentReported;

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
            {hasPendingPaymentProof ? "Menunggu Verifikasi Finance" : cfg.label}
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
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate }}>{invoice!.dueDate}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Total Keseluruhan</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate, fontWeight: 600 }}>
                    Rp {invoice!.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Telah Dibayar</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#059669", fontWeight: 600 }}>
                    Rp {(invoice!.paidAmount || 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Sisa Tagihan</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#DC2626", fontWeight: 600 }}>
                    Rp {Math.max((invoice!.amount || 0) - (invoice!.paidAmount || 0), 0).toLocaleString("id-ID")}
                  </p>
                </div>
                {invoice!.paymentDate && (
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Bayar (Terakhir)</p>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#22C55E" }}>{invoice!.paymentDate}</p>
                  </div>
                )}
              </div>

              {invoice?.paymentSchedules && invoice.paymentSchedules.length > 1 && (
                <div style={{ marginTop: 6, marginBottom: 16, paddingTop: 16, borderTop: `1px dashed ${S.border}` }}>
                  <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: S.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jadwal / Tahapan Penagihan</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {invoice.paymentSchedules.map((schedule: any, idx: number) => {
                      const amt = Math.round((invoice!.amount * schedule.percentage) / 100);
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", background: "#F1F5F9", padding: "8px 12px", borderRadius: "6px" }}>
                          <div>
                            <span style={{ fontWeight: 600, color: S.slate }}>{schedule.label}</span>
                            <span style={{ color: "#64748B", marginLeft: 8 }}>• Jatuh tempo: {schedule.dueDate}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: S.cyan }}>Rp {amt.toLocaleString("id-ID")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {invoice?.rejectedPayments && invoice.rejectedPayments.length > 0 && !hasPendingPaymentProof && status !== "paid" && status !== "verified" && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#B91C1C", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} /> Laporan Pembayaran Terakhir Ditolak
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#991B1B" }}>
                    Catatan Finance: <strong>{invoice.rejectedPayments[invoice.rejectedPayments.length - 1].reason}</strong>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#DC2626" }}>
                    Silakan unggah ulang bukti transfer yang valid.
                  </p>
                </div>
              )}

              {/* Payment History */}
              {invoicePayments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}`, paddingBottom: 4 }}>
                  <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: S.slate }}>Riwayat Pembayaran</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {invoicePayments.map(payment => (
                      <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: S.bg, borderRadius: 6, border: `1px solid ${S.border}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: S.slate }}>{formatCurrency(payment.amount)}</p>
                          <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>{payment.paymentDate} • {payment.bankName}</p>
                        </div>
                        <div>
                          {payment.status === "VERIFIED" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#DCFCE7", color: "#16A34A" }}>Verified</span>}
                          {payment.status === "PENDING" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#FEF3C7", color: "#D97706" }}>Pending</span>}
                          {payment.status === "REJECTED" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#FEE2E2", color: "#DC2626" }}>Ditolak</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                <InvoiceBtn icon={<Eye size={12} />} label="Lihat Invoice" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/v1/finance/invoices/${invoice!.invoiceId}/pdf?inline=true`, '_blank')} />
                <InvoiceBtn icon={<Download size={12} />} label="Download PDF" onClick={() => {
                  const link = document.createElement('a');
                  link.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/v1/finance/invoices/${invoice!.invoiceId}/pdf`;
                  link.download = `Invoice-${invoice!.invoiceNumber}.pdf`;
                  link.click();
                }} />
                {(status === "waiting" || status === "verified") && !hasPendingPaymentProof && (invoice?.amount || 0) > (invoice?.paidAmount || 0) && (
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

      {showUploadModal && (() => {
        let defaultAmount = invoice?.amount || 0;
        if (invoice?.paymentSchedules && invoice.paymentSchedules.length > 0) {
          const remaining = Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0);
          let runningTotal = 0;
          for (const schedule of invoice.paymentSchedules) {
            runningTotal += schedule.amount;
            if (runningTotal > (invoice.paidAmount || 0)) {
              defaultAmount = Math.min(runningTotal - (invoice.paidAmount || 0), remaining);
              break;
            }
          }
        }
        return (
          <ReportPaymentModal
            invoiceId={invoice?.invoiceId}
            invoiceNumber={invoice?.invoiceNumber || ""}
            amount={defaultAmount}
            onClose={() => setShowUploadModal(false)}
            onSubmit={() => {
              setPaymentReported(true);
              setShowUploadModal(false);
            }}
          />
        );
      })()}
    </>
  );
}

function ReportPaymentModal({ invoiceId, invoiceNumber, amount, onClose, onSubmit }: { invoiceId?: string, invoiceNumber: string, amount: number, onClose: () => void, onSubmit: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [bankName, setBankName] = useState("");
  const [amountText, setAmountText] = useState(amount > 0 ? `Rp ${amount.toLocaleString('id-ID')}` : "");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProofFile(null);
      setError("Ukuran bukti transfer maksimal 5MB.");
      return;
    }

    setProofFile(file);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseCurrencyAmount(amountText);
    if (!invoiceId) {
      setError("Invoice belum tersambung ke backend.");
      return;
    }
    if (numericAmount <= 0) {
      setError("Nominal transfer harus lebih dari 0.");
      return;
    }
    if (!proofFile) {
      setError("Bukti transfer wajib diupload.");
      return;
    }

    try {
      setError("");
      setIsUploading(true);
      await financeApi.submitPaymentProof(invoiceId, {
        paymentDate,
        amount: numericAmount,
        bankName,
        bankReference: null,
        proofFile: proofFile,
        notes: notes.trim() || null,
      });
      onSubmit();
    } catch (err) {
      console.warn("Failed to submit payment proof.", err);
      setError("Gagal mengirim bukti bayar ke Finance.");
    } finally {
      setIsUploading(false);
    }
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
              <select required value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none" }}>
                <option value="">Pilih Bank...</option>
                <option value="BCA">BCA - PT Pratama Jaya (1234567890)</option>
                <option value="Mandiri">Mandiri - PT Pratama Jaya (0987654321)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Nominal Transfer</label>
                <input required type="text" value={amountText} onChange={e => setAmountText(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Tanggal Bayar</label>
                <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ width: "100%", padding: "7px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Upload Bukti Transfer</label>
              <div style={{
                position: "relative",
                border: proofFile ? "1px solid #10B981" : "1px dashed #CBD5E1",
                borderRadius: 8,
                padding: 24,
                textAlign: "center",
                background: proofFile ? "#ECFDF5" : "#F8FAFC",
                transition: "all 0.2s ease"
              }}>
                {proofFile ? (
                  <>
                    <CheckCircle2 size={28} style={{ color: "#10B981", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#065F46" }}>File Berhasil Dipilih</p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#047857" }}>{proofFile.name}</p>
                    <p style={{ margin: "8px 0 0", fontSize: "10px", color: "#10B981", fontStyle: "italic" }}>Klik untuk mengubah file</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} style={{ color: "#94A3B8", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "12px", color: S.slate }}>Klik untuk memilih file PDF / Gambar</p>
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>Max ukuran file 5MB</p>
                  </>
                )}
                <input required type="file" accept=".pdf,image/*" onChange={handleProofFileChange} style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Catatan Tambahan (Opsional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box", resize: "none" }} placeholder="Misal: Sudah ditransfer atas nama Budi..." />
            </div>
          </div>

          {error && <p style={{ margin: "12px 0 0", color: "#DC2626", fontSize: "12px" }}>{error}</p>}

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
        background: primary ? (hov ? "#C8102E" : "#3B82F6") : (hov ? S.bg : S.white),
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

// ─── SOPrintView ──────────────────────────────────────────────────────────────
function SOPrintView({ order, customer, displayMaterials, currentUser }: { order: any, customer: any, displayMaterials: any[], currentUser: any }) {
  if (!order) return null;
  const createdBy = order.createdBy === "backend" ? (currentUser?.name || "Sales Staff") : (order.createdBy || "Sales Staff");

  return (
    <div className="hidden print:block print:w-full print:border-none print:shadow-none print:m-0 print:bg-white print:text-slate-900 bg-white">
      {/* Professional Sales Order Header */}
      <div className="px-6 pt-10 pb-6 border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
          <div className="flex gap-6 items-center">
            <img src="/pjt-logo-new.png" alt="PT. Pratama Jaya Logo" className="h-20 w-auto object-contain flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">PT. PRATAMA JAYA</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Kawasan Industri MM2100<br/>Cikarang Barat, Bekasi 17530<br/>sales@pratamajaya.co.id</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase mb-2">SALES ORDER</h2>
            <p className="text-sm font-bold text-slate-800">SO No: {order.id}</p>
            <p className="text-sm text-slate-600">Tgl. Cetak: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Ditujukan Kepada / Detail Order */}
      <div className="flex px-6 py-8 justify-between">
        <div className="w-1/2 pr-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ditujukan Kepada:</h3>
          <p className="font-bold text-slate-900 text-lg">{customer?.company || customer?.name}</p>
          <p className="text-sm text-slate-600 mt-1">Up. {customer?.name}</p>
          <p className="text-sm text-slate-600">{customer?.address || "-"}</p>
          <p className="text-sm text-slate-600">Telp: {customer?.phone || "-"}</p>
        </div>
        <div className="w-1/3 border-l-2 border-slate-100 pl-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detail Order:</h3>
          <p className="text-sm text-slate-600 mb-1">Status: <strong className="text-slate-900">{order.status}</strong></p>
          <p className="text-sm text-slate-600 mb-1">Tgl. SO: <strong className="text-slate-900">{order.createdAt}</strong></p>
          <p className="text-sm text-slate-600 mb-1">Deadline: <strong className="text-slate-900">{order.deadline}</strong></p>
        </div>
      </div>

      {/* Items table */}
      <div className="px-6 py-2">
        <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          Daftar Pesanan
        </p>
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi Produk / Material</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Harga Satuan</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Harga</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-xs text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 text-sm font-medium text-slate-900">
                      <div>{item.productDescription || order.description}</div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">Part No: {item.productPartNumber || order.partNumber}</div>
                    </td>
                    <td className="p-3 text-sm font-semibold text-right text-slate-900">{item.qty || order.quantity} {item.unit || order.unit}</td>
                    <td className="p-3 text-sm text-right text-slate-700">Rp {((item.totalPrice || order.estimatedAmount || 0) / (item.qty || order.quantity || 1)).toLocaleString('id-ID')}</td>
                    <td className="p-3 text-sm text-right font-bold text-slate-900">Rp {(item.totalPrice || order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-xs text-slate-500 font-mono">1</td>
                  <td className="p-3 text-sm font-medium text-slate-900">
                    <div>{order.description}</div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">Part No: {order.partNumber}</div>
                  </td>
                  <td className="p-3 text-sm font-semibold text-right text-slate-900">{order.quantity} {order.unit}</td>
                  <td className="p-3 text-sm text-right text-slate-700">Rp {((order.estimatedAmount || 0) / (order.quantity || 1)).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-sm text-right font-bold text-slate-900">Rp {(order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={4} className="p-3 text-right text-sm font-bold text-slate-700 uppercase tracking-wider">GRAND TOTAL</td>
                <td className="p-3 text-right text-base font-black text-blue-700">Rp {(order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {displayMaterials && displayMaterials.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Spesifikasi Material:</h4>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              {displayMaterials.map((mat: any, i: number) => (
                <li key={i}>{mat.name} - {mat.spec} ({mat.quantity} {mat.unit})</li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan:</h4>
            <div className="text-sm text-slate-600 bg-slate-50 p-3 border border-slate-200 rounded whitespace-pre-wrap">{order.notes}</div>
          </div>
        )}
      </div>

      {/* PRINT ONLY: Signatures */}
      <div className="flex mt-16 justify-end px-10 pb-10">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-800 mb-20">Dibuat Oleh,</p>
          <div className="w-48 border-b border-slate-400 mx-auto"></div>
          <p className="text-sm font-bold text-slate-900 mt-2">{createdBy}</p>
          <p className="text-xs text-slate-500">Sales Department</p>
        </div>
      </div>
    </div>
  );
}
