import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { S, getBackendSalesOrderId } from "../ProductionHelpers";

export function PauseProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !pauseReason.trim()) return;

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.pauseProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
        reason: pauseReason.trim(),
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to pause production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal pause produksi: ${backendMsg}` : "Gagal pause produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Jeda Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#991B1B", fontSize: "13.5px" }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginTop: -2 }} /> Peringatan: Menjeda produksi berarti menghentikan catatan waktu kerja. Pastikan hal ini dilakukan karena ada kendala di lapangan.
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "12.5px", color: S.slate }}>Alasan Jeda/Kendala:</p>
            <textarea
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Contoh: Mesin CNC rusak, bahan baku aluminium habis..."
              rows={3}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: S.font }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "-6px" }}>
            <button type="button" onClick={() => setPauseReason("Material Kurang")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Material Kurang</button>
            <button type="button" onClick={() => setPauseReason("Mesin Rusak")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Mesin Rusak</button>
            <button type="button" onClick={() => setPauseReason("Kapasitas Penuh")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Kapasitas Penuh</button>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting || !pauseReason.trim()} style={{ flex: 1, padding: "10px", background: "#EA580C", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: (isSubmitting || !pauseReason.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (isSubmitting || !pauseReason.trim()) ? 0.65 : 1 }}>
               {isSubmitting ? "Menyimpan..." : "Jeda Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
