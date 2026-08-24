import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { PlayCircle, AlertTriangle, FileWarning, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { masterDataApi } from "../../../services/masterDataApi";
import { S, getBackendSalesOrderId } from "../ProductionHelpers";

interface StockIssue {
  itemName: string;
  required: number;
  available: number;
  bomQty: number;
  productQty: number;
  specs?: Array<{ spec: string; quantity: number }>;
}

export function StartProductionModal({ so, onClose, onReturnToSpv }: { so: SalesOrder; onClose: () => void; onReturnToSpv?: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<StockIssue[] | null>(null);
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkStock() {
      try {
        if (so.status === "Paused") {
          setStockIssues([]);
          setCheckingStock(false);
          return;
        }

        const issues: StockIssue[] = [];
        
        // Use the SPV's custom BOMs for checking stock, not the master data BOM
        // Since we need to know the stock levels, we can fetch all inventory items.
        // In a real production app we'd fetch only the needed IDs, but listInventory works for now.
        const allInventory = await masterDataApi.listInventory();
        if (cancelled) return;

        // 1. Get the unified list of materials needed for this SO, excluding customer materials
        // We use getMaterialOptions because it correctly falls back to Master Data BOM if Custom BOM is empty.
        const { getMaterialOptions } = await import("../ProductionHelpers");
        const materials = getMaterialOptions(so, false);

        // 2. Aggregate required quantities by inventoryItemId
        const aggregatedCustomBoms = new Map<string, { quantity: number; isCustomerMaterial: boolean; name: string; specs: Array<{ spec: string, quantity: number }> }>();
        
        for (const cb of materials) {
          let invId = cb.inventoryItemId;
          if (!invId) {
            const match = allInventory.find(i => i.name.toLowerCase() === (cb.itemName || cb.name || "").toLowerCase());
            if (match) invId = match.id;
          }
          if (!invId) continue;
          
          const existing = aggregatedCustomBoms.get(invId);
          if (existing) {
            existing.quantity += (cb.quantity || 1);
            existing.specs.push({ spec: cb.specification || "", quantity: cb.quantity || 1 });
          } else {
            aggregatedCustomBoms.set(invId, {
              quantity: cb.quantity || 1,
              isCustomerMaterial: !!cb.isCustomerMaterial,
              name: cb.itemName || cb.name || "Unknown Material",
              specs: [{ spec: cb.specification || "", quantity: cb.quantity || 1 }]
            });
          }
        }

        // 3. Check against available stock
        for (const [invId, req] of aggregatedCustomBoms.entries()) {
          if (req.isCustomerMaterial || req.quantity <= 0) continue; // Skip customer materials

          const invItem = allInventory.find(i => i.id === invId);
          const available = invItem?.currentStock || 0;
          const requiredQty = req.quantity;

          if (available < requiredQty) {
            const existingIssue = issues.find(i => i.itemName === req.name);
            if (existingIssue) {
              existingIssue.required += requiredQty;
              existingIssue.specs = [...(existingIssue.specs || []), ...req.specs];
            } else {
              issues.push({
                itemName: req.name,
                required: requiredQty,
                available,
                bomQty: requiredQty,
                productQty: 1, // Already multiplied in getMaterialOptions
                specs: req.specs.length > 0 ? req.specs : undefined
              });
            }
          }
        }

        if (!cancelled) setStockIssues(issues);
      } catch (err) {
        console.warn("Failed to check stock for start production", err);
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    }
    void checkStock();
    return () => { cancelled = true; };
  }, [so.items, so.id, so.bomsPerItem, so.status]);

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

        try {
          const { getMaterialOptions } = await import("../ProductionHelpers");
          const materials = getMaterialOptions(so, false);
          const deductItems: { inventoryItemId: string, quantity: number }[] = [];
          const allInventory = await masterDataApi.listInventory();
          
          for (const cb of materials) {
             if (cb.isCustomerMaterial || !cb.quantity) continue;
             let invId = cb.inventoryItemId;
             if (!invId) {
               const match = allInventory.find(i => i.name.toLowerCase() === (cb.itemName || cb.name || "").toLowerCase());
               if (match) invId = match.id;
             }
             if (invId) {
               const existing = deductItems.find(x => x.inventoryItemId === invId);
               if (existing) {
                 existing.quantity += cb.quantity;
               } else {
                 deductItems.push({ inventoryItemId: invId, quantity: cb.quantity });
               }
             }
          }
          
          if (deductItems.length > 0) {
             await masterDataApi.deductCustomBomMaterials({ 
               items: deductItems,
               reason: `Pemakaian Produksi PO ${so.poNumber || so.soNumber || so.id} - Sistem BOM`
             });
          }
        } catch (err) {
          console.warn("BOM deduction failed in frontend, but production started.", err);
        }
      }

      await refreshBackendData();
      onClose();
    } catch (error: any) {
      console.warn("Failed to start production in backend.", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Gagal mulai produksi di backend. Cek koneksi API atau data operator.";
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
                  {isSupervisor ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/erp/production/mr/${so.id}`, { state: { stockIssues: stockIssues || [] } })}
                      style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <FileWarning size={14} /> Buat Material Request
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { onClose(); if (onReturnToSpv) onReturnToSpv(); }}
                      style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <FileWarning size={14} /> Kembalikan ke SPV
                    </button>
                  )}
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
                {isSupervisor ? (
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate(`/erp/production/mr/${so.id}`, { state: { stockIssues: stockIssues! } }); }}
                    style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <FileWarning size={14} /> Buat Material Request
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { onClose(); if (onReturnToSpv) onReturnToSpv(); }}
                    style={{ padding: "6px 14px", background: "#B91C1C", color: "white", border: "none", borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <FileWarning size={14} /> Kembalikan ke SPV
                  </button>
                )}
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
