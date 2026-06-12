import React, { useState } from "react";
import { PlayCircle, CheckSquare, CalendarClock, Clock, AlertTriangle, Play, Users, Package, FileWarning, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SalesOrder, getStatusColor, formatSOStatus, type PurchasingUrgency } from "../components/data/mockData";

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
  const cfg = getStatusColor(status as any) || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {formatSOStatus(status)}
    </span>
  );
}

function AssignOperatorModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, users } = useApp();
  const [operatorId, setOperatorId] = useState("");

  const operators = users.filter(u => u.role === 'Engineering' && u.username !== 'eng_spv');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId) return;
    updateSalesOrder(so.id, {
      status: 'material_preparation',
      assignedTo: operatorId
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
  const { updateSalesOrder, addPurchasingRequest } = useApp();
  
  const [items, setItems] = useState([
    { id: 1, itemName: "", specification: "", quantity: 1, unit: "PCS", urgency: "Normal" as any, notes: "" }
  ]);
  
  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), itemName: "", specification: "", quantity: 1, unit: "PCS", urgency: "Normal" as any, notes: "" }]);
  };
  
  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };
  
  const handleChange = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(item => item.itemName.trim() && item.quantity > 0);
    if (validItems.length === 0) return;
    
    validItems.forEach(item => {
      addPurchasingRequest({
        soId: so.id,
        itemName: item.itemName,
        specification: item.specification,
        quantity: Number(item.quantity),
        unit: item.unit,
        urgency: item.urgency,
        notes: item.notes,
        status: 'Menunggu SPV'
      });
    });

    updateSalesOrder(so.id, { materialRequestStatus: 'requested', materialShortageDetected: true });
    alert(`Berhasil mengajukan ${validItems.length} permintaan material ke req pembelian.`);
    onClose();
  };

  const isFormValid = items.some(item => item.itemName.trim() !== "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 650, fontFamily: S.font, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Permintaan Material</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} &mdash; {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {items.map((item, index) => (
              <div key={item.id} style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: "13.5px", color: S.slate }}>Item Material {index + 1}</h4>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                      Hapus Item
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Nama Material <span style={{ color: "red" }}>*</span></label>
                      <input required value={item.itemName} onChange={e => handleChange(item.id, 'itemName', e.target.value)} placeholder="Contoh: Plat Besi" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
                    </div>
                    <div style={{ flex: 3 }}>
                      <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Spesifikasi</label>
                      <input value={item.specification} onChange={e => handleChange(item.id, 'specification', e.target.value)} placeholder="Contoh: SS304 Tebal 5mm" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Jumlah <span style={{ color: "red" }}>*</span></label>
                      <input required type="number" min="1" value={item.quantity} onChange={e => handleChange(item.id, 'quantity', e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Satuan</label>
                      <input value={item.unit} onChange={e => handleChange(item.id, 'unit', e.target.value)} placeholder="PCS / LBR" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", textTransform: "uppercase" }} />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Urgensi</label>
                      <select value={item.urgency} onChange={e => handleChange(item.id, 'urgency', e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", color: S.secondary, fontWeight: 500, marginBottom: 4 }}>Catatan (Opsional)</label>
                    <textarea value={item.notes} onChange={e => handleChange(item.id, 'notes', e.target.value)} rows={1} placeholder="Keterangan tambahan..." style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
                  </div>
                </div>
              </div>
            ))}
            
            <button type="button" onClick={handleAddItem} style={{ width: "100%", padding: "10px", background: "none", border: `1px dashed ${S.secondary}`, color: S.secondary, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              + Tambah Item Material
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!isFormValid} style={{ flex: 1, padding: "10px", background: "#C8102E", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: isFormValid ? 1 : 0.5 }}>
              Ajukan Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalesOrder(so.id, {
      status: 'in_production',
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
  const { updateSalesOrder } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalesOrder(so.id, { status: 'qc_check', endTime: new Date(endDate).toISOString() });
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
  const isSupervisor = currentUser?.isSupervisor || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [reqModal, setReqModal] = useState<SalesOrder | null>(null);

  // Lists
  const pendingAssignment = salesOrders.filter(so => so.status === 'pending_assignment');
  const materialPrep = salesOrders.filter(so => so.status === 'material_preparation' && (!so.assignedTo || so.assignedTo === currentUser?.id || isSupervisor));
  const inProduction = salesOrders.filter(so => so.status === 'in_production' && (!so.assignedTo || so.assignedTo === currentUser?.id || isSupervisor));
  const waitingQC = salesOrders.filter(so => so.status === 'qc_check');

  const [currentPageInProd, setCurrentPageInProd] = useState(1);
  const [currentPageWaitQC, setCurrentPageWaitQC] = useState(1);
  const itemsPerPage = 10;

    
  const approveMaterialRequest = (so: SalesOrder) => {
    updateSalesOrder(so.id, { materialRequestStatus: 'approved' });
    // Add to purchasing request automatically
    addPurchasingRequest({
      salesOrderId: so.id,
      items: [
        { id: "req-1", materialName: "Material Request for " + so.id, quantity: 1, reason: "Material Shortage" }
      ],
      status: 'Pending',
      totalEstimatedCost: 0
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
                </div>
                <button onClick={() => setAssignModal(so)}
                  style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
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
              const operator = users.find(u => u.id === so.assignedTo)?.name || "-";
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
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isSupervisor && so.materialRequestStatus === 'requested' && (
                      <button onClick={() => approveMaterialRequest(so)}
                        style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
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

      {/* In Production */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: S.cyan, borderRadius: "50%" }}></span>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Sedang Diproduksi ({inProduction.length})</span>
          </div>
        </div>

        {inProduction.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <Clock size={32} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada mesin yang sedang beroperasi</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {inProduction.slice((currentPageInProd - 1) * itemsPerPage, currentPageInProd * itemsPerPage).map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const elapsedHours = so.startTime ? Math.round((Date.now() - new Date(so.startTime).getTime()) / (1000 * 60 * 60)) : null;
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < inProduction.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(200,16,46,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                    <Clock size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.isRework && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#F3E8FF", color: "#7E22CE", borderRadius: 4, fontWeight: 500, border: "1px solid #D8B4FE" }}>Rework</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>{customer?.name}</span><span>·</span>
                      {so.startTime && <span>Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      {elapsedHours !== null && <><span>·</span><span style={{ color: S.cyan, fontWeight: 500 }}>{elapsedHours} jam berjalan</span></>}
                    </div>
                  </div>
                  {!isAdmin && (
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

        {/* Pagination Controls for In Production */}
        {inProduction.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPageInProd - 1) * itemsPerPage + 1}–{Math.min(currentPageInProd * itemsPerPage, inProduction.length)} dari {inProduction.length} hasil
            </span>
            
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPageInProd(p => Math.max(1, p - 1))} 
                disabled={currentPageInProd === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageInProd === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageInProd === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              
              {Array.from({ length: Math.ceil(inProduction.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPageInProd(p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minWidth: 28, height: 28, padding: "0 8px",
                    borderRadius: 8, border: "none",
                    background: p === currentPageInProd ? S.cyan : "transparent",
                    color: p === currentPageInProd ? "#FFFFFF" : "#475569",
                    fontSize: "13.5px", fontWeight: p === currentPageInProd ? 600 : 500,
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                >
                  {p}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPageInProd(p => Math.min(Math.ceil(inProduction.length / itemsPerPage), p + 1))} 
                disabled={currentPageInProd >= Math.ceil(inProduction.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageInProd >= Math.ceil(inProduction.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageInProd >= Math.ceil(inProduction.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menunggu QC */}
      <div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
            </div>
          </div>
          {waitingQC.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waitingQC.slice((currentPageWaitQC - 1) * itemsPerPage, currentPageWaitQC * itemsPerPage).map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", borderBottom: idx < waitingQC.length - 1 ? `1px solid ${S.border}` : "none", background: "#F8FAFC" }}>
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

          {/* Pagination Controls for Waiting QC */}
          {waitingQC.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
              <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                {(currentPageWaitQC - 1) * itemsPerPage + 1}–{Math.min(currentPageWaitQC * itemsPerPage, waitingQC.length)} dari {waitingQC.length} hasil
              </span>
              
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button 
                  onClick={() => setCurrentPageWaitQC(p => Math.max(1, p - 1))} 
                  disabled={currentPageWaitQC === 1}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageWaitQC === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageWaitQC === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={18} />
                </button>
                
                {Array.from({ length: Math.ceil(waitingQC.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPageWaitQC(p)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: 28, height: 28, padding: "0 8px",
                      borderRadius: 8, border: "none",
                      background: p === currentPageWaitQC ? S.cyan : "transparent",
                      color: p === currentPageWaitQC ? "#FFFFFF" : "#475569",
                      fontSize: "13.5px", fontWeight: p === currentPageWaitQC ? 600 : 500,
                      cursor: "pointer", transition: "all 0.1s"
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPageWaitQC(p => Math.min(Math.ceil(waitingQC.length / itemsPerPage), p + 1))} 
                  disabled={currentPageWaitQC >= Math.ceil(waitingQC.length / itemsPerPage)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageWaitQC >= Math.ceil(waitingQC.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageWaitQC >= Math.ceil(waitingQC.length / itemsPerPage) ? "not-allowed" : "pointer" }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      
      {assignModal && <AssignOperatorModal so={assignModal} onClose={() => setAssignModal(null)} />}
      {reqModal && <MaterialRequestModal so={reqModal} onClose={() => setReqModal(null)} />}
      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
    </div>
  );
}
