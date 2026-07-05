import React, { useState } from "react";
import { Edit2 } from "lucide-react";
import { PurchasingRequest, SalesOrder } from "../../data/mockData";
import { PurchasingFormModal } from "../../../pages/engineering/purchasing/PurchasingFormModal";
import { S, URGENCY_COLORS, PR_STATUS_COLORS } from "../ProductionHelpers";

export function MaterialReviewModal({
  so,
  request,
  onClose,
  onApprove,
  onReject,
}: {
  so: SalesOrder;
  request?: PurchasingRequest;
  onClose: () => void;
  onApprove: () => Promise<boolean>;
  onReject: (reason: string) => Promise<boolean>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <PurchasingFormModal
        editRequest={request}
        onClose={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          onClose();
        }}
      />
    );
  }

  const items = request?.items && request.items.length > 0
    ? request.items
    : [{
        itemName: request?.itemName || so.description,
        specification: request?.specification || so.spec || "-",
        quantity: request?.quantity || 1,
        unit: request?.unit || "PCS",
      }];

  const handleApprove = async () => {
    if (isApproving) return;
    setIsApproving(true);
    const ok = await onApprove();
    setIsApproving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "hidden", fontFamily: S.font, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: "13px", color: S.secondary, margin: 0 }}>{request?.id || "-"}</p>
            <h2 style={{ color: S.slate, margin: "2px 0 0", fontSize: "18px" }}>
              {items.length > 1 ? `${items.length} item material` : items[0].itemName}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: 22, lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {request && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${PR_STATUS_COLORS[request.status]?.bg || "bg-slate-50"} ${PR_STATUS_COLORS[request.status]?.border || "border-slate-300"} ${PR_STATUS_COLORS[request.status]?.text || "text-slate-700"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${PR_STATUS_COLORS[request.status]?.dot || "bg-slate-500"}`} />
                <span className="text-xs font-medium">{request.status}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${URGENCY_COLORS[request.urgency]?.bg || "bg-slate-50"} ${URGENCY_COLORS[request.urgency]?.border || "border-slate-300"} ${URGENCY_COLORS[request.urgency]?.text || "text-slate-700"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[request.urgency]?.dot || "bg-slate-500"}`} />
                <span className="text-xs font-medium">{request.urgency}</span>
              </div>
            </div>
          )}

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
                  <p style={{ fontSize: "12.5px", color: S.secondary, margin: "4px 0 0" }}>{item.specification || "-"}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Tanggal Pengajuan</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{request?.requestedAt || "-"}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Referensi SO</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500, fontFamily: "monospace" }}>{so.id}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Diajukan Oleh</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{request?.requestedBy || so.assignedName || "Engineering"}</p>
            </div>
          </div>

          {request?.notes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan Engineer</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{request.notes}</p>
            </div>
          )}

          {rejectMode && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: "12px", color: "#991B1B", margin: "0 0 8px", fontWeight: 700 }}>Catatan Penolakan Supervisor</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Contoh: qty terlalu banyak, spesifikasi belum lengkap..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5", borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  disabled={isApproving}
                  style={{ flex: 1, padding: "9px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (isApproving) return;
                    setIsApproving(true);
                    const ok = await onReject(rejectReason);
                    setIsApproving(false);
                    if (ok) onClose();
                  }}
                  disabled={isApproving || !rejectReason.trim()}
                  style={{ flex: 1, padding: "9px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isApproving || !rejectReason.trim() ? "not-allowed" : "pointer", opacity: isApproving || !rejectReason.trim() ? 0.55 : 1 }}
                >
                  {isApproving ? "Menolak..." : "Konfirmasi Tolak"}
                </button>
              </div>
            </div>
          )}
        </div>

        {!rejectMode && (
          <div style={{ padding: "14px 22px", borderTop: `1px solid ${S.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setRejectMode(true)} disabled={isApproving} style={{ flex: 1, padding: "10px", background: S.white, border: "1px solid #FECACA", color: "#EF4444", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}>
                Tolak
              </button>
              <button type="button" onClick={handleApprove} disabled={isApproving} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: isApproving ? "not-allowed" : "pointer", opacity: isApproving ? 0.65 : 1 }}>
                {isApproving ? "Menyetujui..." : "Approve ke Purchasing"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isApproving}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "#FFF7ED", border: "1px solid #FED7AA", color: "#C2410C", borderRadius: 8, fontSize: "13.5px", fontWeight: 700, cursor: isApproving ? "not-allowed" : "pointer" }}
            >
              <Edit2 size={15} /> Edit Pengajuan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
