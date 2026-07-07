import React from "react";
import { GripVertical, Trash2, Hash, Link as LinkIcon, Plus } from "lucide-react";
import { ENGINEERING_DESIGNS } from "../../data/mockData";
import { Label, Input, CurrencyInput, Select } from "./FormHelpers";

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bg: "#F1F5F9",
  bgHover: "#E2E8F0",
  white: "#FFFFFF",
  red: "#EF4444",
  cyan: "#C8102E",
};

interface BOMItem {
  id: string;
  name: string;
  specification: string;
  quantity: string;
  unit: string;
}

export interface ProductRow {
  id: string;
  type: "existing" | "custom";
  productName: string;
  customName: string;
  designId?: string;
  materials: BOMItem[];
  quantity: string;
  unit: string;
  notes: string;
  customerDesignUrl?: string;
  unitPrice?: number;
  materialSpec?: string | null;
}

export interface ProductOption {
  id: string;
  label: string;
  partNumber: string;
  unit: string;
  materialSpec?: string | null;
  bomItems?: { inventoryItemId: string; inventoryItemCode: string; inventoryItemName: string; quantity: number; unit: string; }[];
}

export const emptyProduct = (): ProductRow => ({
  id: crypto.randomUUID(),
  type: "existing",
  productName: "",
  customName: "",
  designId: "",
  materials: [],
  quantity: "",
  unit: "pcs",
  notes: "",
  unitPrice: 0,
  materialSpec: null,
});

interface ProductLineItemProps {
  row: ProductRow;
  index: number;
  total: number;
  productOptions: ProductOption[];
  onChange: (updated: ProductRow) => void;
  onRemove: () => void;
}

export function ProductLineItem({ row, index, total, productOptions, onChange, onRemove }: ProductLineItemProps) {
  const isCustom = row.type === "custom";

  return (
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden", background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", transition: "border-color 0.12s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
        <GripVertical size={13} style={{ color: "#CBD5E1", cursor: "grab", flexShrink: 0 }} />
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: S.cyan, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 500, color: S.slate, flex: 1 }}>
          {isCustom ? (row.customName || "Produk Custom") : (row.productName || "Pilih Produk")}
        </span>

        <div style={{ display: "flex", background: "#E2E8F0", padding: "4px", borderRadius: "8px", flexShrink: 0, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)" }}>
          {(["existing", "custom"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...row, type: t })}
              style={{
                padding: "4px 16px", border: "none", cursor: "pointer", borderRadius: "6px",
                fontSize: "11.5px", fontWeight: row.type === t ? 600 : 500, fontFamily: S.font,
                background: row.type === t ? S.white : "transparent",
                color: row.type === t ? S.slate : "#64748B",
                boxShadow: row.type === t ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {t === "existing" ? "Terdaftar" : "Custom"}
            </button>
          ))}
        </div>

        {total > 1 && (
          <button
            type="button"
            title="Hapus produk ini"
            onClick={onRemove}
            style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", color: "#CBD5E1", transition: "background 0.12s, color 0.12s", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget).style.background = "#FEF2F2"; (e.currentTarget).style.color = S.red; }}
            onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "#CBD5E1"; }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ marginBottom: 10 }}>
          <Label text={isCustom ? "Nama Produk (Manual)" : "Nama Produk"} required />
          {isCustom ? (
            <Input placeholder="Ketik nama produk custom..." value={row.customName} onChange={e => onChange({ ...row, customName: e.target.value })} required />
          ) : (
            <Select value={row.productName} onChange={e => {
              const pName = e.target.value;
              const selected = productOptions.find(product => product.label === pName);
              onChange({
                ...row,
                productName: pName,
                designId: "",
                unit: selected?.unit.toLowerCase() || row.unit,
                materials: selected?.bomItems?.length ? selected.bomItems.map(b => ({
                  id: b.inventoryItemId,
                  name: `${b.inventoryItemCode} - ${b.inventoryItemName}`,
                  specification: "",
                  quantity: String(b.quantity),
                  unit: b.unit,
                })) : [],
              });
            }} required>
              <option value="">— Pilih produk —</option>
              {productOptions.map(product => (
                <option key={product.id} value={product.label}>{product.label}</option>
              ))}
            </Select>
          )}
        </div>

        {isCustom && (
          <div style={{ marginBottom: 10 }}>
            <Label text="Sumber Desain / ID Desain" required />
            <Select
              required
              value={row.designId}
              onChange={e => {
                const selectedDesignId = e.target.value;
                if (selectedDesignId === "none" || selectedDesignId === "" || selectedDesignId === "customer") {
                  onChange({ ...row, designId: selectedDesignId, materials: [] });
                } else {
                  const design = ENGINEERING_DESIGNS.find(d => d.id === selectedDesignId);
                  onChange({
                    ...row,
                    designId: selectedDesignId,
                    materials: design ? design.materials.map((m: any) => ({
                      id: m.id,
                      name: m.name,
                      specification: m.spec || "",
                      quantity: String(m.quantity),
                      unit: m.unit
                    })) : []
                  });
                }
              }}
            >
              <option value="">— Pilih Sumber Desain —</option>
              <option value="none">Buatkan desain baru (oleh Tim Engineering)</option>
              <option value="customer">Pelanggan memiliki referensi desain sendiri</option>
              {ENGINEERING_DESIGNS.filter(d => d.status === "Approved").map(d => (
                <option key={d.id} value={d.id}>{d.id} - {d.name} (Desain Tersimpan)</option>
              ))}
            </Select>
            {row.designId === "customer" ? (
              <div style={{ marginTop: 8 }}>
                <Label text="URL Gambar/Referensi" required />
                <Input icon={<LinkIcon size={11} />} type="url" placeholder="https://link-referensi-desain..." value={row.customerDesignUrl || ""} onChange={e => onChange({ ...row, customerDesignUrl: e.target.value })} required />
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>
                  *Wajib diisi agar Tim Engineering dapat merancang desain dan menyelesaikan BOM.
                </p>
              </div>
            ) : row.designId === "none" ? (
              <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>
                *Tim Engineering akan merancang desain dari awal berdasarkan catatan/kebutuhan.
              </p>
            ) : null}
          </div>
        )}

        {row.materialSpec && (
          <div style={{ marginBottom: 16, background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 6, padding: 12 }}>
            <Label text="Catatan Spesifikasi (Material Spec)" />
            <div style={{ marginTop: 4, fontSize: "12px", color: S.slate, whiteSpace: "pre-wrap", fontFamily: S.font }}>
              {row.materialSpec}
            </div>
          </div>
        )}

        {row.materials && row.materials.length > 0 && (
          <div style={{ marginBottom: 16, background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 6, padding: 12 }}>
            <Label text="Bill of Materials (BOM) — Read Only" />
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: S.font }}>
                <thead>
                  <tr style={{ background: "#E2E8F0", textAlign: "left", color: S.secondary }}>
                    <th style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}` }}>Material</th>
                    <th style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}` }}>Spesifikasi</th>
                    <th style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, textAlign: "right" }}>Total Dibutuhkan</th>
                  </tr>
                </thead>
                <tbody>
                  {row.materials.map((mat: any, i) => {
                    const totalQty = (Number(mat.quantity) || 0) * (Number(row.quantity) || 1);
                    return (
                      <tr key={mat.id}>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.slate }}>{mat.name}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.secondary }}>{mat.specification || "-"}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.slate, textAlign: "right", fontWeight: 500 }}>{totalQty} {mat.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: S.secondary, fontStyle: "italic" }}>
              *Data material dikunci dan diambil secara otomatis dari {isCustom ? "persetujuan tim Engineering" : "database produk standar"}. Total dihitung: Qty per unit × Jumlah produk.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "120px 90px 150px 1fr", gap: 10 }}>
          <div>
            <Label text="Jumlah (Qty)" required />
            <Input icon={<Hash size={11} />} type="number" min="1" placeholder="0" value={row.quantity} onChange={e => onChange({ ...row, quantity: e.target.value })} required />
          </div>
          <div>
            <Label text="Satuan" />
            {!isCustom && row.productName ? (
              <div style={{
                width: "100%", boxSizing: "border-box",
                background: "#F1F5F9", border: "1px solid #CBD5E1",
                borderRadius: 4, padding: "7px 10px",
                fontSize: "12.5px", color: "#475569", fontFamily: S.font,
              }}>
                {row.unit}
              </div>
            ) : (
              <Select value={row.unit} onChange={e => onChange({ ...row, unit: e.target.value })}>
                {["pcs", "unit", "batang", "lembar", "kg", "ton", "set", "roll", "meter", "liter"].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            )}
          </div>
          <div>
            <Label text="Harga Satuan (Rp)" />
            <CurrencyInput icon={<span style={{ fontWeight: 600, fontSize: 11 }}>Rp</span>} placeholder="0" value={row.unitPrice || 0} onChange={(val: number) => onChange({ ...row, unitPrice: val })} />
          </div>
          <div>
            <Label text="Catatan Produk" />
            <Input placeholder="Toleransi, treatment, kemasan..." value={row.notes} onChange={e => onChange({ ...row, notes: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddProductBtn({ onClick, color }: { onClick: () => void; color?: string }) {
  const c = color || S.cyan;
  const borderAlpha = c === S.cyan ? "rgba(200,16,46,0.25)" : "rgba(99,102,241,0.25)";
  const bgAlpha = c === S.cyan ? "rgba(200,16,46,0.06)" : "rgba(99,102,241,0.06)";
  const bgHover = c === S.cyan ? "rgba(200,16,46,0.12)" : "rgba(99,102,241,0.12)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 4, border: `1px solid ${borderAlpha}`, background: bgAlpha, color: c, fontSize: "11.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
      onMouseLeave={e => (e.currentTarget.style.background = bgAlpha)}
    >
      <Plus size={12} /> Tambah Produk
    </button>
  );
}
