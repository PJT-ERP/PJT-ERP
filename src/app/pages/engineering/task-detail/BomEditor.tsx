import React from "react";
import { Trash2 } from "lucide-react";
import { MaterialAutocomplete } from "./MaterialAutocomplete";
import { InventoryItemDto } from "../../../services/masterDataApi";

const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
};

interface BomMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  spec: string;
  inventoryItemId: string;
  code?: string;
  category?: string;
  isCustomerMaterial?: boolean;
  isAddToMasterBOM?: boolean;
}

interface BomEditorProps {
  itemId: string;
  itemName: string;
  itemQty: number;
  itemUnit: string;
  materials: BomMaterial[];
  standardBomItems: { inventoryItemId: string; inventoryItemCode: string; inventoryItemName: string; quantity: number; unit: string }[];
  isStandardProduct: boolean;
  canEdit: boolean;
  inventoryItems: InventoryItemDto[];
  onAddMaterial: (itemId: string, initial?: Partial<{ name: string; quantity: number; unit: string; spec: string; inventoryItemId: string; code: string }>) => void;
  onRemoveMaterial: (itemId: string, mId: string) => void;
  onUpdateMaterial: (itemId: string, mId: string, field: string, value: any) => void;
}

export function BomEditor({
  itemId, itemName, itemQty, itemUnit, materials,
  standardBomItems, isStandardProduct, canEdit,
  inventoryItems, onAddMaterial, onRemoveMaterial, onUpdateMaterial,
}: BomEditorProps) {
  return (
    <div key={itemId} style={{ border: `1px solid ${S.border}`, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
        <span style={{ fontSize: "13.5px", color: S.slate, fontWeight: 600 }}>
          {itemName} <span style={{ color: S.secondary, fontWeight: 400 }}>({itemQty} {itemUnit})</span>
        </span>
        {canEdit && (
          <button onClick={() => onAddMaterial(itemId)} style={{ padding: "6px 12px", background: "#fff", color: S.cyan, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.color = S.cyan; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.cyan; }}
          >
            <Plus size={14} /> {isStandardProduct ? "Tambahan Khusus" : "Tambah Material"}
          </button>
        )}
      </div>

      <div style={{ padding: 16, background: "#fff" }}>
        {/* Standard BOM (Master Data) */}
        {isStandardProduct && standardBomItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: materials.length > 0 ? 16 : 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              BOM Master Data (Otomatis)
            </div>
            {standardBomItems.map((bom, idx) => {
              const existsInCustom = materials.some(m => m.inventoryItemId === bom.inventoryItemId || (m.code && m.code === bom.inventoryItemCode) || m.name === bom.inventoryItemName);
              if (existsInCustom) return null;
              return (
                <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", background: "#F8FAFC", padding: "10px 12px", borderRadius: 6, border: `1px solid ${S.border}` }}>
                  <div style={{ flex: 1, fontSize: "13.5px", color: S.slate, fontWeight: 500 }}>{bom.inventoryItemName || bom.inventoryItemCode}</div>
                  <div style={{ width: 80, fontSize: "13.5px", color: S.slate, textAlign: "right", fontWeight: 600 }}>{bom.quantity}</div>
                  <div style={{ width: 80, fontSize: "13.5px", color: S.secondary, textAlign: "center" }}>{bom.unit}</div>
                  {canEdit && (
                    <button onClick={() => onAddMaterial(itemId, {
                      name: bom.inventoryItemName || bom.inventoryItemCode,
                      quantity: bom.quantity,
                      unit: bom.unit,
                      inventoryItemId: bom.inventoryItemId,
                      code: bom.inventoryItemCode,
                      spec: '',
                    })} title="Tambahkan ke daftar untuk diedit"
                      style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: S.cyan, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "16px", fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                      +
                    </button>
                  )}
                </div>
              );
            })}
            {materials.length === 0 && canEdit && (
              <div style={{ fontSize: "12.5px", color: S.secondary, marginTop: 8, fontStyle: "italic" }}>
                * Klik + untuk menambahkan material ke daftar edit. Gunakan "Tambahan Khusus" untuk material ekstra.
              </div>
            )}
          </div>
        )}

        {/* Custom/Extra Materials */}
        {materials.length === 0 ? (
          !isStandardProduct && (
            <div style={{ textAlign: "center", padding: "30px 20px", color: S.secondary, fontSize: "13.5px", background: "#fff", borderRadius: 8 }}>
              {!canEdit ? "BOM kosong." : "BOM kosong. Silakan tambahkan material."}
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: -4, marginTop: isStandardProduct ? 8 : 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isStandardProduct ? "Material Tambahan (Khusus SO Ini)" : "BOM Custom"}
            </div>
            {materials.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8, background: "#FFFFFF", padding: 12, borderRadius: 8, border: `1px solid ${S.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <div style={{ position: "relative", display: "flex", flex: 1, gap: 12, alignItems: "center", minWidth: 0 }}>
                    <MaterialAutocomplete
                      value={m.name}
                      onChange={val => onUpdateMaterial(itemId, m.id, 'name', val)}
                      onSelectProduct={p => {
                        onUpdateMaterial(itemId, m.id, 'name', p.name);
                        onUpdateMaterial(itemId, m.id, 'unit', p.unit);
                        onUpdateMaterial(itemId, m.id, 'inventoryItemId', p.id);
                        onUpdateMaterial(itemId, m.id, 'code', p.code);
                        if (p.category) onUpdateMaterial(itemId, m.id, 'category', p.category);
                      }}
                      options={inventoryItems}
                      disabled={!canEdit}
                    />
                    <input placeholder="Spesifikasi / Ukuran..." value={m.spec} onChange={e => onUpdateMaterial(itemId, m.id, 'spec', e.target.value)} disabled={!canEdit}
                      style={{ flex: 1, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", minWidth: 0, backgroundColor: canEdit ? "#fff" : "#F8FAFC" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                    <input type="number" min="0" step="any" value={m.quantity || ''} onChange={e => onUpdateMaterial(itemId, m.id, 'quantity', Number(e.target.value))} disabled={!canEdit}
                      style={{ width: 80, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: canEdit ? "#fff" : "#F8FAFC", textAlign: "center" }} />
                    {!m.inventoryItemId ? (
                      <UnitSelect value={m.unit || 'pcs'} onChange={v => onUpdateMaterial(itemId, m.id, 'unit', v)} disabled={!canEdit} />
                    ) : (
                      <input type="text" value={m.unit} readOnly placeholder="pcs" disabled={!canEdit}
                        style={{ width: 100, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: "#F8FAFC", color: S.secondary, cursor: "not-allowed", textAlign: "center" }} />
                    )}
                    {canEdit && (
                      <button onClick={() => onRemoveMaterial(itemId, m.id)} style={{ padding: 8, background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", borderRadius: 4, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, alignSelf: "flex-start", marginTop: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: S.secondary, cursor: canEdit ? "pointer" : "default" }}>
                    <input type="checkbox" checked={m.isCustomerMaterial || false} onChange={e => onUpdateMaterial(itemId, m.id, 'isCustomerMaterial', e.target.checked)} disabled={!canEdit} style={{ margin: 0, cursor: canEdit ? "pointer" : "default" }} />
                    Material dari Pelanggan
                  </label>
                  {m.isCustomerMaterial && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: S.secondary, cursor: canEdit ? "pointer" : "default" }}>
                      <input type="checkbox" checked={m.isAddToMasterBOM || false} onChange={e => onUpdateMaterial(itemId, m.id, 'isAddToMasterBOM', e.target.checked)} disabled={!canEdit} style={{ margin: 0, cursor: canEdit ? "pointer" : "default" }} />
                      Tetap masukkan BOM Master
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ width: 90, padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: disabled ? "#F8FAFC" : "#fff", color: S.slate, cursor: disabled ? "not-allowed" : "pointer", textAlign: "center" }}>
      <option value="pcs">Pcs</option>
      <option value="unit">Unit</option>
      <option value="set">Set</option>
      <option value="kg">Kg</option>
      <option value="meter">Meter</option>
      <option value="liter">Liter</option>
      <option value="roll">Roll</option>
      <option value="lembar">Lembar</option>
    </select>
  );
}

import { Plus } from "lucide-react";
