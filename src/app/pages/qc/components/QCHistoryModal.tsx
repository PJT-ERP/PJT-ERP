import React, { useState } from 'react';
import { X } from "lucide-react";
import { useApp } from "../../../components/context/AppContext";
import { ImageWithFallback } from "../../../components/figma/ImageWithFallback";
import { SalesOrder } from "../../../components/data/mockData";
import type { QcInspectionDto } from "../../../services/qcApi";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { DrawingLink } from "./DrawingLink";
import { S, isGo, getFullUrl } from "./utils";

export function QCHistoryModal({ so, inspection, onClose }: { so: SalesOrder; inspection?: QcInspectionDto; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Riwayat Inspeksi QC</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: "13px", fontWeight: 600,
              background: isGo(so.qcStatus) ? "#DCFCE7" : "#FEE2E2",
              color: isGo(so.qcStatus) ? "#16A34A" : "#DC2626",
            }}>
              Hasil: {isGo(so.qcStatus) ? 'Go' : 'NoGo'}
            </span>
            <span style={{ color: S.secondary, fontSize: "12.5px" }}>{so.qcAt ? new Date(so.qcAt).toLocaleString('id-ID') : '-'}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0, marginBottom: "4px" }}>Produk & Quantity</p>
              {so.items && so.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {so.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: S.bg, padding: "6px 12px", borderRadius: "6px", border: `1px solid ${S.border}` }}>
                      <span style={{ fontSize: "13px", color: S.slate, fontWeight: 500 }}>{item.productName || "Custom Product"}</span>
                      <span style={{ fontSize: "13px", color: S.slate, fontWeight: 600 }}>{item.quantity} {item.unit || so.unit || 'PCS'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", background: S.bg, padding: "6px 12px", borderRadius: "6px", border: `1px solid ${S.border}` }}>
                  <span style={{ fontSize: "13px", color: S.slate, fontWeight: 500 }}>{so.description}</span>
                  <span style={{ fontSize: "13px", color: S.slate, fontWeight: 600 }}>{so.quantity} {so.unit || 'PCS'}</span>
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name || so.customerName || so.customerId}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Diinspeksi Oleh</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{inspection?.reviewerName || 'QC Reviewer'}</p>
            </div>
          </div>

          <DrawingLink so={so} inspection={inspection} />

          {so.qcNotes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan Inspeksi</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{so.qcNotes}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(inspection?.productionPhotos ?? so.productionPhotos) && (inspection?.productionPhotos ?? so.productionPhotos)!.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Hasil Produksi ({(inspection?.productionPhotos ?? so.productionPhotos)!.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {(inspection?.productionPhotos ?? so.productionPhotos)!.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`Production Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(inspection?.qcPhotos ?? so.qcPhotos) && (inspection?.qcPhotos ?? so.qcPhotos)!.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Bukti ({(inspection?.qcPhotos ?? so.qcPhotos)!.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {(inspection?.qcPhotos ?? so.qcPhotos)!.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`QC Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingTop: 8 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              Tutup
            </button>
          </div>
        </div>
      </div>
      {previewPhoto && <ImagePreviewModal src={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
    </div>
  );
}
