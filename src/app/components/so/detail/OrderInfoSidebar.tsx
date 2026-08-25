import React from "react";
import { SalesOrder, Customer } from "../../data/mockData";
import { S } from "./shared";
import { formatUrl } from "../../../services/backendIds";
import { Download, Plus, QrCode, FileText } from "lucide-react";
import { QRCodeCanvas } from 'qrcode.react';

interface OrderInfoSidebarProps {
  order: SalesOrder;
  customer?: Customer;
  currentUserRole: string;
  isEditMode: boolean;
  editForm: {
    customerName: string;
    company: string;
    phone: string;
    contact: string;
    address: string;
    description: string;
    quantity: string;
    unit: string;
    deadline: string;
    notes: string;
    customerDrawingUrl: string;
  };
  setEditForm: React.Dispatch<React.SetStateAction<{
    customerName: string;
    company: string;
    phone: string;
    contact: string;
    address: string;
    description: string;
    quantity: string;
    unit: string;
    deadline: string;
    notes: string;
    customerDrawingUrl: string;
  }>>;
  isDesignLocked: boolean;
}

function QrCodeCard({ order }: { order: SalesOrder }) {
  const downloadQR = () => {
    const canvas = document.getElementById("so-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${order.id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const formattedId = (order.backendId || order.id).replace(/-/g, '');
  const dateStr = (order.createdAt || new Date().toISOString()).substring(0, 10).replace(/-/g, '');
  const barcode = `PJT|SO|${dateStr}|${formattedId}`;

  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate, display: "flex", alignItems: "center", gap: 6 }}>
          <QrCode size={14} /> Pelacakan QR Code
        </p>
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <QRCodeCanvas id="so-qr-canvas" value={barcode} size={130} level="M" />
        <p style={{ fontSize: "10px", color: S.secondary, fontFamily: "monospace", margin: 0, wordBreak: "break-all", textAlign: "center" }}>
          {barcode}
        </p>
        <button
          onClick={downloadQR}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "8px", borderRadius: 4,
            border: `1px solid ${S.border}`, background: "#fff",
            color: S.slate, fontSize: "12px", fontWeight: 500,
            cursor: "pointer", marginTop: 4, transition: "background 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
        >
          <Download size={14} /> Download QR Code
        </button>
        <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8", textAlign: "center" }}>
          Kirimkan QR ini ke pelanggan untuk melacak progres di halaman utama.
        </p>
      </div>
    </div>
  );
}

function OrderHistory({ order }: { order: SalesOrder }) {
  const historySteps: { label: string; date?: string; active: boolean; isRejection?: boolean; reason?: string }[] = [
    { label: 'Desain Disetujui', date: order.designApprovedAt, active: !!order.designApprovedAt },
    { label: 'Sales Order Rilis', date: order.createdAt, active: !!order.createdAt },
    { label: 'Invoice Diterbitkan', date: order.invoice?.invoiceDate, active: !!order.invoice?.invoiceDate }
  ];

  if (order.invoice?.rejectedPayments && !order.invoice?.paymentDate) {
    order.invoice.rejectedPayments.forEach(rp => {
      historySteps.push({
        label: 'Pembayaran Ditolak',
        date: rp.date,
        active: true,
        isRejection: true,
        reason: rp.reason
      });
    });
  }

  historySteps.push(
    { label: 'Lunas', date: order.invoice?.paymentDate, active: !!order.invoice?.paymentDate }
  );

  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>End-to-End History</p>
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {historySteps.map((step, idx, arr) => (
          <div key={idx} style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: step.isRejection ? "#FEF2F2" : (step.active ? S.cyan : "#F1F5F9"), border: `2px solid ${step.isRejection ? "#EF4444" : (step.active ? S.cyan : "#CBD5E1")}`, zIndex: 1 }} />
              {idx < arr.length - 1 && (
                <div style={{ width: 2, flex: 1, background: step.active ? (step.isRejection ? "#F1F5F9" : "#A5F3FC") : "#F1F5F9", marginTop: -2, marginBottom: -4 }} />
              )}
            </div>
            <div style={{ paddingTop: -1, paddingBottom: 4 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: step.active ? 600 : 400, color: step.isRejection ? "#DC2626" : (step.active ? S.slate : "#94A3B8") }}>{step.label}</p>
              {step.date && <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.secondary }}>{step.date}</p>}
              {step.reason && <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#EF4444", fontStyle: "italic" }}>Alasan: {step.reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignSection({ order, isEditMode, editForm, setEditForm, isDesignLocked, currentUserRole }: OrderInfoSidebarProps) {
  if (order.designId && order.designId !== "none" && order.designId !== "customer") return null;

  return (
    <>
      <div style={{ height: 1, background: "#F8FAFC" }} />
      <div>
        {isEditMode ? (
          <>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>
              {order.designReference === "INTERNAL_DESIGN" ? "Link Desain" : "Referensi Desain"}
            </p>
            <input
              type="text"
              placeholder="https://... (Opsional)"
              value={editForm.customerDrawingUrl}
              onChange={e => setEditForm(prev => ({ ...prev, customerDrawingUrl: e.target.value }))}
              disabled={isDesignLocked}
              style={{ marginTop: 4, width: "100%", padding: "6px 8px", fontSize: "11.5px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", backgroundColor: isDesignLocked ? "#F1F5F9" : "white", cursor: isDesignLocked ? "not-allowed" : "text" }}
            />
            {isDesignLocked && (
              <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#EF4444" }}>
                Desain tidak dapat diubah karena pesanan sudah masuk tahap produksi.
              </p>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {order.customerDrawingUrl && (
              <div>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Referensi Desain (Customer)</p>
                <a href={order.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.cyan, textDecoration: "none", wordBreak: "break-all", display: "inline-block" }}>
                  {order.customerDrawingUrl}
                </a>
              </div>
            )}
            {order.designLink && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#F1F5F9", borderRadius: 6, border: `1px solid ${S.border}`, display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", color: S.slate, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><FileText size={12} /> Link Desain / Referensi Tambahan</span>
                <a href={formatUrl(order.designLink)} target="_blank" rel="noreferrer" style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.cyan, textDecoration: "none", wordBreak: "break-all", display: "inline-block" }}>
                  {order.designLink}
                </a>
              </div>
            )}
            {!order.customerDrawingUrl && !order.designLink && order.designId === "none" && (
              <div>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Link Desain</p>
                <p style={{ margin: 0, fontSize: "11.5px", color: "#64748B", fontWeight: 600 }}>Menunggu desain dari tim Engineering</p>
              </div>
            )}
            {!order.customerDrawingUrl && !order.designLink && order.designId !== "none" && (
              <div>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Referensi Desain</p>
                <p style={{ margin: 0, fontSize: "11.5px", color: "#F59E0B", fontWeight: 600 }}>Menunggu desain dari pelanggan</p>
                {currentUserRole !== 'Engineering' && (
                  <button onClick={() => setEditForm(prev => ({ ...prev, customerDrawingUrl: editForm.customerDrawingUrl }))} style={{ marginTop: 6, padding: "4px 10px", background: "#EFF6FF", border: `1px solid #BFDBFE`, color: "#1D4ED8", borderRadius: 4, fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"} onMouseLeave={e => e.currentTarget.style.background = "#EFF6FF"}>
                    <Plus size={10} /> Link Desain
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}

export function OrderInfoSidebar(props: OrderInfoSidebarProps) {
  const { order } = props;

  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: S.slate }}>Info Order</p>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>No. SO</p>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.cyan, fontWeight: 600 }}>{order.id}</p>
        </div>
        <div style={{ height: 1, background: "#F8FAFC" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Deadline</p>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{order.deadline}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Qty</p>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: S.slate }}>{order.quantity.toLocaleString("id-ID")} {order.unit}</p>
          </div>
        </div>
        {order.notes && (
          <>
            <div style={{ height: 1, background: "#F8FAFC" }} />
            <div>
              <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Catatan</p>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: S.secondary, lineHeight: 1.5 }}>{order.notes}</p>
            </div>
          </>
        )}
        <DesignSection {...props} />
      </div>
    </div>
  );
}

export { QrCodeCard, OrderHistory };
