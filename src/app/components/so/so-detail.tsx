import React, { useState } from "react";
import {
  ChevronLeft,
  User, Building2, Phone, Mail, MapPin,
  AlertTriangle,
  Edit, Copy, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { getStatusColor, SOStatus } from "../data/mockData";
import { useFinanceData } from "../finance/useFinanceData";
import { mergeSalesOrderInvoice } from "./invoice-sync";
import { ImagePreviewModal } from "./detail/ImagePreviewModal";
import { InvoiceSection } from "./detail/InvoiceSection";
import { SOPrintView } from "./detail/SOPrintView";
import { WorkflowPipeline } from "./detail/WorkflowPipeline";
import { ProductInfoCard } from "./detail/ProductInfoCard";
import { QcReportCard } from "./detail/QcReportCard";
import { ActionPanels } from "./detail/ActionPanels";
import { OrderInfoSidebar, QrCodeCard, OrderHistory } from "./detail/OrderInfoSidebar";
import {
  S, InfoRow, InfoCard, HeaderBtn,
} from "./detail/shared";

interface SODetailProps {
  orderId: string;
  onNavigate: (page: string, data?: unknown) => void;
  initialEditMode?: boolean;
}

export function SODetail({ orderId, onNavigate, initialEditMode }: SODetailProps) {
  const { salesOrders, customers, updateSalesOrder, updateCustomer, productCatalog } = useApp();
  const { invoices, payments } = useFinanceData(true, false, false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

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
  const isCustomBackend = order?.backendDesignStatus === "PendingDesign" || order?.backendDesignStatus === "RevisionRequired" || order?.partNumber?.startsWith("FG-") || false;
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
  }, [isEditMode]);

  const handleAction = async (action: string) => {
    if (!order) return;
    setIsSubmittingAction(true);

    try {
      if (action === 'deal') {
        updateSalesOrder(orderId, { status: 'Pending Design' });
      } else if (action === 'reject') {
        updateSalesOrder(orderId, { status: 'Rejected' });
      } else if (action === 'revise_price') {
        updateSalesOrder(orderId, { status: 'Waiting Pricing' });
      } else if (action === 'submit_price') {
        updateSalesOrder(orderId, { status: 'Waiting Client Approval', estimatedAmount: actionForm.estimatedAmount });
      } else if (action === 'assign_engineer') {
        updateSalesOrder(orderId, { assignedName: actionForm.engineerName });
        toast.success(`Tugas design berhasil di-assign ke ${actionForm.engineerName}`, {
          style: { background: '#0f172a', color: '#4ade80', border: '1px solid #166534' },
          duration: 3000
        });
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
        designReference: (item as any).designReference || "",
        customerDrawingUrl: (item as any).customerDrawingUrl || "",
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
      designReference: "",
      customerDrawingUrl: "",
    }];
  const orderValue = order.invoice?.amount || (() => {
    const hasUnitPrice = productLines.some(item => item.unitPrice > 0);
    return hasUnitPrice ? productLines.reduce((sum, item) => sum + item.lineTotal, 0) : order.estimatedAmount;
  })() || 0;

  return (
    <>
      <div className="print-hide" style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ===== Header ===== */}
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
                <span className="w-[5px] h-[5px] rounded-full shrink-0 bg-current" />
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

      {/* ===== Workflow Pipeline ===== */}
      <WorkflowPipeline order={order} />

      {/* ===== Rejected Banner ===== */}
      {order.status === "Rejected" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
          <p style={{ margin: 0, color: "#991B1B", fontSize: "13px" }}>Sales Order ini telah dibatalkan.</p>
        </div>
      )}

      {/* ===== Main Content Grid ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 14 }} className="detail-grid">

        {/* ===== Left Column ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

          {/* Customer Info */}
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

          {/* Product Info + BOM + Production Schedule */}
          <ProductInfoCard
            order={order}
            customer={customer}
            isEditMode={isEditMode}
            editForm={editForm}
            setEditForm={setEditForm}
            displayMaterials={displayMaterials}
            isCustomBackend={isCustomBackend}
            productLines={productLines}
            orderValue={orderValue}
          />

          {/* Invoice Section */}
          <InvoiceSection invoice={order.invoice} pendingPaymentProof={pendingPaymentProof} invoicePayments={invoicePayments} />

          {/* Edit Mode Save/Cancel */}
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

        {/* ===== Right Sidebar ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OrderInfoSidebar
            order={order}
            customer={customer}
            currentUserRole={currentUser?.role || ''}
            isEditMode={isEditMode}
            editForm={editForm}
            setEditForm={setEditForm}
            isDesignLocked={isDesignLocked}
          />

          <QcReportCard order={order} onPreviewPhoto={setPreviewPhoto} />

          <ActionPanels
            order={order}
            currentUserRole={currentUser?.role || ''}
            currentUserName={currentUser?.name || ''}
            actionForm={actionForm}
            setActionForm={setActionForm}
            handleAction={handleAction}
          />

          <QrCodeCard order={order} />
          <OrderHistory order={order} />
        </div>
      </div>
      </div>
      {previewPhoto && <ImagePreviewModal src={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
      <SOPrintView order={order} customer={customer} displayMaterials={displayMaterials} currentUser={currentUser} />
    </>
  );
}
