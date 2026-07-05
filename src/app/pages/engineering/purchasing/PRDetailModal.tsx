import { useState } from "react";
import { CheckCircle, X, Edit2 } from "lucide-react";
import { useApp } from "../../../components/context/AppContext";
import { PurchasingRequest, PurchasingItem } from "../../../components/data/mockData";
import { purchasingApi } from "../../../services/purchasingApi";
import { toBackendUserId } from "../../../services/backendIds";
import { S, URGENCY_COLORS, PR_STATUS_COLORS } from "./constants";

export function PRDetailModal({ pr, onClose, onEdit }: { pr: PurchasingRequest; onClose: () => void; onEdit: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAction, setSuccessAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const items: PurchasingItem[] = pr.items && pr.items.length > 0
    ? pr.items
    : [{ itemName: pr.itemName, specification: pr.specification, quantity: pr.quantity, unit: pr.unit }];

  const isSpv = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

  const canEditWorker = (currentUser?.role === 'Engineering' || currentUser?.role === 'Engineering Worker')
    && (pr.backendStatus === 'SupervisorRejected' || pr.backendStatus === 'FinanceRejected' || pr.backendStatus === 'Rejected' || pr.status === 'Ditolak');

  const canEditSpv = isSpv
    && (pr.backendStatus === 'Submitted' || pr.backendStatus === 'SupervisorRejected' || pr.backendStatus === 'FinanceRejected' || pr.backendStatus === 'Rejected' || pr.status === 'Pending' || pr.status === 'Ditolak');

  const canEdit = canEditWorker || canEditSpv;

  if (successAction) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: successAction === 'approve' ? "#DCFCE7" : "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {successAction === 'approve' ? <CheckCircle size={32} style={{ color: "#22C55E" }} /> : <X size={32} style={{ color: "#EF4444" }} />}
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
          {successAction === 'approve' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak'}
        </h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {successAction === 'approve'
            ? 'Pengajuan telah diteruskan ke tim Purchasing untuk diproses.'
            : 'Pengajuan telah dikembalikan dengan status ditolak.'}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  const handleApprove = async () => {
    if (!currentUser) return;
    try {
      setIsSubmitting(true);
      await purchasingApi.supervisorReviewPurchaseRequest(pr.backendId || pr.id, {
        reviewedByUserId: toBackendUserId(currentUser) || "00000000-0000-0000-0000-000000000000",
        decision: 'Accept',
      });
      await refreshBackendData();
      setSuccessAction('approve');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menyetujui pengajuan di backend: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    try {
      setIsSubmitting(true);
      await purchasingApi.supervisorReviewPurchaseRequest(pr.backendId || pr.id, {
        reviewedByUserId: toBackendUserId(currentUser) || "00000000-0000-0000-0000-000000000000",
        decision: 'Reject',
        rejectionReason: reason,
      });
      await refreshBackendData();
      setSuccessAction('reject');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menolak pengajuan di backend: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: "13px", color: S.secondary, margin: 0 }}>{pr.id}</p>
            <h2 style={{ color: S.slate, margin: "2px 0 0", fontSize: "18px" }}>
              {items.length > 1 ? `${items.length} item material` : items[0].itemName}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${PR_STATUS_COLORS[pr.status].bg} ${PR_STATUS_COLORS[pr.status].border} ${PR_STATUS_COLORS[pr.status].text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${PR_STATUS_COLORS[pr.status].dot}`} />
              <span className="text-xs font-medium">{pr.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${URGENCY_COLORS[pr.urgency].bg} ${URGENCY_COLORS[pr.urgency].border} ${URGENCY_COLORS[pr.urgency].text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[pr.urgency].dot}`} />
              <span className="text-xs font-medium">{pr.urgency}</span>
            </div>
          </div>

          <div>
            <p style={{ fontSize: "12.5px", color: S.secondary, margin: "0 0 8px", fontWeight: 500 }}>
              {items.length > 1 ? `Daftar Item (${items.length})` : 'Item / Material'}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ background: S.bg, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, fontWeight: 500 }}>{item.itemName}</p>
                    <span style={{ fontSize: "12px", color: S.slate, background: S.white, border: `1px solid ${S.border}`, padding: "2px 8px", borderRadius: 99, flexShrink: 0, fontWeight: 500 }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: S.secondary, margin: "4px 0 0" }}>{item.specification}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Tanggal Pengajuan</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.requestedAt}</p>
            </div>
            {pr.soId && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Referensi SO</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500, fontFamily: "monospace" }}>{pr.soId}</p>
              </div>
            )}
            {pr.supplier && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Supplier</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.supplier}</p>
              </div>
            )}
            {pr.poNumber && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Nomor PO</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500, fontFamily: "monospace" }}>{pr.poNumber}</p>
              </div>
            )}
            {pr.expectedDelivery && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Est. Pengiriman</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.expectedDelivery}</p>
              </div>
            )}
            {pr.receivedAt && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Diterima</p>
                <p style={{ fontSize: "13.5px", color: "#15803D", margin: "2px 0 0", fontWeight: 600 }}>{pr.receivedAt}</p>
              </div>
            )}
          </div>

          {pr.notes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{pr.notes}</p>
            </div>
          )}

          {pr.rejectionReason && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: "12px", color: "#EF4444", margin: "0 0 2px", fontWeight: 600 }}>Alasan Penolakan</p>
              <p style={{ fontSize: "13.5px", color: "#B91C1C", margin: 0 }}>{pr.rejectionReason}</p>
            </div>
          )}

          {rejectMode && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: "12px", color: "#991B1B", margin: "0 0 8px", fontWeight: 700 }}>Catatan Penolakan Supervisor</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Contoh: qty terlalu banyak, spesifikasi belum lengkap, atau belum sesuai SO..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5", borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: "9px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  style={{ flex: 1, padding: "9px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isSubmitting || !rejectReason.trim() ? "not-allowed" : "pointer", opacity: isSubmitting || !rejectReason.trim() ? 0.55 : 1 }}
                >
                  {isSubmitting ? "Menolak..." : "Konfirmasi Tolak"}
                </button>
              </div>
            </div>
          )}

          {isSpv && currentUser?.role !== 'Admin' && (pr.status === 'Pending' || pr.backendStatus === 'Rejected' || pr.backendStatus === 'Submitted') && !rejectMode && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setRejectMode(true)}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "10px", background: S.white, border: "1px solid #FECACA", color: "#EF4444", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}
              >
                Tolak
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}
              >
                Setujui ke Purchasing
              </button>
            </div>
          )}

          {canEdit && !rejectMode && (
            <button
              onClick={onEdit}
              disabled={isSubmitting}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "#FFF7ED", border: "1px solid #FED7AA", color: "#C2410C", borderRadius: 8, fontSize: "13.5px", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              <Edit2 size={15} /> Edit Pengajuan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
