import { Trash2 } from "lucide-react";
import { S } from "./MaterialRequestHelpers";
import { MaterialAutocomplete } from "./MaterialAutocomplete";

export function MRItemRow({
  item,
  index,
  totalItems,
  bomOptions,
  removeItem,
  updateItem,
}: {
  item: any;
  index: number;
  totalItems: number;
  bomOptions: any[];
  removeItem: (index: number) => void;
  updateItem: (index: number, key: any, value: string) => void;
}) {
  return (
    <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Item #{index + 1}</span>
        {totalItems > 1 && (
          <button type="button" onClick={() => removeItem(index)} style={{ border: "none", background: "transparent", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: 500 }}>
            <Trash2 size={14} /> Hapus
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 2 }}>
          <select
            value={item.materialKey || item.itemName}
            onChange={e => {
              const p = bomOptions.find(o => o.id === e.target.value || o.name === e.target.value);
              if (p) {
                updateItem(index, "materialKey", p.id);
                updateItem(index, "itemName", p.name);
                updateItem(index, "unit", p.unit);
                updateItem(index, "maxQuantity", String(p.maxQuantity));
                if (p.spec) {
                  updateItem(index, "specification", p.spec);
                }
              } else {
                updateItem(index, "materialKey", "");
                updateItem(index, "itemName", "");
              }
            }}
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", outline: "none", fontFamily: S.font, background: "#fff" }}
          >
            <option value="">Pilih Material BOM...</option>
            {bomOptions.map(o => (
              <option key={o.id} value={o.id}>{o.name} {o.spec ? `(${o.spec})` : ''}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <select
            value={item.purchaseCategory}
            onChange={e => updateItem(index, "purchaseCategory", e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg }}
          >
            <option>Project</option>
            <option>Consumable</option>
            <option>Tools</option>
            <option>Maintenance</option>
            <option>Asset</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 2 }}>
          <input
            value={item.specification}
            onChange={e => updateItem(index, "specification", e.target.value)}
            placeholder="Spesifikasi / ukuran..."
            disabled={true}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box", backgroundColor: "#F8FAFC", color: S.secondary }}
          />
        </div>
        <div style={{ width: 80, position: "relative" }}>
          <input
            type="number"
            min="1"
            max={item.maxQuantity}
            value={item.quantity}
            onChange={e => {
              const val = Number(e.target.value);
              if (item.maxQuantity && val > item.maxQuantity) {
                updateItem(index, "quantity", String(item.maxQuantity));
              } else {
                updateItem(index, "quantity", e.target.value);
              }
            }}
            placeholder="Qty"
            required
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
          />
          {item.maxQuantity && (
            <div style={{ position: "absolute", bottom: -18, left: 4, fontSize: "10px", color: S.secondary, whiteSpace: "nowrap" }}>Max: {item.maxQuantity}</div>
          )}
        </div>
        <div style={{ width: 100 }}>
          <select
            value={item.unit}
            onChange={e => updateItem(index, "unit", e.target.value)}
            disabled={true}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: "#F8FAFC", boxSizing: "border-box", color: S.secondary, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
          >
            {Array.from(new Set(["pcs", "kg", "meter", "lembar", "batang", "roll", "set", "box", "pack", item.unit])).filter(Boolean).map(u => (
              <option key={u as string} value={u as string}>{u as string}</option>
            ))}
          </select>
        </div>
        <div style={{ width: 130 }}>
          <select
            value={item.urgency}
            onChange={e => updateItem(index, "urgency", e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg, boxSizing: "border-box" }}
          >
            <option>Normal</option>
            <option>Urgent</option>
            <option>Critical</option>
          </select>
        </div>
      </div>
    </div>
  );
}
