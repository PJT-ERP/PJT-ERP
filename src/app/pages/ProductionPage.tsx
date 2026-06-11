import React, { useState } from "react";
import {
  PlayCircle,
  CheckSquare,
  CalendarClock,
  Clock,
  AlertTriangle,
  Play,
  Users,
  Package,
  FileWarning } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SalesOrder,
  getStatusColor
} from "../components/data/mockData";

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
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status === 'waiting_dp' ? 'Menunggu DP' : 
       status === 'pending_assignment' ? 'Menunggu Penugasan' : 
       status === 'material_preparation' ? 'Persiapan Material' : 
       status === 'in_production' ? 'Sedang Diproduksi' : 
       status === 'qc_check' ? 'Proses QC' : 
       status}
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
  const { updateSalesOrder } = useApp();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Move to material requested state, so Supervisor needs to approve
    updateSalesOrder(so.id, { materialRequestStatus: 'requested', materialShortageDetected: true });
    alert("Permintaan material diajukan ke Supervisor Produksi.");
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
          <p style={{ fontSize: "13.5px", color: S.slate }}>Apakah Anda yakin ingin mengajukan permintaan material (kekurangan bahan)? Pengajuan ini memerlukan persetujuan Supervisor sebelum diteruskan ke Purchasing.</p>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" style={{ flex: 1, padding: "10px", background: "#EAB308", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
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
  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [reqModal, setReqModal] = useState<SalesOrder | null>(null);

  // Lists
  const pendingAssignment = salesOrders.filter(so => so.status === 'pending_assignment');
  const materialPrep = salesOrders.filter(so => so.status === 'material_preparation' && (!so.assignedTo || so.assignedTo === currentUser?.id || isSupervisor));
  const inProduction = salesOrders.filter(so => so.status === 'in_production' && (!so.assignedTo || so.assignedTo === currentUser?.id || isSupervisor));
  const waitingQC = salesOrders.filter(so => so.status === 'qc_check');

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
              const operator = users.find(u => u.id === so.assignedTo)?.name || "-";
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
