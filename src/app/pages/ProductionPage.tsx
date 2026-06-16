import React, { useState } from "react";
import { PlayCircle, CheckSquare, Clock, Users, Package, FileWarning, ExternalLink, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingUrgency, SalesOrder, getStatusColor } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";
import { purchasingApi } from "../services/purchasingApi";
import { salesApi } from "../services/salesApi";
import { isGuid, toBackendUserId } from "../services/backendIds";
import { useFinanceData } from "../components/finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../components/so/invoice-sync";

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

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  const labels: Record<string, string> = {
    waiting_dp: 'Menunggu DP',
    pending_assignment: 'Menunggu Penugasan',
    material_preparation: 'Persiapan Material',
    in_production: 'Sedang Diproduksi',
    qc_check: 'Proses QC',
    'Ready for Production': 'Siap Produksi',
    'In Production': 'Sedang Diproduksi',
    QC: 'Proses QC',
  };

  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {labels[status] || status}
    </span>
  );
}

function getDrawingUrl(so: SalesOrder) {
  return so.customerDrawingUrl || so.designLink || "";
}

function getBackendSalesOrderId(so: SalesOrder) {
  return so.backendId || so.id;
}

function DrawingLinks({ so }: { so: SalesOrder }) {
  const drawingUrl = getDrawingUrl(so);
  if (!drawingUrl) {
    return null;
  }

  return (
    <a
      href={drawingUrl}
      target="_blank"
      rel="noreferrer"
      onClick={event => event.stopPropagation()}
      style={{ color: S.cyan, fontSize: "12px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
    >
      <ExternalLink size={12} /> Gambar SO
    </a>
  );
}

function AssignOperatorModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { users, currentUser, refreshBackendData } = useApp();
  const [operatorId, setOperatorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operators = users.filter(u => u.role === 'Engineering Worker' || u.role === 'Engineering Supervisor');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId || isSubmitting) return;
    const operator = users.find(u => u.id === operatorId);
    const operatorBackendId = toBackendUserId(operator);
    const reviewer = users.find(user => user.role === "Engineering Supervisor") || currentUser || operator;
    const reviewerBackendId = toBackendUserId(reviewer);
    const salesOrderId = getBackendSalesOrderId(so);

    if (!operator || !operatorBackendId || !reviewer || !reviewerBackendId || !isGuid(salesOrderId)) {
      alert("Tidak bisa assign operator karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await salesApi.assignSalesOrderEngineers(salesOrderId, {
        productionWorker: { userId: operatorBackendId, name: operator.name },
        qcReviewer: { userId: reviewerBackendId, name: reviewer.name },
      });

      try {
        await salesApi.confirmSalesOrder(salesOrderId, toBackendUserId(currentUser) || reviewerBackendId);
      } catch (confirmError) {
        console.warn("Operator assigned, but SO confirmation is not ready yet.", confirmError);
      }

      await refreshBackendData();
      onClose();
    } catch (error) {
      console.warn("Failed to assign operator in backend.", error);
      alert("Gagal assign operator ke backend. Cek koneksi API atau data SO.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Tugaskan Operator</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Pilih Operator <span style={{ color: "#EF4444" }}>*</span></label>
            <select required value={operatorId} onChange={e => setOperatorId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}>
              <option value="" disabled>Pilih Operator...</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!operatorId || isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: operatorId && !isSubmitting ? "pointer" : "not-allowed", opacity: operatorId && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Menyimpan..." : "Konfirmasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialRequestModal({ so, onClose, onSubmitted }: { so: SalesOrder; onClose: () => void; onSubmitted: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState([
    {
      itemName: so.material || so.description || "",
      specification: so.spec || "",
      quantity: "1",
      unit: "PCS",
      urgency: "Urgent" as PurchasingUrgency,
      purchaseCategory: "Project",
    },
  ]);

  const updateItem = (index: number, key: keyof typeof items[number], value: string) => {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      itemName: "",
      specification: "",
      quantity: "1",
      unit: "PCS",
      urgency: "Normal",
      purchaseCategory: "Project",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const parsedItems = items.map(item => ({
    itemName: item.itemName.trim(),
    specification: item.specification.trim(),
    quantity: Number.parseInt(item.quantity, 10),
    unit: item.unit.trim() || "PCS",
    urgency: item.urgency,
    purchaseCategory: item.purchaseCategory,
  }));

  const canSubmit = parsedItems.every(item => item.itemName && Number.isFinite(item.quantity) && item.quantity > 0);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isSubmitting) return;

    // Priority order for requestedByUserId:
    // 1. currentUser.id if it's a real GUID (user logged in via backend JWT)
    // 2. productionWorkerUserId from the SO (the assigned backend worker's GUID)
    // 3. local assignedTo if it's a GUID
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const requesterId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId)) {
      alert("Tidak bisa mengajukan MR karena data backend SO belum lengkap.");
      return;
    }

    if (!requesterId) {
      alert("Tidak bisa mengajukan MR karena ID operator tidak ditemukan. Pastikan Anda login ulang.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.submitMaterialRequest(salesOrderId, {
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || so.assignedName || "Engineering Worker",
        notes: notes || null,
        items: parsedItems.map(item => ({
          materialRequirementId: null,
          salesOrderItemId: null,
          itemName: item.itemName,
          size: item.specification || null,
          qty: item.quantity,
          urgency: item.urgency,
          suggestedSupplier: null,
          notes: notes || null,
          purchaseCategory: item.purchaseCategory,
        })),
      });
      onSubmitted();
      await refreshBackendData();
      window.setTimeout(() => {
        void refreshBackendData();
      }, 1500);
      alert("MR diajukan ke Supervisor Produksi.");
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to submit production material request to backend.", error);
      // Try to extract backend error message
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg
        ? `Gagal mengajukan MR: ${backendMsg}`
        : "Gagal mengajukan MR ke backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Permintaan Material</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Isi daftar item untuk MR. Pengajuan ini memerlukan approval Supervisor sebelum diteruskan ke Purchasing.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item, index) => (
              <div key={index} style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 600 }}>Item #{index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} style={{ border: "none", background: "transparent", color: S.secondary, cursor: "pointer", display: "flex" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  value={item.itemName}
                  onChange={e => updateItem(index, "itemName", e.target.value)}
                  placeholder="Nama item / material"
                  required
                  style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                />
                <textarea
                  value={item.specification}
                  onChange={e => updateItem(index, "specification", e.target.value)}
                  placeholder="Spesifikasi / ukuran"
                  rows={2}
                  style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "none" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, "quantity", e.target.value)}
                    placeholder="Qty"
                    required
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <input
                    value={item.unit}
                    onChange={e => updateItem(index, "unit", e.target.value)}
                    placeholder="Unit"
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <select
                    value={item.urgency}
                    onChange={e => updateItem(index, "urgency", e.target.value)}
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", background: S.white }}
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Critical</option>
                  </select>
                </div>
                <select
                  value={item.purchaseCategory}
                  onChange={e => updateItem(index, "purchaseCategory", e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", background: S.white }}
                >
                  <option>Project</option>
                  <option>Consumable</option>
                  <option>Tools</option>
                  <option>Maintenance</option>
                  <option>Asset</option>
                </select>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ padding: "10px", border: `1px dashed ${S.border}`, background: S.white, color: S.secondary, borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Tambah Item
            </button>
          </div>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Catatan MR"
            rows={2}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!canSubmit || isSubmitting} style={{ flex: 1, padding: "10px", background: "#EAB308", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Mengajukan..." : "Ajukan MR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Tidak bisa mulai produksi karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.startProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering Worker",
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to start production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal mulai produksi: ${backendMsg}` : "Gagal mulai produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Mulai Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Tanggal & Waktu Mulai <span style={{ color: "#EF4444" }}>*</span></label>
            <input type="datetime-local" required value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.65 : 1 }}>
              <PlayCircle size={16} /> {isSubmitting ? "Menyimpan..." : "Konfirmasi Mulai"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Tidak bisa menyelesaikan produksi karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.finishProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering Worker",
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to finish production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal selesai produksi: ${backendMsg}` : "Gagal menyelesaikan produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Selesai Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Tanggal & Waktu Selesai <span style={{ color: "#EF4444" }}>*</span></label>
            <input type="datetime-local" required value={endDate} min={so.startTime ? so.startTime.slice(0, 16) : undefined} onChange={e => setEndDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, background: S.white, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.65 : 1 }}>
              <CheckSquare size={16} /> {isSubmitting ? "Menyimpan..." : "Selesai Produksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaginationControl({ currentPage, totalItems, itemsPerPage, onPageChange }: { currentPage: number, totalItems: number, itemsPerPage: number, onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems <= itemsPerPage) return null;
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
      <span style={{ fontSize: "13.5px", color: "#64748B" }}>
        {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} hasil
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
          disabled={currentPage === 1}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 28, height: 28, padding: "0 8px",
              borderRadius: 8, border: "none",
              background: p === currentPage ? S.cyan : "transparent",
              color: p === currentPage ? "#FFFFFF" : "#475569",
              fontSize: "13.5px", fontWeight: p === currentPage ? 600 : 500,
              cursor: "pointer", transition: "all 0.1s"
            }}
          >
            {p}
          </button>
        ))}
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
          disabled={currentPage >= totalPages}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= totalPages ? "#CBD5E1" : S.secondary, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export function ProductionPage() {
  const { salesOrders, currentUser, users, purchasingRequests, customers, refreshBackendData } = useApp();
  const { invoices } = useFinanceData(true);
  const mergedSalesOrders = salesOrders.map(so => mergeSalesOrderInvoice(so, invoices));

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const currentBackendUserId = toBackendUserId(currentUser);

  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [reqModal, setReqModal] = useState<SalesOrder | null>(null);
  const [localMaterialRequestSoIds, setLocalMaterialRequestSoIds] = useState<Set<string>>(() => new Set());

  // Pagination states
  const itemsPerPage = 5;
  const [pagePending, setPagePending] = useState(1);
  const [pageMaterialPrep, setPageMaterialPrep] = useState(1);
  const [pageInProd, setPageInProd] = useState(1);
  const [pageWaitQC, setPageWaitQC] = useState(1);

  // Lists
  const isAssignedToCurrentUser = (so: SalesOrder) => !so.assignedTo || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId || isSupervisor;
  const pendingAssignment = mergedSalesOrders.filter(so => so.status === 'Ready for Production' && !so.assignedTo);
  const materialPrep = mergedSalesOrders.filter(so => so.status === 'Ready for Production' && !!so.assignedTo && isAssignedToCurrentUser(so));
  const inProduction = mergedSalesOrders.filter(so => so.status === 'In Production' && isAssignedToCurrentUser(so));
  const waitingQC = mergedSalesOrders.filter(so => so.status === 'QC');

  const getMaterialRequest = (so: SalesOrder) => {
    const backendId = getBackendSalesOrderId(so);
    return purchasingRequests.find(request =>
      request.salesOrderId === backendId ||
      request.salesOrderId === so.backendId ||
      request.soId === so.id ||
      request.soId === so.soNumber,
    );
  };

  const rememberMaterialRequest = (so: SalesOrder) => {
    const keys = [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)].filter(Boolean) as string[];
    setLocalMaterialRequestSoIds(prev => {
      const next = new Set(prev);
      keys.forEach(key => next.add(key));
      return next;
    });
  };

  const hasLocalMaterialRequest = (so: SalesOrder) =>
    [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)]
      .filter(Boolean)
      .some(key => localMaterialRequestSoIds.has(key as string));

  const getMaterialRequestState = (so: SalesOrder): 'none' | 'requested' | 'finance_pending' | 'approved' | 'completed' | 'rejected' => {
    const request = getMaterialRequest(so);
    if (!request) return hasLocalMaterialRequest(so) ? 'requested' : 'none';
    if (request.backendStatus === 'SupervisorRejected' || request.backendStatus === 'FinanceRejected' || request.backendStatus === 'Rejected') return 'rejected';
    if (request.backendStatus === 'Completed') return 'completed';
    if (request.backendStatus === 'SupervisorApproved' || request.backendStatus === 'Processing' || request.backendStatus === 'FinanceApproved') return 'approved';
    if (request.status === 'Ditolak') return 'rejected';
    if (request.status === 'Selesai') return 'completed';
    if (request.status === 'Diproses') return 'approved';
    return 'requested';
  };

  const approveMaterialRequest = async (so: SalesOrder) => {
    const request = getMaterialRequest(so);
    const reviewerId = toBackendUserId(currentUser);

    if (!request?.backendId || !reviewerId) {
      alert("MR belum punya data backend lengkap untuk approval.");
      return;
    }

    if (request.backendStatus && request.backendStatus !== 'Submitted') {
      await refreshBackendData();
      if (request.backendStatus === 'SupervisorApproved') {
        alert("MR sudah disetujui Supervisor dan diteruskan ke Purchasing.");
        return;
      }
      if (request.backendStatus === 'FinanceApproved' || request.backendStatus === 'Processing' || request.backendStatus === 'Completed') {
        alert("MR sudah diteruskan ke Purchasing.");
        return;
      }
      alert("MR tidak bisa di-approve pada status saat ini.");
      return;
    }

    try {
      await purchasingApi.supervisorReviewPurchaseRequest(request.backendId, {
        reviewedByUserId: reviewerId,
        decision: 'Accept',
      });
      await refreshBackendData();
      alert("Permintaan disetujui dan diteruskan ke Purchasing.");
    } catch (error) {
      console.warn("Failed to approve MR in backend.", error);
      alert("Gagal approve MR di backend. Cek koneksi API atau status MR.");
    }
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0, fontSize: "20px", fontWeight: 600 }}>Dasbor Produksi</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 4 }}>
            Kelola penugasan mesin, persiapan material, dan proses produksi berjalan
          </p>
        </div>
      </div>

      {/* 1. Menunggu Penugasan (Supervisor Only) */}
      {isSupervisor && pendingAssignment.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Menunggu Penugasan Operator ({pendingAssignment.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).map((so, idx) => (
              <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                    <StatusBadge status={so.status} />
                  </div>
                  <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                  <DrawingLinks so={so} />
                </div>
                <button onClick={() => setAssignModal(so)}
                  style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                  Tugaskan Operator
                </button>
              </div>
            ))}
          </div>
          <PaginationControl currentPage={pagePending} totalItems={pendingAssignment.length} itemsPerPage={itemsPerPage} onPageChange={setPagePending} />
        </div>
      )}

      {/* 2. Persiapan Material */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Persiapan Material ({materialPrep.length})</span>
          </div>
        </div>
        {materialPrep.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada persiapan material</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              const mrState = getMaterialRequestState(so);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>Operator: <strong>{operator}</strong></span>
                      <DrawingLinks so={so} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isSupervisor && mrState === 'requested' && (
                      <button onClick={() => approveMaterialRequest(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Approve Request
                      </button>
                    )}
                    {mrState === 'none' && !isSupervisor && (
                      <button onClick={() => setReqModal(so)}
                        style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {!isSupervisor && (mrState === 'none' || mrState === 'completed') && (
                      <button onClick={() => setStartModal(so)}
                        style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <PlayCircle size={14} /> Mulai Produksi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageMaterialPrep} totalItems={materialPrep.length} itemsPerPage={itemsPerPage} onPageChange={setPageMaterialPrep} />
      </div>

      {/* 3. In Production */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Sedang Diproduksi ({inProduction.length})</span>
          </div>
        </div>
        {inProduction.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang sedang beroperasi</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>Operator: <strong>{operator}</strong></span>
                      {so.startTime && <span>· Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      <DrawingLinks so={so} />
                    </div>
                  </div>
                  {!isSupervisor && (
                    <button onClick={() => setCompleteModal(so)}
                      style={{ padding: "8px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckSquare size={14} /> Selesai Produksi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageInProd} totalItems={inProduction.length} itemsPerPage={itemsPerPage} onPageChange={setPageInProd} />
      </div>

      {/* 4. Menunggu QC */}
      <div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
            </div>
          </div>
          {waitingQC.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).map((so, idx) => {
                const customer = customers.find(c => c.code === so.customerId);
                return (
                  <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", borderBottom: idx < waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none", background: "#F8FAFC" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                      </div>
                      <p style={{ fontSize: "12.5px", color: S.secondary, margin: 0 }}>{customer?.name} · {so.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationControl currentPage={pageWaitQC} totalItems={waitingQC.length} itemsPerPage={itemsPerPage} onPageChange={setPageWaitQC} />
        </div>
      </div>

      {assignModal && <AssignOperatorModal so={assignModal} onClose={() => setAssignModal(null)} />}
      {reqModal && (
        <MaterialRequestModal
          so={reqModal}
          onClose={() => setReqModal(null)}
          onSubmitted={() => rememberMaterialRequest(reqModal)}
        />
      )}
      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
    </div>
  );
}
