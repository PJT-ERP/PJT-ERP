import React, { useState } from "react";
import { PlayCircle, CheckSquare, Clock, Users, Package, FileWarning, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingUrgency, SalesOrder, getStatusColor } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";

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

function isGuid(value?: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
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
  const { updateSalesOrder, users } = useApp();
  const [operatorId, setOperatorId] = useState("");

  const operators = users.filter(u => u.role === 'Engineering' && u.username !== 'eng_spv');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId) return;
    const operator = users.find(u => u.id === operatorId);
    updateSalesOrder(so.id, {
      status: 'Ready for Production',
      assignedTo: operatorId,
      assignedName: operator?.name,
    });
    onClose();
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
            <button type="submit" disabled={!operatorId} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: operatorId ? 1 : 0.5 }}>
              Konfirmasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialRequestModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, addPurchasingRequest, currentUser } = useApp();
  const [notes, setNotes] = useState("");
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

    const requesterId = isGuid(currentUser?.id)
      ? currentUser.id
      : isGuid(so.assignedTo)
        ? so.assignedTo
        : "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (isGuid(salesOrderId) && requesterId) {
      try {
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
      } catch (error) {
        console.warn("Failed to submit production material request to backend.", error);
        alert("Gagal mengajukan MR ke backend. Cek koneksi API atau data operator.");
        return;
      }
    }

    updateSalesOrder(so.id, { materialRequestStatus: 'requested', materialShortageDetected: true });
    addPurchasingRequest({
      soId: so.id,
      itemName: parsedItems.length === 1 ? parsedItems[0].itemName : `${parsedItems.length} item material`,
      specification: parsedItems.length === 1 ? parsedItems[0].specification : parsedItems.map(item => item.itemName).join(", "),
      quantity: parsedItems[0].quantity,
      unit: parsedItems[0].unit,
      items: parsedItems,
      urgency: parsedItems.some(item => item.urgency === "Critical") ? "Critical" : parsedItems.some(item => item.urgency === "Urgent") ? "Urgent" : "Normal",
      notes: notes || `MR dari ${so.id}`,
      status: 'Pending',
    });
    alert("MR diajukan ke Supervisor Produksi.");
    onClose();
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
            <button type="submit" disabled={!canSubmit} style={{ flex: 1, padding: "10px", background: "#EAB308", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canSubmit ? "pointer" : "not-allowed", opacity: canSubmit ? 1 : 0.5 }}>
              Ajukan MR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, currentUser } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(today);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerUserId = isGuid(currentUser?.id)
      ? currentUser.id
      : isGuid(so.assignedTo)
        ? so.assignedTo
        : "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (isGuid(salesOrderId) && workerUserId) {
      try {
        await productionApi.startProduction(salesOrderId, {
          workerUserId,
          workerName: currentUser?.name || so.assignedName || "Engineering Worker",
        });
      } catch (error) {
        console.warn("Failed to start production in backend.", error);
        alert("Gagal mulai produksi di backend. Cek koneksi API atau data operator.");
        return;
      }
    }

    updateSalesOrder(so.id, {
      status: 'In Production',
      startTime: new Date(startDate).toISOString(),
    });
    onClose();
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
            <button type="submit" style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <PlayCircle size={16} /> Konfirmasi Mulai
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, currentUser } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerUserId = isGuid(currentUser?.id)
      ? currentUser.id
      : isGuid(so.assignedTo)
        ? so.assignedTo
        : "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (isGuid(salesOrderId) && workerUserId) {
      try {
        await productionApi.finishProduction(salesOrderId, {
          workerUserId,
          workerName: currentUser?.name || so.assignedName || "Engineering Worker",
        });
      } catch (error) {
        console.warn("Failed to finish production in backend.", error);
        alert("Gagal menyelesaikan produksi di backend. Cek koneksi API atau data operator.");
        return;
      }
    }

    updateSalesOrder(so.id, { status: 'QC', endTime: new Date(endDate).toISOString() });
    onClose();
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
            <button type="submit" style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CheckSquare size={16} /> Selesai Produksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductionPage() {
  const { salesOrders, customers, currentUser, users, updateSalesOrder, addPurchasingRequest } = useApp();
  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [reqModal, setReqModal] = useState<SalesOrder | null>(null);

  // Lists
  const isAssignedToCurrentUser = (so: SalesOrder) => !so.assignedTo || so.assignedTo === currentUser?.id || isSupervisor;
  const pendingAssignment = salesOrders.filter(so => so.status === 'Ready for Production' && !so.assignedTo);
  const materialPrep = salesOrders.filter(so => so.status === 'Ready for Production' && !!so.assignedTo && isAssignedToCurrentUser(so));
  const inProduction = salesOrders.filter(so => so.status === 'In Production' && isAssignedToCurrentUser(so));
  const waitingQC = salesOrders.filter(so => so.status === 'QC');

  const approveMaterialRequest = (so: SalesOrder) => {
    updateSalesOrder(so.id, { materialRequestStatus: 'approved' });
    // Add to purchasing request automatically
    addPurchasingRequest({
      soId: so.id,
      itemName: `MR ${so.id}`,
      specification: "Material shortage",
      quantity: 1,
      unit: "LOT",
      items: [
        { itemName: `MR ${so.id}`, specification: "Material shortage", quantity: 1, unit: "LOT" }
      ],
      urgency: 'Urgent',
      notes: "Approved by Engineering Supervisor",
      status: 'Pending',
    });
    alert("Permintaan disetujui dan diteruskan ke Purchasing.");
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
            {pendingAssignment.map((so, idx) => (
              <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < pendingAssignment.length - 1 ? `1px solid ${S.border}` : "none" }}>
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
            {materialPrep.map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < materialPrep.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.materialRequestStatus === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>Material Requested</span>}
                      {so.materialRequestStatus === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>Material Purchasing</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>Operator: <strong>{operator}</strong></span>
                      <DrawingLinks so={so} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isSupervisor && so.materialRequestStatus === 'requested' && (
                      <button onClick={() => approveMaterialRequest(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Approve Request
                      </button>
                    )}
                    {(!so.materialRequestStatus || so.materialRequestStatus === 'none') && !isSupervisor && (
                      <button onClick={() => setReqModal(so)}
                        style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {!isSupervisor && (so.materialRequestStatus === 'none' || !so.materialRequestStatus) && (
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
            {inProduction.map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < inProduction.length - 1 ? `1px solid ${S.border}` : "none" }}>
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
      </div>

      {assignModal && <AssignOperatorModal so={assignModal} onClose={() => setAssignModal(null)} />}
      {reqModal && <MaterialRequestModal so={reqModal} onClose={() => setReqModal(null)} />}
      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
    </div>
  );
}
