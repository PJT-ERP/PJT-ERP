import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { S, StatusBadge, getDrawingUrl, getMaterialOptions, getBackendSalesOrderId } from "../ProductionHelpers";
import { productionApi, SalesOrderMaterialTrackingDto } from "../../../services/productionApi";
import { isGuid } from "../../../services/backendIds";

export function ProductionDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { purchasingRequests } = useApp();
  const materials = getMaterialOptions(so);
  const request = purchasingRequests.find(pr => pr.salesOrderId === so.id || pr.salesOrderId === so.backendId);
  const [materialTracking, setMaterialTracking] = useState<SalesOrderMaterialTrackingDto | null>(null);

  useEffect(() => {
    const salesOrderId = getBackendSalesOrderId(so);
    if (isGuid(salesOrderId)) {
      productionApi.getSalesOrderMaterialTracking(salesOrderId)
        .then(setMaterialTracking)
        .catch(() => setMaterialTracking(null));
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
            <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 8px", fontWeight: 600 }}>Bill of Materials (BOM) / Kebutuhan</p>
            {materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map((m, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                    <span style={{ fontWeight: 600, color: S.slate }}>{m.itemName}</span>
                    {m.specification && <span style={{ color: S.secondary }}> - {m.specification}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>Belum ada data BOM.</p>
            )}
          </div>
          {materialTracking && materialTracking.items.length > 0 && (
            <div>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 8px", fontWeight: 600 }}>Material Tracking</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materialTracking.items.flatMap(item =>
                  item.materialRequirements.map((mr, i) => (
                    <div key={`${item.productId}-${i}`} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: S.slate }}>{mr.inventoryItemName}</span>
                        <span style={{ fontSize: "11px", color: S.secondary }}>{mr.inventoryItemCode}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: "12px", color: S.secondary }}>
                        <span>Dibutuhkan: {mr.requiredQty}</span>
                        <span>Stok: {mr.stockOnHand}</span>
                        <span style={{ color: mr.stockOnHand < mr.requiredQty ? "#DC2626" : "#16A34A", fontWeight: 500 }}>
                          {mr.stockOnHand < mr.requiredQty ? '⚠ Kurang' : '✓ Cukup'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
