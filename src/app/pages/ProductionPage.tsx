import React, { useState } from "react";
import { PlayCircle, CheckSquare, CalendarClock, Clock, AlertTriangle, Play } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, SOStatus, getStatusColor } from "../components/data/mockData";

const S = {
  font: "Inter, sans-serif",
  navy: "#0F172A",
  cyan: "#06B6D4",
  slate: "#1E293B",
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
      {status}
    </span>
  );
}

function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const today = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(today);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalesOrder(so.id, {
      status: 'In Production',
      startTime: new Date(startDate).toISOString(),
    });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: "#E0F2FE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <PlayCircle size={32} style={{ color: S.cyan }} />
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>Produksi Dimulai!</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 4px" }}>{so.id}</p>
        <p style={{ color: S.secondary, fontSize: "12px", margin: "0 0 24px" }}>
          Mulai: {new Date(startDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Mulai Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: S.bg, borderRadius: 8, padding: 12, fontSize: "13.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customer?.name}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Item</span><span style={{ color: S.slate, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{so.description}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Quantity</span><span style={{ color: S.slate, fontWeight: 500 }}>{so.quantity} {so.unit}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Deadline</span><span style={{ color: S.slate, fontWeight: 500 }}>{so.deadline}</span></div>
          </div>
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
  const { updateSalesOrder, customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);
  const [lateReason, setLateReason] = useState('');
  const [done, setDone] = useState(false);

  const endDateOnly = endDate.split('T')[0];
  const isLate = endDateOnly > so.deadline;
  const durationHours = so.startTime ? Math.round((new Date(endDate).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60)) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLate && !lateReason.trim()) return;
    updateSalesOrder(so.id, { status: 'QC', endTime: new Date(endDate).toISOString(), lateReason: isLate ? lateReason : undefined });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckSquare size={32} style={{ color: "#22C55E" }} />
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>Produksi Selesai!</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 8px" }}>{so.id} — siap untuk Quality Control</p>
        {durationHours !== null && <p style={{ color: S.secondary, fontSize: "12px", margin: "0 0 16px" }}>Total durasi: {durationHours} jam</p>}
        {isLate && <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}><p style={{ margin: 0, fontSize: "12px", color: "#B45309" }}>⚠️ Selesai terlambat dari deadline ({so.deadline})</p></div>}
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Tutup</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Selesai Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "80vh", overflowY: "auto" }}>
          <div style={{ background: S.bg, borderRadius: 8, padding: 12, fontSize: "13.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customer?.name}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Item</span><span style={{ color: S.slate, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{so.description}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: S.secondary }}>Deadline</span><span style={{ color: S.slate, fontWeight: 500 }}>{so.deadline}</span></div>
            {so.startTime && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Waktu Mulai</span><span style={{ color: S.slate, fontWeight: 500 }}>{new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>}
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Tanggal & Waktu Selesai <span style={{ color: "#EF4444" }}>*</span></label>
            <input type="datetime-local" required value={endDate} min={so.startTime ? so.startTime.slice(0, 16) : undefined} onChange={e => setEndDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${isLate ? '#FBBF24' : S.border}`, background: isLate ? '#FEF3C7' : S.white, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
            {durationHours !== null && endDate && <p style={{ fontSize: "12px", color: S.secondary, margin: "4px 0 0" }}>Durasi: <strong style={{ color: S.slate }}>{durationHours} jam</strong></p>}
          </div>
          {isLate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px" }}>
                <AlertTriangle size={16} style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: "13px", color: "#991B1B" }}>Tanggal selesai melewati deadline <strong>{so.deadline}</strong>. Wajib isi alasan keterlambatan.</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Alasan Keterlambatan <span style={{ color: "#EF4444" }}>*</span></label>
                <textarea required={isLate} value={lateReason} onChange={e => setLateReason(e.target.value)} rows={3} placeholder="Jelaskan penyebab keterlambatan..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5", background: "#FEF2F2", borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isLate && !lateReason.trim()} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (isLate && !lateReason.trim()) ? 0.5 : 1 }}>
              <CheckSquare size={16} /> Konfirmasi Selesai
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductionPage() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = ['Admin', 'Owner'].includes(currentUser?.role || '');

  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);

  const readyForProduction = salesOrders.filter(so => so.status === 'Ready for Production');
  const inProduction = salesOrders.filter(so => so.status === 'In Production');
  const waitingQC = salesOrders.filter(so => so.status === 'QC');

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Pantau Mesin Produksi</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Pantau dan kelola jadwal mesin serta status pengerjaan produk
          </p>
        </div>
      </div>

      {/* Ready for Production */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarClock size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Siap Produksi ({readyForProduction.length})</span>
          </div>
        </div>

        {readyForProduction.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <CalendarClock size={32} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada antrian produksi</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {readyForProduction.map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const isOverdue = so.deadline < new Date().toISOString().split('T')[0];
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < readyForProduction.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(6,182,212,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                    <Play size={20} style={{ marginLeft: 2 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.isRework && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#F3E8FF", color: "#7E22CE", borderRadius: 4, fontWeight: 500, border: "1px solid #D8B4FE" }}>Rework</span>}
                      {isOverdue && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} /> Terlambat</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>{customer?.name}</span><span>·</span><span>{so.quantity} {so.unit}</span><span>·</span><span style={{ color: isOverdue ? "#DC2626" : S.secondary }}>Deadline: {so.deadline}</span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <button onClick={() => setStartModal(so)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <PlayCircle size={14} /> {so.isRework ? 'Lanjut Produksi' : 'Mulai Produksi'}
                    </button>
                  )}
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
            {inProduction.map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const elapsedHours = so.startTime ? Math.round((Date.now() - new Date(so.startTime).getTime()) / (1000 * 60 * 60)) : null;
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < inProduction.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(6,182,212,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
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
      </div>

      {/* Menunggu QC */}
      {waitingQC.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waitingQC.map((so, idx) => {
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
        </div>
      )}

      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
    </div>
  );
}
