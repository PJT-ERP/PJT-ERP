import React from "react";
import { SalesOrder, Customer } from "../../data/mockData";
import { S, formatCurrency, InfoRow, InfoCard } from "./shared";
import { Box, Calendar, Clock, FileText, Hash, Package, Receipt } from "lucide-react";

interface ProductLine {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  notes: string;
  designReference: string;
  customerDrawingUrl: string;
}

interface ProductInfoEditForm {
  description: string;
  quantity: string;
  unit: string;
  deadline: string;
  notes: string;
}

interface ProductInfoCardProps {
  order: SalesOrder;
  customer?: Customer;
  isEditMode: boolean;
  editForm: ProductInfoEditForm;
  setEditForm: (updater: (prev: any) => any) => void;
  displayMaterials: any[];
  isCustomBackend: boolean;
  productLines: ProductLine[];
  orderValue: number;
}

function ProductionSchedule({ order }: { order: SalesOrder }) {
  if (!order.startTime && !order.endTime) return null;

  return (
    <InfoCard title="Jadwal Eksekusi Produksi" icon={<Clock size={13} />}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>Waktu Mulai Mesin</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: S.slate, fontWeight: 500 }}>{order.startTime ? new Date(order.startTime).toLocaleString("id-ID") : '-'}</p>
          </div>
          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <p style={{ margin: 0, fontSize: "11px", color: S.secondary }}>Waktu Selesai Produksi</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: S.slate, fontWeight: 500 }}>{order.endTime ? new Date(order.endTime).toLocaleString("id-ID") : '-'}</p>
          </div>
        </div>
        {order.lateReason && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", borderRadius: 6, display: "flex", gap: 10 }}>
            <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#B45309" }}>Catatan Keterlambatan</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#92400E" }}>{order.lateReason}</p>
            </div>
          </div>
        )}
      </div>
    </InfoCard>
  );
}

function BomCard({ materials, showWarning }: { materials: any[], showWarning?: boolean }) {
  if (!materials || materials.length === 0) {
    return (
      <InfoCard title="Bill of Materials (Kebutuhan Bahan)" icon={<Box size={13} />}>
        <p style={{ margin: 0, fontSize: "12px", color: S.secondary, textAlign: "center", padding: "10px 0" }}>Belum ada data material.</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Bill of Materials (Kebutuhan Bahan)" icon={<Box size={13} />}>
      {showWarning && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={14} style={{ color: "#EF4444", flexShrink: 0 }} />
          <span style={{ fontSize: "11.5px", color: "#B91C1C", fontFamily: S.font }}>
            <strong>BOM dapat berubah:</strong> Pesanan ini memerlukan revisi desain. Material di bawah ini adalah estimasi dari desain sebelumnya dan dapat diubah oleh tim Engineering.
          </span>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: S.font }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, color: S.secondary, textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>ID</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Nama Material</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Spesifikasi</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat: any) => (
              <tr key={mat.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={{ padding: "8px 12px", color: S.slate, fontFamily: "monospace", fontSize: "11px", whiteSpace: "nowrap" }}>{mat.code || "-"}</td>
                <td style={{ padding: "8px 12px", color: S.slate }}>{mat.name || "-"}</td>
                <td style={{ padding: "8px 12px", color: S.slate }}>{mat.spec || "-"}</td>
                <td style={{ padding: "8px 12px", color: S.slate, textAlign: "right", fontWeight: 500, whiteSpace: "nowrap" }}>{mat.quantity} {mat.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoCard>
  );
}

import { AlertTriangle } from "lucide-react";

export function ProductInfoCard({
  order, isEditMode, editForm, setEditForm, displayMaterials,
  isCustomBackend, productLines, orderValue,
}: ProductInfoCardProps) {
  const hasUnitPrice = productLines.some(item => item.unitPrice > 0);

  return (
    <>
      <InfoCard title="Informasi Produk" icon={<Package size={13} />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
          <InfoRow icon={<Hash size={11} />} label="No. PO" value={order.soNumber || order.id} isEdit={false} />
          <InfoRow icon={<Calendar size={11} />} label="Deadline" value={isEditMode ? editForm.deadline : order.deadline} isEdit={isEditMode} type="date" onChange={v => setEditForm(prev => ({ ...prev, deadline: v }))} />
          <InfoRow icon={<Receipt size={11} />} label="Nilai SO" value={formatCurrency(orderValue)} isEdit={false} />
          {isCustomBackend && (
            <div style={{ gridColumn: "1 / -1" }}>
              <InfoRow icon={<FileText size={11} />} label="Sumber Desain" value={order.designReference === "INTERNAL_DESIGN" ? "Butuh Desain Engineering Internal" : (order.customerDrawingUrl || order.designLink ? "Referensi Desain dari Customer" : "Belum ditentukan")} isEdit={false} />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <InfoRow icon={<FileText size={11} />} label="Catatan Umum" value={isEditMode ? editForm.notes : (order.notes || "-")} isEdit={isEditMode} onChange={v => setEditForm(prev => ({ ...prev, notes: v }))} />
          </div>
        </div>

        <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "52px minmax(180px, 1.6fr) 110px 120px 120px", gap: 0, background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["No.", "Produk", "Qty", "Harga", "Subtotal"].map(label => (
              <div key={label} style={{ padding: "8px 10px", fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            ))}
          </div>
          {productLines.map((item, index) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "52px minmax(180px, 1.6fr) 110px 120px 120px", borderBottom: index === productLines.length - 1 ? "none" : "1px solid #F1F5F9", alignItems: "center" }}>
              <div style={{ padding: "10px", fontSize: "12px", color: S.secondary }}>{index + 1}</div>
              <div style={{ padding: "10px", minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", color: S.slate, fontWeight: 600 }}>{item.productName}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: S.secondary }}>Kode Produk: {item.productCode}</p>
                {(() => {
                  if (!item.notes) return null;
                  let bomMaterials: { name?: string; spec?: string; specification?: string; quantity?: number; unit?: string }[] | null = null;
                  try {
                    const parsed = JSON.parse(item.notes);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                      bomMaterials = parsed;
                    }
                  } catch { /* not JSON, render as plain text */ }
                  if (bomMaterials) {
                    return (
                      <div style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748B", background: "#F8FAFC", borderRadius: 4, padding: "6px 8px" }}>
                        <span style={{ fontWeight: 600, color: "#94A3B8" }}>BOM: </span>
                        {bomMaterials.map((m, i) => (
                          <span key={i}>
                            {m.name || m.specification}{m.quantity && ` (${m.quantity} ${m.unit || ''})`}{i < bomMaterials!.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  return <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94A3B8" }}>{item.notes}</p>;
                })()}
              </div>
              <div style={{ padding: "10px", fontSize: "12px", color: S.slate }}>{item.quantity} {item.unit}</div>
              <div style={{ padding: "10px", fontSize: "12px", color: S.slate }}>{formatCurrency(item.unitPrice)}</div>
              <div style={{ padding: "10px", fontSize: "12px", color: S.slate, fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</div>
            </div>
          ))}
        </div>

        {isEditMode && (
          <p style={{ margin: "10px 0 0", fontSize: "11px", color: S.secondary }}>
            Edit multi item SO masih mengikuti kontrak backend. Gunakan Duplikat untuk membuat SO baru dengan item tambahan.
          </p>
        )}
      </InfoCard>

      <BomCard materials={displayMaterials} showWarning={isCustomBackend && order?.materials && order.materials.length > 0} />
      <ProductionSchedule order={order} />
    </>
  );
}
