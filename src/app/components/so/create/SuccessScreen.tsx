import React from "react";
import { CheckCircle2 } from "lucide-react";

const S = {
  font: "Inter, sans-serif",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bg: "#F1F5F9",
  white: "#FFFFFF",
  cyan: "#C8102E",
};

interface SuccessScreenProps {
  generatedSoNumber: string;
  totalItems: number;
  isCustomSubmit: boolean;
  isEdit: boolean;
  onReset: () => void;
  onViewList: () => void;
}

export function SuccessScreen({ generatedSoNumber, totalItems, isCustomSubmit, isEdit, onReset, onViewList }: SuccessScreenProps) {
  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: S.font }}>
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 8, padding: 40, textAlign: "center", maxWidth: 460, width: "100%" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle2 size={28} style={{ color: "#22C55E" }} />
        </div>
        <h2 style={{ color: S.slate, marginBottom: 6 }}>{isEdit ? "Quotation Diperbarui" : "Quotation Berhasil Dibuat"}</h2>
        <p style={{ color: S.secondary, fontSize: "13px", marginBottom: 4 }}>Nomor Quotation / Order:</p>
        <p style={{ color: S.cyan, fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{generatedSoNumber}</p>
        <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 20px" }}>
          {totalItems} item produk · {isEdit ? "Perubahan disimpan" : "Tersimpan di backend"}
        </p>
        <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "10px 14px", marginBottom: 24, textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>
            <span style={{ fontWeight: 600, color: "#F59E0B" }}>Langkah selanjutnya:</span>
            {" "}
            {isCustomSubmit
              ? "Draft Quotation telah disimpan. Penawaran ini masuk ke antrean Tim Engineering untuk di-assign ke engineer dan dibuatkan gambar & BOM."
              : "Pesanan repeat telah disimpan dan diteruskan ke tim Finance untuk penetapan DP/Harga."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onReset}
            style={{ flex: 1, padding: "8px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.slate, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = S.white)}
          >Buat QU Lagi</button>
          <button onClick={onViewList}
            style={{ flex: 1, padding: "8px 16px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "opacity 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >Lihat Daftar Order & QU</button>
        </div>
      </div>
    </div>
  );
}
