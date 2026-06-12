import React, { useState } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Search } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SalesOrder
} from "../components/data/mockData";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

function QCDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Detail Laporan QC</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              background: so.status === 'QC' ? "#FEF3C7" : (so.qcStatus === 'Pass' ? "#DCFCE7" : "#FEE2E2"),
              color: so.status === 'QC' ? "#D97706" : (so.qcStatus === 'Pass' ? "#16A34A" : "#DC2626"),
            }}>
              {so.status === 'QC' ? (
                <>Menunggu QC</>
              ) : (
                <>{so.qcStatus === 'Pass' ? <CheckCircle size={14} /> : <XCircle size={14} />} {so.qcStatus === 'Pass' ? 'Go' : 'NoGo'}</>
              )}
            </span>
            {so.qcAt && <span style={{ color: S.secondary, fontSize: "12.5px" }}>{new Date(so.qcAt).toLocaleString('id-ID')}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Quantity</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{so.quantity} {so.unit}</p>
            </div>
          </div>

          {so.qcNotes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan Inspeksi</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{so.qcNotes}</p>
            </div>
          )}

          {so.qcPhotos && so.qcPhotos.length > 0 && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Bukti ({so.qcPhotos.length})</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {so.qcPhotos.map((p, i) => (
                  <div key={i} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <ImageIcon size={20} style={{ color: S.secondary }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ paddingTop: 8 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QCPage() {
  return <EngineeringQCPage />;
}
