import React, { useState } from "react";
import { useNavigate } from "react-router";
import { PlayCircle, AlertTriangle, FileWarning } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { masterDataApi } from "../../../services/masterDataApi";
import { S, getBackendSalesOrderId } from "../ProductionHelpers";

export function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setBackendError(null);

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      setBackendError("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.startProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
      });

      try {
        const products = await masterDataApi.listProducts();
        const deductionItems: { inventoryItemId: string; quantity: number }[] = [];
        for (const soItem of (so.items || [])) {
          const product = products.find(p => p.id === (soItem as any).productId);
          if (product?.bomItems) {
            for (const bomItem of product.bomItems) {
              deductionItems.push({
                inventoryItemId: bomItem.inventoryItemId,
                quantity: bomItem.quantity * ((soItem as any).qty || 1),
              });
            }
          }
        }
        if (deductionItems.length > 0) {
          await masterDataApi.deductBomMaterials({ salesOrderId, items: deductionItems });
        }
      } catch {
        // BOM deduction is non-critical; proceed even if it fails
      }

      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to start production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message || "Gagal mulai produksi di backend. Cek koneksi API atau data operator.";
      setBackendError(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const isStockError = backendError && (backendError.toLowerCase().includes("stock") || backendError.toLowerCase().includes("material"));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{so.status === 'Paused' ? 'Lanjutkan Produksi' : 'Mulai Produksi'}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {isLate && (
            <div style={{ padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
              <div>
                <strong>Peringatan Keterlambatan</strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px" }}>Produksi ini telah melewati deadline selama <strong>{daysLate} hari</strong>.</p>
              </div>
            </div>
          )}

          {backendError && (
            <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
                <div>
                  <strong>{isStockError ? "Stok Material Tidak Cukup" : "Gagal Memulai Produksi"}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", lineHeight: "1.4" }}>{backendError}</p>
                </div>
              </div>

              {isStockError && (
                <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                    style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <FileWarning size={14} /> Buat Material Request
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, lineHeight: "1.5" }}>
              {so.status === 'Paused' && so.pauseReason === 'Mesin Rusak' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Mesin Rusak</strong>. Apakah mesin sudah diperbaiki dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason === 'Kapasitas Penuh' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Kapasitas Penuh</strong>. Apakah kapasitas mesin sudah tersedia dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason === 'Material Kurang' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Material Kurang</strong>. Apakah material sudah tersedia lengkap dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason ? (
                <>Produksi sebelumnya dihentikan karena <strong>{so.pauseReason}</strong>. Apakah kendala sudah teratasi dan Anda yakin ingin melanjutkan produksi?</>
              ) : (
                <>Apakah Anda yakin ingin mulai mengerjakan produksi untuk pesanan ini? <br />
                <strong>Waktu mulai akan tercatat otomatis sesuai waktu saat ini.</strong></>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.65 : 1 }}>
              <PlayCircle size={16} /> {isSubmitting ? "Menyimpan..." : (so.status === 'Paused' ? "Lanjutkan Produksi" : "Konfirmasi Mulai")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
