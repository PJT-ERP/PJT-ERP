import React, { useState } from "react";
import { CheckCircle, XCircle, ExternalLink, Clock, RotateCcw, Search, FileText } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, SOStatus, getStatusColor } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";
import { toBackendUserId } from "../services/backendIds";

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
      {status}
    </span>
  );
}

type RejectType = 'revision' | 'permanent';

function ApprovalModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers, currentUser } = useApp();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectType, setRejectType] = useState<RejectType>('revision');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customer = customers.find(c => c.code === so.customerId);

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      if (so.backendId) {
        await productionApi.updateSalesOrderDesignStatus(so.backendId, {
          designStatus: 'Approved',
          reviewedByUserId: toBackendUserId(currentUser) || null,
          reviewerName: currentUser?.name
        });
      }
      updateSalesOrder(so.id, {
        status: 'Ready for Production',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.id,
      });
      setAction('approve');
      setDone(true);
    } catch (e) {
      console.error(e);
      alert('Gagal menyetujui desain di backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    try {
      setIsSubmitting(true);
      if (so.backendId) {
        await productionApi.updateSalesOrderDesignStatus(so.backendId, {
          designStatus: rejectType === 'revision' ? 'RevisionRequired' : 'Rejected',
          reviewedByUserId: toBackendUserId(currentUser) || null,
          reviewerName: currentUser?.name
        });
      }
      updateSalesOrder(so.id, {
        status: rejectType === 'revision' ? 'Revision Required' : 'Rejected',
        rejectionReason: reason,
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      alert('Gagal menolak desain di backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: action === 'approve' ? "#DCFCE7" : (rejectType === 'revision' ? "#FFE4E6" : "#FEE2E2"), borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {action === 'approve' ? <CheckCircle size={32} style={{ color: "#22C55E" }} /> : (rejectType === 'revision' ? <RotateCcw size={32} style={{ color: "#F43F5E" }} /> : <XCircle size={32} style={{ color: "#EF4444" }} />)}
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
          {action === 'approve' ? 'Desain Disetujui!' : (rejectType === 'revision' ? 'Revisi Diminta' : 'Desain Ditolak Permanen')}
        </h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {action === 'approve' ? 'SO dilanjutkan ke produksi.' : (rejectType === 'revision' ? 'SO dikembalikan ke tim Engineering.' : 'SO dibatalkan dan tidak diproses lebih lanjut.')}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Selesai</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Review Desain — {so.id}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.partNumber} · {so.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* SO Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "13.5px" }}>
            <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p></div>
            <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Quantity</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{so.quantity} {so.unit}</p></div>
            <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Deadline</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{so.deadline}</p></div>
            {so.submittedAt && (
              <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Dikirim Oleh</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{new Date(so.submittedAt).toLocaleDateString('id-ID')}</p></div>
            )}
            {so.designLink && (
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Link Desain</p>
                <a href={so.designLink} target="_blank" rel="noreferrer" style={{ color: S.cyan, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500, textDecoration: "none", marginTop: 2 }}>
                  Buka Desain <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!action && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setAction('reject')} disabled={isSubmitting} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}>
                <XCircle size={16} /> Tolak Desain
              </button>
              <button onClick={handleApprove} disabled={isSubmitting} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: "none", background: "#16A34A", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}>
                <CheckCircle size={16} /> Setujui Desain
              </button>
            </div>
          )}

          {action === 'reject' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Pilih Aksi Penolakan</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setRejectType('revision')}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      background: rejectType === 'revision' ? "#FFE4E6" : S.white,
                      color: rejectType === 'revision' ? "#E11D48" : S.secondary,
                      border: `1px solid ${rejectType === 'revision' ? "#FDA4AF" : S.border}`
                    }}>
                    <RotateCcw size={15} /> Minta Revisi
                  </button>
                  <button onClick={() => setRejectType('permanent')}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      background: rejectType === 'permanent' ? "#FEF2F2" : S.white,
                      color: rejectType === 'permanent' ? "#DC2626" : S.secondary,
                      border: `1px solid ${rejectType === 'permanent' ? "#FCA5A5" : S.border}`
                    }}>
                    <XCircle size={15} /> Tolak Permanen
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>
                  {rejectType === 'revision' ? 'Catatan Revisi' : 'Alasan Penolakan'} <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={rejectType === 'revision' ? "Apa yang perlu diperbaiki?" : "Mengapa dibatalkan?"}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAction(null)} disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}>Kembali</button>
                <button onClick={handleReject} disabled={!reason.trim() || isSubmitting}
                  style={{ flex: 1, padding: "10px", background: rejectType === 'revision' ? "#E11D48" : "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: (!reason.trim() || isSubmitting) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyItems: "center", gap: 6, opacity: (reason.trim() && !isSubmitting) ? 1 : 0.5 }}>
                  {rejectType === 'revision' ? <><RotateCcw size={15} /> Kirim Revisi</> : <><XCircle size={15} /> Tolak Permanen</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OwnerApprovalPage() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'approved' | 'rejected' | 'revision'>('all');

  const waitingApproval = salesOrders.filter(so => so.status === 'Waiting Approval');

  const logSOs = salesOrders
    .filter(so => ['Ready for Production', 'Rejected', 'Revision Required'].includes(so.status))
    .filter(so => {
      const q = logSearch.toLowerCase();
      const customer = customers.find(c => c.code === so.customerId);
      const matchSearch = !logSearch || so.id.toLowerCase().includes(q) || so.description.toLowerCase().includes(q) || (customer?.name || '').toLowerCase().includes(q);
      const matchFilter =
        logFilter === 'all' ||
        (logFilter === 'approved' && so.status === 'Ready for Production') ||
        (logFilter === 'rejected' && so.status === 'Rejected') ||
        (logFilter === 'revision' && so.status === 'Revision Required');
      return matchSearch && matchFilter;
    });

  const logCounts = {
    approved: salesOrders.filter(so => so.status === 'Ready for Production').length,
    rejected: salesOrders.filter(so => so.status === 'Rejected').length,
    revision: salesOrders.filter(so => so.status === 'Revision Required').length,
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Approval Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Review dan setujui desain dari Engineering sebelum produksi dimulai
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: "#F59E0B", borderRadius: "50%" }}></span>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Menunggu Review ({waitingApproval.length})</span>
          </div>
        </div>

        {waitingApproval.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <CheckCircle size={32} style={{ color: "#22C55E", margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada desain yang perlu direview</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waitingApproval.map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < waitingApproval.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "#FEF3C7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706", flexShrink: 0 }}>
                    <Clock size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {daysDiff <= 7 && daysDiff >= 0 && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FFF7ED", color: "#EA580C", borderRadius: 4, fontWeight: 500, border: "1px solid #FFEDD5" }}>{daysDiff} hari lagi</span>}
                      {daysDiff < 0 && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>{Math.abs(daysDiff)}h terlambat</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>{customer?.name}</span><span>·</span><span>{so.quantity} {so.unit}</span><span>·</span><span style={{ color: daysDiff < 0 ? "#DC2626" : S.secondary }}>Deadline: {so.deadline}</span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <button onClick={() => setSelectedSO(so)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      Review Desain
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Desain */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Log Riwayat Desain</span>
          </div>
        </div>

        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
            <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Cari SO, deskripsi, customer..."
              style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { value: 'all', label: 'Semua' },
              { value: 'approved', label: `Disetujui (${logCounts.approved})` },
              { value: 'revision', label: `Revisi (${logCounts.revision})` },
              { value: 'rejected', label: `Ditolak (${logCounts.rejected})` },
            ] as const).map(f => (
              <button key={f.value} onClick={() => setLogFilter(f.value)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                  background: logFilter === f.value ? S.navy : S.white,
                  color: logFilter === f.value ? S.white : S.secondary,
                  border: `1px solid ${logFilter === f.value ? S.navy : S.border}`
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "110px 140px 1fr 170px 180px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["SO", "Customer", "Deskripsi", "Status", "Catatan"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {logSOs.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <FileText size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Belum ada log desain</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {logSOs.map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              return (
                <div key={so.id} style={{
                  display: "grid", gridTemplateColumns: "110px 140px 1fr 170px 180px", padding: "10px 18px",
                  borderBottom: idx < logSOs.length - 1 ? `1px solid ${S.border}` : "none", transition: "background 0.1s"
                }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace", alignSelf: "center" }}>{so.id}</span>
                  <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{customer?.name}</span>
                  <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{so.description}</span>
                  <div style={{ alignSelf: "center" }}>
                    <StatusBadge status={so.status} />
                  </div>
                  <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", alignSelf: "center" }}>{so.rejectionReason ?? '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSO && <ApprovalModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
