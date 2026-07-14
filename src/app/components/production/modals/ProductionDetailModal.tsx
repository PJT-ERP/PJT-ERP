import React, { useState, useEffect } from "react";
import { Edit2, Check, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { S, StatusBadge, getDrawingUrl, getMaterialOptions, getBackendSalesOrderId } from "../ProductionHelpers";
import { isGuid } from "../../../services/backendIds";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";

export function ProductionDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { purchasingRequests, updateSalesOrder, currentUser } = useApp();
  const materials = getMaterialOptions(so);
  const request = purchasingRequests.find(pr => pr.salesOrderId === so.id || pr.salesOrderId === so.backendId);
  const [materialTracking, setMaterialTracking] = useState<{ items?: Array<{ productId?: string; materialRequirements?: Array<{ inventoryItemName?: string; inventoryItemCode?: string; materialSpec?: string; requiredQty?: number; stockOnHand?: number }> }> } | null>(null);
  const [inventory, setInventory] = useState<InventoryItemDto[]>([]);

  const [isEditingBOM, setIsEditingBOM] = useState(false);
  const [editedBOM, setEditedBOM] = useState(materials);
  const isSpv = currentUser?.role?.includes('Supervisor') || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  useEffect(() => {
    masterDataApi.listInventory().then(setInventory).catch(console.error);
  }, []);

  useEffect(() => {
    const salesOrderId = getBackendSalesOrderId(so);
    if (isGuid(salesOrderId)) {
      import("../../../services/productionApi").then(({ productionApi }) =>
        productionApi.getSalesOrderMaterialTracking(salesOrderId)
          .then(d => setMaterialTracking(d as any))
          .catch(() => setMaterialTracking(null))
      );
    }
  }, [so]);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, fontFamily: S.font, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Detail Pesanan & BOM</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: -4 }}>
            <StatusBadge status={so.status} />
            {(so as any).productionStatus && (so as any).productionStatus !== so.status && <StatusBadge status={(so as any).productionStatus} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Pelanggan</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.customerName || so.customerId}</p>
            </div>
            <div>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Deadline</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.deadline}</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Deskripsi Produk</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.description}</p>
            </div>
          </div>
          { (request?.status === 'Ditolak' || request?.backendStatus === 'Rejected') && request?.rejectionReason && (
            <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#B91C1C" }}>MR Ditolak (Catatan SPV):</p>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#DC2626" }}>{request.rejectionReason}</p>
            </div>
          )}
          { so.rejectionReason && (
            <div style={{ padding: "12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#9A3412" }}>Dikembalikan ke SPV (Catatan Operator):</p>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#C2410C" }}>{so.rejectionReason}</p>
            </div>
          )}
          { so.status === 'Paused' && so.pauseReason && (
            <div style={{ padding: "12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#9A3412" }}>Alasan Produksi Dihentikan Sementara:</p>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#C2410C" }}>{so.pauseReason}</p>
            </div>
          )}
          <div>
            <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Link Desain / Gambar</p>
            {getDrawingUrl(so) ? (
              <a href={getDrawingUrl(so)} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "14px", fontWeight: 500, textDecoration: "underline" }}>Lihat Gambar Desain</a>
            ) : (
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>
                {so.backendDesignStatus === 'Approved' && !so.designApprovedAt ? "Ini produk terdaftar, jadi tidak butuh desain" : "Tidak ada link desain"}
              </p>
            )}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", color: S.secondary, margin: 0, fontWeight: 600 }}>Bill of Materials (BOM) / Kebutuhan</p>
              {isSpv && !isEditingBOM && (
                <button onClick={() => { setEditedBOM(materials); setIsEditingBOM(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: S.cyan, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  <Edit2 size={12} /> Edit BOM
                </button>
              )}
            </div>
            {isEditingBOM ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {editedBOM.map((m, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: S.slate }}>{m.itemName}</span>
                      {m.specification && <span style={{ color: S.secondary }}> - {m.specification}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "12px", color: S.secondary }}>Qty (per pcs):</span>
                      <input 
                        type="number" 
                        value={m.quantity || ''} 
                        onChange={e => {
                          const newBOM = [...editedBOM];
                          newBOM[i].quantity = Number(e.target.value);
                          setEditedBOM(newBOM);
                        }}
                        style={{ width: 60, padding: "4px 8px", borderRadius: 4, border: `1px solid ${S.border}`, fontSize: "13px", fontFamily: S.font }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setIsEditingBOM(false)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", background: S.white, border: `1px solid ${S.border}`, borderRadius: 4, color: S.slate, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    <X size={12} /> Batal
                  </button>
                  <button onClick={() => {
                    updateSalesOrder(so.id, { materials: editedBOM });
                    setIsEditingBOM(false);
                  }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", background: S.cyan, border: "none", borderRadius: 4, color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    <Check size={12} /> Simpan
                  </button>
                </div>
              </div>
            ) : materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map((m, i) => {
                  const invItem = inventory.find(inv => 
                    inv.name?.toLowerCase() === m.itemName.toLowerCase() && 
                    (!m.specification || inv.specification?.toLowerCase() === m.specification.toLowerCase())
                  );
                  // Total kebutuhan = jumlah di BOM (per pcs) * jumlah produk pesanan
                  const reqQty = (m.quantity ?? 0) * (so.quantity || 1);
                  const stock = invItem?.currentStock ?? 0;
                  const isShort = reqQty > 0 && stock < reqQty;
                  
                  return (
                    <div key={i} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${isShort ? '#FECACA' : S.border}`, borderRadius: 6, fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: S.slate }}>{m.itemName}</span>
                        {m.specification && <span style={{ color: S.secondary }}> - {m.specification}</span>}
                      </div>
                      {(reqQty > 0 || stock > 0 || isShort) && (
                        <div style={{ display: "flex", gap: 12, fontSize: "12px", color: S.secondary, textAlign: "right" }}>
                          {reqQty > 0 && <span>Butuh: <strong style={{ color: S.slate }}>{reqQty}</strong></span>}
                          <span>Stok Gudang: <strong style={{ color: isShort ? '#DC2626' : S.slate }}>{stock}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>Belum ada data BOM.</p>
            )}
          </div>
          {materialTracking && Array.isArray(materialTracking.items) && materialTracking.items.length > 0 && (
            (() => {
              const deduped = new Map<string, { itemName: string; itemCode: string; materialSpec: string; requiredQty: number; stockOnHand: number }>();
              for (const item of materialTracking.items) {
                for (const mr of (item.materialRequirements || [])) {
                  const specStr = mr.materialSpec || '';
                  const key = ((mr.inventoryItemName || '').trim() + '|' + (mr.inventoryItemCode || '').trim() + '|' + specStr.trim()).toLowerCase();
                  const existing = deduped.get(key);
                  if (existing) {
                    existing.requiredQty += mr.requiredQty ?? 0;
                    if (!existing.itemCode && mr.inventoryItemCode) existing.itemCode = mr.inventoryItemCode;
                    if (!existing.materialSpec && mr.materialSpec) existing.materialSpec = mr.materialSpec;
                    if (mr.stockOnHand != null) existing.stockOnHand = Math.min(existing.stockOnHand, mr.stockOnHand);
                  } else {
                    deduped.set(key, {
                      itemName: mr.inventoryItemName || '-',
                      itemCode: mr.inventoryItemCode || '',
                      materialSpec: mr.materialSpec || '',
                      requiredQty: mr.requiredQty ?? 0,
                      stockOnHand: mr.stockOnHand ?? 0,
                    });
                  }
                }
              }
              const entries = Array.from(deduped.values());
              return entries.length > 0 ? (
                <div>
                  <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 8px", fontWeight: 600 }}>Material Tracking</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {entries.map((mr, i) => (
                      <div key={i} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, color: S.slate }}>{mr.itemName}</span>
                          <span style={{ fontSize: "11px", color: S.secondary }}>
                            {mr.materialSpec ? `${mr.itemCode ? mr.itemCode + ' - ' : ''}${mr.materialSpec}` : (mr.itemCode || '')}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: "12px", color: S.secondary }}>
                          <span>Dibutuhkan: {mr.requiredQty}</span>
                          <span>Stok: {mr.stockOnHand}</span>
                          <span style={{ color: mr.stockOnHand < mr.requiredQty ? "#DC2626" : "#16A34A", fontWeight: 500 }}>
                            {mr.stockOnHand < mr.requiredQty ? 'Kurang' : 'Cukup'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 8px", fontWeight: 600 }}>Material Tracking</p>
                  <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>Tidak ada data material.</p>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
