import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { PlayCircle, AlertTriangle, FileWarning, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";
import { S, getBackendSalesOrderId, getMaterialOptions } from "../ProductionHelpers";

interface StockIssue {
  itemName: string;
  required: number;
  available: number;
  bomQty: number;
  productQty: number;
  specs?: Array<{ spec: string; quantity: number }>;
}

export function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, productCatalog, refreshBackendData } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<StockIssue[] | null>(null);
  const [bomStockCache, setBomStockCache] = useState<Awaited<ReturnType<typeof masterDataApi.getBomStock>> | null>(null);
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkBomStock() {
      try {
        // Bypass stock checking if resuming
        // Because the materials were already allocated/checked when production first started
        // and any material shortage is handled manually by the operator.
        if (so.status === "Paused") {
          setStockIssues([]);
          setCheckingStock(false);
          return;
        }

        const productIds = (so.items || [])
          .map(item => (item as any).productId)
          .filter((id): id is string => !!id);

        if (productIds.length === 0) {
          setStockIssues([]);
          setCheckingStock(false);
          return;
        }

        const bomStocks = await masterDataApi.getBomStock(productIds);
        if (cancelled) return;

        setBomStockCache(bomStocks);

        const issues: StockIssue[] = [];
        for (const soItem of (so.items || [])) {
          const soProductId = (soItem as any).productId;
          const soItemId = soItem.id;
          const customBoms = so.bomsPerItem?.[soItemId] || [];
          const bomStock = bomStocks.find(bs => bs.productId === soProductId);
          if (!bomStock?.items?.length) continue;

          // Aggregate bomStock.items by inventoryItemId to prevent duplicate specs and correctly sum quantities
          const aggregatedItems = new Map<string, typeof bomStock.items[0]>();
          for (const item of bomStock.items) {
            const existing = aggregatedItems.get(item.inventoryItemId);
            if (existing) {
              existing.bomQuantity += item.bomQuantity;
            } else {
              aggregatedItems.set(item.inventoryItemId, { ...item });
            }
          }

          const productQty = (soItem as any).qty || soItem.quantity || 1;
          for (const item of aggregatedItems.values()) {
            const required = item.bomQuantity * productQty;
            const available = item.currentStock;
            
            // Extract matching specifications for this specific master item
            const matchingCustomBoms = customBoms.filter(cb => cb.inventoryItemId === item.inventoryItemId);
            const specs = matchingCustomBoms.map(cb => ({
              spec: cb.spec || "",
              quantity: (cb.quantity || 1) * productQty
            }));
            
            if (available < required) {
              const existing = issues.find(i => i.itemName === item.inventoryItemName);
              if (existing) {
                existing.required += required;
                if (specs.length > 0) {
                  // Only add specs if they aren't already present for this exact item
                  existing.specs = [...(existing.specs || []), ...specs];
                }
              } else {
                issues.push({
                  itemName: item.inventoryItemName,
                  required,
                  available,
                  bomQty: item.bomQuantity,
                  productQty,
                  specs: specs.length > 0 ? specs : undefined
                });
              }
            }
          }
        }
        if (!cancelled) setStockIssues(issues);
      } catch (err) {
        console.warn("Failed to check BOM stock for start production", err);
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    }
    void checkBomStock();
    return () => { cancelled = true; };
  }, [so.items, so.id]);

  const hasStockIssues = stockIssues && stockIssues.length > 0;
  const canStart = !isSubmitting && !checkingStock && !hasStockIssues;

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
      if (so.status === 'Paused') {
        await productionApi.resumeProduction(salesOrderId, {
          workerUserId,
          workerName: currentUser?.name || so.assignedName || "Engineering",
        });
      } else {
        await productionApi.startProduction(salesOrderId, {
          workerUserId,
          workerName: currentUser?.name || so.assignedName || "Engineering",
        });
      }

      try {
        if (bomStockCache && so.status !== 'Paused') {
          const deductionItems: { inventoryItemId: string; quantity: number }[] = [];
          for (const soItem of (so.items || [])) {
            const bomStock = bomStockCache.find(bs => bs.productId === (soItem as any).productId);
            if (bomStock?.items) {
              const productQty = (soItem as any).qty || soItem.quantity || 1;
              for (const item of bomStock.items) {
                deductionItems.push({ inventoryItemId: item.inventoryItemId, quantity: item.bomQuantity * productQty });
              }
            }
          }
          if (deductionItems.length > 0) {
            await masterDataApi.deductBomMaterials({ salesOrderId, items: deductionItems });
          }
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
                    onClick={() => navigate(`/erp/production/mr/${so.id}`, { state: { stockIssues: stockIssues || [] } })}
                    style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <FileWarning size={14} /> Buat Material Request
                  </button>
                </div>
              )}
            </div>
          )}

          {checkingStock && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", background: "#F1F5F9", borderRadius: 8, color: S.secondary, fontSize: "13px" }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Memeriksa ketersediaan material...
            </div>
          )}

          {hasStockIssues && (
            <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
                <div>
                  <strong>Stok Material Tidak Cukup</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", lineHeight: "1.4" }}>Material berikut tidak mencukupi untuk memulai produksi:</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 24 }}>
                {stockIssues!.map(issue => (
                  <div key={issue.itemName} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ fontWeight: 500 }}>{issue.itemName}</span>
                    <span>Butuh <strong>{issue.required}</strong> ({issue.bomQty}/unit × {issue.productQty} pcs) / Tersedia <strong style={{ color: "#DC2626" }}>{issue.available}</strong></span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate(`/erp/production/mr/${so.id}`, { state: { stockIssues: stockIssues! } }); }}
                  style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <FileWarning size={14} /> Buat Material Request
                </button>
              </div>
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
            <button type="submit" disabled={!canStart} style={{ flex: 1, padding: "10px", background: canStart ? S.cyan : "#D1D5DB", border: "none", color: canStart ? "#fff" : "#9CA3AF", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canStart ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: canStart ? 1 : 0.7 }}>
              {checkingStock ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <PlayCircle size={16} />}
              {checkingStock ? "Memeriksa Stok..." : isSubmitting ? "Menyimpan..." : hasStockIssues ? "Material Tidak Cukup" : (so.status === 'Paused' ? "Lanjutkan Produksi" : "Konfirmasi Mulai")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
