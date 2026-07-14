import React from "react";
import { SalesOrder } from "../../data/mockData";
import { S, isGo, getFullUrl } from "./shared";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

export function QcReportCard({ order, onPreviewPhoto }: { order: SalesOrder; onPreviewPhoto: (url: string) => void }) {
  if (!order.qcStatus) return null;

  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Laporan QC</p>
        <span style={{ padding: "3px 8px", borderRadius: 4, background: isGo(order.qcStatus) ? "#ECFDF5" : "#FEF2F2", color: isGo(order.qcStatus) ? "#059669" : "#DC2626", border: `1px solid ${isGo(order.qcStatus) ? "#10B981" : "#EF4444"}`, fontSize: "10px", fontWeight: 600 }}>
          {isGo(order.qcStatus) ? 'Go' : 'NoGo'}
        </span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {order.qcAt && (
          <div>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Inspeksi</p>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{new Date(order.qcAt).toLocaleString("id-ID")}</p>
          </div>
        )}
        {order.qcNotes && (
          <>
            <div style={{ height: 1, background: "#F8FAFC" }} />
            <div>
              <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Catatan QC</p>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.secondary, lineHeight: 1.5 }}>{order.qcNotes}</p>
            </div>
          </>
        )}
        <PhotoGrid label="Foto Hasil Produksi" photos={order.productionPhotos} onPreview={onPreviewPhoto} />
        {order.qcPhotos && order.qcPhotos.length > 0 && (
          <>
            <div style={{ height: 1, background: "#F8FAFC", margin: "8px 0" }} />
            <PhotoGrid label="Foto Bukti" photos={order.qcPhotos} onPreview={onPreviewPhoto} />
          </>
        )}
      </div>
    </div>
  );
}

function PhotoGrid({ label, photos, onPreview }: { label: string; photos?: string[]; onPreview: (url: string) => void }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: "10.5px", color: "#94A3B8" }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 80px)", gap: 8 }}>
        {photos.map((photo, i) => {
          const fullPhoto = getFullUrl(photo);
          if (!fullPhoto) return null;
          return (
            <div key={i} onClick={() => onPreview(fullPhoto)} style={{ width: 80, height: 60, background: S.border, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
              <ImageWithFallback src={fullPhoto} alt={`${label} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
