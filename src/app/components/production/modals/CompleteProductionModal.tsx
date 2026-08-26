import React, { useState } from "react";
import { CheckSquare, AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { S, getBackendSalesOrderId } from "../ProductionHelpers";

export function CompleteProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 16);
  // eslint-disable-next-line unused-imports/no-unused-vars
  const [endDate, setEndDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [earlyReason, setEarlyReason] = useState("");

  let isEarly = false;
  let hMinus3Str = "";
  let deadlineStrFormatted = "";
  if (so.deadline) {
    const deadlineDate = new Date(so.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      deadlineStrFormatted = deadlineDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
      const hMinus3 = new Date(deadlineDate);
      hMinus3.setDate(deadlineDate.getDate() - 3);
      hMinus3.setHours(0, 0, 0, 0);

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      isEarly = todayDate < hMinus3;

      // eslint-disable-next-line unused-imports/no-unused-vars
      hMinus3Str = hMinus3.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  let isLate = false;
  let daysLate = 0;
  if (so.deadline) {
    const todayStr = new Date().toISOString().split("T")[0];
    const deadlineStr = so.deadline.split("T")[0];
    const tDate = new Date(todayStr);
    const dDate = new Date(deadlineStr);
    if (tDate > dDate) {
      isLate = true;
      daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || (isLate && !lateReason.trim()) || (isEarly && !earlyReason.trim())) return;
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
        workerName: currentUser?.name || so.assignedName || "Engineering",
        reason: (isLate ? lateReason : earlyReason) || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
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
          {isLate && (
            <>
              <div style={{ padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
                <div>
                  <strong>Peringatan Keterlambatan</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "13px" }}>Produksi ini telah melewati deadline selama <strong>{daysLate} hari</strong>.</p>
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "12.5px", color: S.slate }}>Alasan Keterlambatan: <span style={{ color: "#DC2626" }}>*</span></p>
                <textarea
                  value={lateReason}
                  onChange={e => setLateReason(e.target.value)}
                  placeholder="Contoh: Material kurang, mesin rusak..."
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: S.font }}
                />
              </div>
            </>
          )}
          {isEarly && (
            <>
              <div style={{ padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, color: "#92400E", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
                <div>
                  <strong>Penyelesaian Lebih Awal</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "13px" }}>
                    Produksi ini selesai lebih cepat dari estimasi (sebelum <strong>{deadlineStrFormatted}</strong>). Pastikan semua tahap selesai dan siap masuk QC.
                  </p>
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "12.5px", color: S.slate }}>Alasan Selesai Lebih Cepat: <span style={{ color: "#DC2626" }}>*</span></p>
                <textarea
                  value={earlyReason}
                  onChange={e => setEarlyReason(e.target.value)}
                  placeholder="Contoh: Pekerjaan selesai lebih cepat karena mesin kosong..."
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: S.font }}
                />
              </div>
            </>
          )}

          {!isEarly && !isLate && (
            <div>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, lineHeight: "1.5" }}>
                Apakah Anda yakin ingin menyelesaikan produksi untuk pesanan ini? <br />
                <strong>Waktu selesai akan tercatat otomatis sesuai waktu saat ini.</strong>
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting || (isLate && !lateReason.trim()) || (isEarly && !earlyReason.trim())} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting || (isLate && !lateReason.trim()) || (isEarly && !earlyReason.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting || (isLate && !lateReason.trim()) || (isEarly && !earlyReason.trim()) ? 0.65 : 1 }}>
              <CheckSquare size={16} /> {isSubmitting ? "Menyimpan..." : "Selesai Produksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
