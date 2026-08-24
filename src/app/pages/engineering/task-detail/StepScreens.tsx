import React from "react";
import { CheckCircle, Trash2, Download } from "lucide-react";
import { QRCodeCanvas } from 'qrcode.react';
import { formatUrl } from "../../../services/backendIds";

const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
};

export function StepDone({ completedAsSpv, onBack }: { completedAsSpv: boolean; onBack: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <CheckCircle size={32} style={{ color: "#22C55E" }} />
      </div>
      <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
        {completedAsSpv ? 'Desain Disetujui (Diteruskan ke Finance & Produksi)' : 'Desain Menunggu Approval Supervisor'}
      </h3>
      <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
        {completedAsSpv ? 'Sales Order dilanjutkan ke Finance untuk pembuatan Invoice, dan Supervisor sudah dapat memulai proses produksi.' : 'Status Sales Order menjadi "Waiting Spv Approval"'}
      </p>
      <button onClick={onBack} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Daftar</button>
    </div>
  );
}

export function StepRejected({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: 64, height: 64, background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Trash2 size={32} style={{ color: "#EF4444" }} />
      </div>
      <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>Desain Dikembalikan ke Engineer</h3>
      <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
        Status Penawaran kembali menjadi "Pending Design". Engineer harus merevisi dan mengirim ulang desainnya.
      </p>
      <button onClick={onBack} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Daftar</button>
    </div>
  );
}

export function StepRejectForm({ rejectReason, onReasonChange }: { rejectReason: string; onReasonChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 20 }}>
        <p style={{ color: "#991B1B", margin: 0, fontSize: "14px", fontWeight: 500 }}>Apakah Anda yakin ingin menolak desain ini?</p>
        <p style={{ color: "#B91C1C", margin: "6px 0 0", fontSize: "13px" }}>Desain akan dikembalikan ke Engineer untuk direvisi.</p>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "14px", color: S.slate, fontWeight: 500, marginBottom: 8 }}>
          Catatan Revisi <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <textarea value={rejectReason} onChange={e => onReasonChange(e.target.value)} rows={5} placeholder="Sebutkan apa yang perlu diperbaiki oleh Engineer..."
          style={{ width: "100%", padding: "16px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

export function StepConfirm({ designLink, customerName, qty, unit, newMaterials, customerMaterialsSkipped }: {
  designLink: string; customerName: string; qty: number; unit: string; newMaterials: { name: string; spec: string }[]; customerMaterialsSkipped?: { name: string; spec: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 20 }}>
        <p style={{ color: "#92400E", fontSize: "14px", margin: 0 }}>
          Konfirmasi menyimpan spesifikasi CAD & BOM? Desain akan disetujui langsung oleh Supervisor dan SO langsung masuk ke tahap Siap Produksi (Menunggu Penugasan Operator Produksi).
        </p>
      </div>
      {newMaterials.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "2px solid #EF4444", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <p style={{ color: "#991B1B", fontSize: "14px", fontWeight: 700, margin: 0 }}>
              Material Baru Akan Dibuat ({newMaterials.length})
            </p>
          </div>
          <p style={{ color: "#7F1D1D", fontSize: "13px", margin: "0 0 12px", lineHeight: 1.5 }}>
            BOM ini mengandung material yang belum terdaftar di database dan akan otomatis dibuat sebagai entri baru.
            <strong> Harap periksa kembali — mungkin material sudah ada dengan nama yang berbeda.</strong>
          </p>
          <div style={{ background: "#FFF", borderRadius: 6, border: "1px solid #FECACA", padding: "8px 12px", maxHeight: 140, overflowY: "auto" }}>
            {newMaterials.map((m, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#991B1B", padding: "4px 0", borderBottom: i < newMaterials.length - 1 ? "1px solid #FECACA" : "none" }}>
                {m.name}{m.spec ? ` (Spec: ${m.spec})` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {customerMaterialsSkipped && customerMaterialsSkipped.length > 0 && (
        <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <p style={{ color: "#166534", fontSize: "14px", fontWeight: 700, margin: 0 }}>
              Material Dari Pelanggan ({customerMaterialsSkipped.length})
            </p>
          </div>
          <p style={{ color: "#14532D", fontSize: "13px", margin: "0 0 12px", lineHeight: 1.5 }}>
            Material berikut ditandai sebagai <strong>Material dari Pelanggan</strong> dan TIDAK dimasukkan ke dalam BOM Master. Material ini hanya akan dicatat pada SO saat ini dan dilewati saat persiapan produksi di pabrik. <strong>Material ini juga tidak akan muncul jika produk ini dipesan di SO baru (New Order) di masa depan kecuali Anda mencentang "Tetap masukkan BOM Master".</strong>
          </p>
          <div style={{ background: "#FFF", borderRadius: 6, border: "1px solid #86EFAC", padding: "8px 12px", maxHeight: 140, overflowY: "auto" }}>
            {customerMaterialsSkipped.map((m, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#166534", padding: "4px 0", borderBottom: i < customerMaterialsSkipped.length - 1 ? "1px solid #86EFAC" : "none" }}>
                {m.name}{m.spec ? ` (Spec: ${m.spec})` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 16, fontSize: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${S.border}`, paddingBottom: 12 }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customerName}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${S.border}`, paddingBottom: 12 }}><span style={{ color: S.secondary }}>Qty</span><span style={{ color: S.slate, fontWeight: 500 }}>{qty} {unit}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: S.secondary }}>Link Desain</span>
          <a href={formatUrl(designLink)} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "13px", fontWeight: 500, textDecoration: "none", wordBreak: "break-all" }}>
            {designLink}
          </a>
        </div>
      </div>
    </div>
  );
}

export function InfoBanner({ order, customer }: { order: any; customer: any }) {
  const formattedId = (order.backendId || order.id).replace(/-/g, '');
  const dateStr = (order.createdAt || new Date().toISOString()).substring(0, 10).replace(/-/g, '');
  const barcode = `PJT|SO|${dateStr}|${formattedId}`;

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, background: S.bg, padding: 20, borderRadius: 8, border: `1px solid ${S.border}` }}>
        <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Customer</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{customer?.name || "-"}</p></div>
        <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Qty Total</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{order.quantity} {order.unit}</p></div>
        <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Deadline</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{order.deadline || "-"}</p></div>
        <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Input SO</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{order.createdAt?.substring(0, 10) || "-"}</p></div>
      </div>
      <QrCard order={order} barcode={barcode} />
    </div>
  );
}

export function QrCard({ order, barcode }: { order: any; barcode: string }) {
  return (
    <div style={{ background: S.bg, padding: "20px", borderRadius: 8, border: `1px solid ${S.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minWidth: 160 }}>
      <QRCodeCanvas id="so-qr-code" value={barcode} size={100} level="M" />
      <span style={{ fontSize: "10px", color: S.secondary, fontFamily: "monospace", textAlign: "center", wordBreak: "break-all" }}>{barcode}</span>
      <button
        onClick={() => {
          const canvas = document.getElementById("so-qr-code") as HTMLCanvasElement;
          if (canvas) {
            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = url;
            link.download = `QR-${order.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff", border: `1px solid ${S.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer", color: S.slate, fontSize: "12px", fontWeight: 500, marginTop: "4px" }}
      >
        <Download size={14} /> Download QR
      </button>
    </div>
  );
}
