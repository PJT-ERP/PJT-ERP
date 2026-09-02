import React, { useState } from "react";
import {
  ChevronLeft,
  User, Building2, Phone, Mail, MapPin,
  AlertTriangle,
  Edit, Copy, Printer, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../components/context/AppContext";
import { useSalesOrdersQuery, useCustomersQuery, useUpdateCustomerMutation, useUpdateSalesOrderMutation, useDeleteSalesOrderMutation, useProductsQuery } from "../../services/queries";
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
import { SalesOrderComments } from "./components/SalesOrderComments";
import {
  S, InfoRow, InfoCard, HeaderBtn,
} from "./detail/shared";

interface SODetailProps {
  orderId: string;
  onNavigate: (page: string, data?: unknown) => void;
  initialEditMode?: boolean;
}

export function SODetail({ orderId, onNavigate, initialEditMode }: SODetailProps) {
  const { currentUser } = useApp();
  const { data: productCatalog = [] } = useProductsQuery();
  const { data: salesOrders = [], isLoading: isLoadingOrders } = useSalesOrdersQuery();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  
  const updateSalesOrderMutation = useUpdateSalesOrderMutation();
  const deleteSalesOrderMutation = useDeleteSalesOrderMutation();
  const updateCustomerMutation = useUpdateCustomerMutation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const updateSalesOrder = (id: string, data: any) => updateSalesOrderMutation.mutate({ id, data });
  const updateCustomer = (code: string, data: any) => updateCustomerMutation.mutate({ code, data });

  const { currentUser: appUser } = useApp();
  const isSalesOrHigher = appUser?.role === 'Sales' || appUser?.role === 'Finance' || appUser?.role === 'Admin' || appUser?.role === 'Owner';
  const { invoices, payments } = useFinanceData(isSalesOrHigher, false, false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const baseOrder = salesOrders.find(o => o.id === orderId || o.soNumber === orderId);
  const targetId = baseOrder?.backendId || baseOrder?.id || orderId;
  const order = baseOrder ? mergeSalesOrderInvoice(baseOrder, invoices, payments) : undefined;
  const customer = customers.find(c => c.code === order?.customerId);
  const pendingPaymentProof = !!order?.invoice?.invoiceId
    && payments.some(payment => payment.invoiceId === order.invoice?.invoiceId && payment.status === "PENDING");
  const invoicePayments = order?.invoice?.invoiceId
    ? payments.filter(payment => payment.invoiceId === order.invoice?.invoiceId)
    : [];

  const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
  // eslint-disable-next-line unused-imports/no-unused-vars
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const isDesignLocked = ["In Production", "QC", "Ready for Delivery", "Delivered", "Completed", "Finished", "Cancelled"].includes(order?.status || "");
  const isCustomBackend = order?.backendDesignStatus === "PendingDesign" || order?.backendDesignStatus === "RevisionRequired" || order?.partNumber?.startsWith("FG-") || false;
  const isStandard = !isCustomBackend;

  let displayMaterials = order?.materials || [];
  if (isStandard && productCatalog && order) {
    const matchedProduct = productCatalog.find(p => p.partNumber === order.partNumber || p.description === order.description);
    if (matchedProduct && matchedProduct.materialSpec) {
      displayMaterials = matchedProduct.materialSpec.split(/ \/ | and | \+ /).map((specPart, idx) => {
        const bomItem = matchedProduct.bomItems?.[idx];
        return {
          id: `${matchedProduct.partNumber || matchedProduct.id}-mat-${idx}`,
          name: bomItem?.inventoryItemName || `MAT-${String(parseInt(matchedProduct.partNumber?.split('-')[1] || "0") + idx).padStart(4, '0')} - ${specPart.trim().split(' ')[0]}`,
          code: bomItem?.inventoryItemCode || null,
          spec: specPart.trim(),
          quantity: bomItem?.quantity || 1,
          unit: matchedProduct.unit?.toLowerCase() || "pcs",
        };
      });
    }
  }

  displayMaterials = displayMaterials.map((mat: any) => {
    let code = mat.code;
    let name = mat.name;
    if (!code || code.length > 20) {
      const invId = mat.inventoryItemId || (mat.id && mat.id.length > 20 ? mat.id : null);
      const matchedProduct = productCatalog.find(p => p.bomItems?.some(b => b.inventoryItemId === invId));
      if (matchedProduct) {
        const bomItem = matchedProduct.bomItems?.find(b => b.inventoryItemId === invId);
        code = bomItem?.inventoryItemCode || null;
      }
    }
    if (!code && name) {
      const embeddedMatch = name.match(/^([A-Z]+-\d+)/);
      if (embeddedMatch) code = embeddedMatch[1];
    }
    if (code && name) {
      const codePrefix = `${code} - `;
      if (name.startsWith(codePrefix)) name = name.slice(codePrefix.length);
    }
    const finalInvId = mat.inventoryItemId || (mat.id && mat.id.length > 20 ? mat.id : null);
    return { ...mat, code: code || finalInvId || null, name };
  });

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
        updateSalesOrder(targetId, { status: 'Pending Design' });
      } else if (action === 'reject') {
        updateSalesOrder(targetId, { status: 'Rejected' });
      } else if (action === 'revise_price') {
        updateSalesOrder(targetId, { status: 'Waiting Pricing' });
      } else if (action === 'submit_price') {
        updateSalesOrder(targetId, { status: 'Waiting Client Approval', estimatedAmount: actionForm.estimatedAmount });
      } else if (action === 'assign_engineer') {
        updateSalesOrder(targetId, { assignedName: actionForm.engineerName });
        toast.success(`Tugas design berhasil di-assign ke ${actionForm.engineerName}`, {
          style: { background: '#0f172a', color: '#4ade80', border: '1px solid #166534' },
          duration: 3000
        });
      } else if (action === 'upload_design') {
        updateSalesOrder(targetId, { status: 'Waiting Spv Approval', designLink: actionForm.designUrl });
      } else if (action === 'approve_design') {
        updateSalesOrder(targetId, { status: 'Waiting Pricing', backendDesignStatus: 'Approved' });
      } else if (action === 'reject_design') {
        updateSalesOrder(targetId, { status: 'Pending Design' });
      } else if (action === 'force_complete') {
        updateSalesOrder(targetId, { status: 'Completed' });
        toast.success('Sales Order ditandai sebagai Selesai.', {
          style: { background: '#0f172a', color: '#4ade80', border: '1px solid #166534' },
          duration: 3000
        });
      } else if (action === 'send_to_qc') {
        updateSalesOrder(targetId, { status: 'QC' });
        toast.success('Sales Order dikirim ke QC untuk pengecekan.', {
          style: { background: '#0f172a', color: '#93c5fd', border: '1px solid #1e40af' },
          duration: 3000
        });
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDeleteSO = () => {
    deleteSalesOrderMutation.mutate(orderId, {
      onSuccess: () => {
        toast.success(`Sales Order ${orderId} berhasil dihapus.`, {
          style: { background: '#0f172a', color: '#4ade80', border: '1px solid #166534' },
        });
        onNavigate("so-list");
      },
      onError: (err: any) => {
        toast.error(`Gagal menghapus SO: ${err?.response?.data?.message || err.message}`);
      }
    });
  };

  const handleSave = () => {
    if (!order) return;

    const isQtyChanged = Number(editForm.quantity) !== Number(order.quantity);
    const isLockedForQty = ['Waiting Payment', 'Ready for Production', 'In Production', 'QC', 'Completed', 'Finished'].includes(order.status) || order.isCostingCompleted;

    if (isQtyChanged && isLockedForQty) {
      toast.error("Kuantitas item tidak dapat diubah setelah Sales Order masuk ke tahap pembayaran atau produksi.", {
        style: { background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b' },
        duration: 4000
      });
      return;
    }

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

      updateSalesOrder(targetId, {
        description: editForm.description,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        deadline: editForm.deadline,
        notes: editForm.notes,
        customerDrawingUrl: finalUrl,
        designRevisions: newRevisions,
      });
    } else {
      updateSalesOrder(targetId, {
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

  if (isLoadingOrders || isLoadingCustomers) {
    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="animate-pulse" style={{ height: 40, width: "30%", background: "#f1f5f9", borderRadius: 6 }} />
        <div className="animate-pulse" style={{ height: 100, width: "100%", background: "#f1f5f9", borderRadius: 6 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 14 }}>
          <div className="animate-pulse" style={{ height: 300, background: "#f1f5f9", borderRadius: 6 }} />
          <div className="animate-pulse" style={{ height: 300, background: "#f1f5f9", borderRadius: 6 }} />
        </div>
      </div>
    );
  }

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
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          <HeaderBtn icon={<Printer size={13} />} label="Cetak" onClick={() => {
            const originalTitle = document.title;
            document.title = order.id;
            window.print();
            document.title = originalTitle;
          }} />
          {currentUser?.role === 'Sales' && (
            <>
              <HeaderBtn icon={<Copy size={13} />} label="Duplikat" onClick={() => onNavigate("so-create", { customerId: order.customerId, orderType: "repeat", soId: order.id })} />
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: "7px 14px", borderRadius: 6, border: "none",
                      background: "linear-gradient(135deg, #EF4444 0%, #C8102E 100%)",
                      color: "#fff", fontWeight: 600, fontSize: "12.5px", cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(200, 16, 46, 0.25)"
                    }}
                  >
                    Simpan Perubahan
                  </button>
                  <HeaderBtn icon={<Edit size={13} />} label="Batal" onClick={() => setIsEditMode(false)} />
                </>
              ) : (
                <HeaderBtn icon={<Edit size={13} />} label="Edit" onClick={() => setIsEditMode(true)} primary />
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Hapus Sales Order"
                style={{
                  padding: "7px 14px", borderRadius: 6, border: "1px solid #FECACA",
                  background: "#FEF2F2", color: "#EF4444", fontWeight: 600, fontSize: "12.5px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s"
                }}
              >
                <Trash2 size={13} />
                <span>Hapus SO</span>
              </button>
            </>
          )}
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
          
          {/* Comments Section */}
          <SalesOrderComments salesOrderId={targetId} comments={order.comments} />
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

      {/* ===== Delete SO Modal ===== */}
      {showDeleteModal && (
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
              Apakah Anda yakin ingin menghapus <strong>{order.id}</strong> secara permanen? Data yang sudah dihapus tidak dapat dikembalikan lagi.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteSalesOrderMutation.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${S.border}`, background: "#fff", color: S.slate, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSO}
                disabled={deleteSalesOrderMutation.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#EF4444", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
              >
                {deleteSalesOrderMutation.isPending ? "Menghapus..." : "Ya, Hapus SO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
