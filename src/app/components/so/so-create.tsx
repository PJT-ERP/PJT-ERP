import React, { useState, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, CheckCircle2,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText, Search,
  ChevronRight, Trash2, GripVertical,
  Layers, Link as LinkIcon, DollarSign
} from "lucide-react";
import { ENGINEERING_DESIGNS } from "../data/mockData";
import { useApp } from "../context/AppContext";
import { salesApi } from "../../services/salesApi";

interface SOCreateProps {
  onNavigate: (page: string, data?: unknown) => void;
  initialData?: { customerId?: string; orderType?: "new" | "repeat"; mode?: string; soId?: string };
}

type OrderType = "new" | "repeat" | null;

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E", // Brand red
  slate: "#1F1F1F", // Darker slate (slate-900)
  secondary: "#475569", // Darker secondary text (slate-600)
  border: "#CBD5E1", // Darker border (slate-300) for visibility
  bg: "#F1F5F9", // Slightly darker bg (slate-100)
  bgHover: "#E2E8F0", // slate-200
  white: "#FFFFFF",
  red: "#EF4444",
  cyan: "#C8102E", // Map cyan to primary brand red to fix undefined references
};

// ─── Product line item ────────────────────────────────────────────────────────
interface BOMItem {
  id: string;
  name: string;
  specification: string;
  quantity: string;
  unit: string;
}

interface ProductRow {
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

interface ProductOption {
  id: string;
  label: string;
  partNumber: string;
  unit: string;
  materialSpec?: string | null;
  bomItems?: { inventoryItemId: string; inventoryItemCode: string; inventoryItemName: string; quantity: number; unit: string; }[];
}

const emptyProduct = (): ProductRow => ({
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

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

// ─── Customer form ────────────────────────────────────────────────────────────
interface CustomerForm {
  customerCode: string;
  customerName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  deadline: string;
  generalNotes: string;
  estimatedAmount?: number;
}

interface RepeatForm {
  customerId: string;
  previousSoId: string;
  deadline: string;
  generalNotes: string;
  estimatedAmount?: number;
}

// ─── Primitive UI helpers ─────────────────────────────────────────────────────
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 500, color: "#475569", marginBottom: 4, fontFamily: S.font }}>
      {text}{required && <span style={{ color: S.red, marginLeft: 2 }}>*</span>}
    </label>
  );
}

function Input({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none", display: "flex" }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        style={{
          width: "100%", boxSizing: "border-box",
          background: focused ? S.white : "#FAFAFA",
          border: `1px solid ${focused ? S.primary : S.border}`,
          borderRadius: 4, padding: icon ? "7px 10px 7px 30px" : "7px 10px",
          fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none",
          boxShadow: focused ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
          transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          ...props.style,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      />
    </div>
  );
}

function CurrencyInput({ value, onChange, icon, ...props }: any) {
  const [focused, setFocused] = useState(false);

  const formatNumber = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return "";
    return val.toLocaleString("id-ID");
  };

  const [displayValue, setDisplayValue] = useState(formatNumber(value));

  React.useEffect(() => {
    if (!focused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(rawVal ? Number(rawVal).toLocaleString("id-ID") : "");
    onChange(Number(rawVal));
  };

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none", display: "flex" }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        style={{
          width: "100%", boxSizing: "border-box",
          background: focused ? S.white : "#FAFAFA",
          border: `1px solid ${focused ? S.primary : S.border}`,
          borderRadius: 4, padding: icon ? "7px 10px 7px 30px" : "7px 10px",
          fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none",
          boxShadow: focused ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
          transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          ...props.style,
        }}
        onFocus={(e: any) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e: any) => { setFocused(false); props.onBlur?.(e); }}
      />
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      rows={props.rows ?? 2}
      style={{
        width: "100%", boxSizing: "border-box",
        background: focused ? S.white : "#FAFAFA",
        border: `1px solid ${focused ? S.primary : S.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none", resize: "none",
        boxShadow: focused ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        width: "100%", boxSizing: "border-box",
        background: focused ? S.white : "#FAFAFA",
        border: `1px solid ${focused ? S.primary : S.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none", cursor: "pointer",
        boxShadow: focused ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    >
      {children}
    </select>
  );
}

function SearchableCustomerSelect({ customers, value, onChange }: { customers: any[]; value: string; onChange: (val: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.code === value);
  const displayValue = open ? search : (selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.code})` : "");

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase()))
  );

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Cari nama, kode, atau PIC pelanggan..."
          value={displayValue}
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: open ? S.white : "#FAFAFA",
            border: `1px solid ${open ? S.primary : S.border}`,
            borderRadius: 4, padding: "7px 10px 7px 30px",
            fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none",
            boxShadow: open ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
            transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          }}
        />
        <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: S.white, border: `1px solid ${S.border}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 220, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px", fontSize: "12px", color: S.secondary, textAlign: "center" }}>Pelanggan tidak ditemukan</div>
          ) : (
            filtered.map(c => (
              <div
                key={c.code}
                onClick={() => {
                  onChange(c.code);
                  setSearch("");
                  setOpen(false);
                }}
                style={{ padding: "8px 12px", fontSize: "12.5px", color: S.slate, cursor: "pointer", borderBottom: `1px solid ${S.bg}` }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontWeight: 500, color: S.slate }}>{c.name}</div>
                <div style={{ fontSize: "11px", color: S.secondary, display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ color: S.primary, fontWeight: 500 }}>{c.code}</span>
                  {c.contactPerson && <span>· PIC: {c.contactPerson}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: S.bg, borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
        <span style={{ color: S.primary }}>{icon}</span>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: S.slate, fontFamily: S.font, flex: 1 }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

// ─── Product Line Item ────────────────────────────────────────────────────────
interface ProductRowProps {
  row: ProductRow;
  index: number;
  total: number;
  productOptions: ProductOption[];
  onChange: (updated: ProductRow) => void;
  onRemove: () => void;
}

function ProductLineItem({ row, index, total, productOptions, onChange, onRemove }: ProductRowProps) {
  const isCustom = row.type === "custom";

  return (
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden", background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", transition: "border-color 0.12s" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
        <GripVertical size={13} style={{ color: "#CBD5E1", cursor: "grab", flexShrink: 0 }} />
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: S.cyan, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 500, color: S.slate, flex: 1 }}>
          {isCustom ? (row.customName || "Produk Custom") : (row.productName || "Pilih Produk")}
        </span>

        {/* Type toggle */}
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

      {/* Fields */}
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
            <Label text="Sumber Desain / ID Desain" />
            <Select
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
                <Input icon={<LinkIcon size={11} />} type="url" placeholder="URL Gambar/Referensi (Opsional)" value={row.customerDesignUrl || ""} onChange={e => onChange({ ...row, customerDesignUrl: e.target.value })} />
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>
                  *Kosongkan jika pelanggan akan mengirimkan desain menyusul (Engineering akan menunggu).
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
                    <th style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, textAlign: "right" }}>Qty</th>
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
              *Data material dikunci dan diambil secara otomatis dari {isCustom ? "persetujuan tim Engineering" : "database produk standar"}.
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

// ─── Add Product Button ───────────────────────────────────────────────────────
function AddProductBtn({ onClick, color = S.cyan }: { onClick: () => void; color?: string }) {
  const borderAlpha = color === S.cyan ? "rgba(200,16,46,0.25)" : "rgba(99,102,241,0.25)";
  const bgAlpha = color === S.cyan ? "rgba(200,16,46,0.06)" : "rgba(99,102,241,0.06)";
  const bgHover = color === S.cyan ? "rgba(200,16,46,0.12)" : "rgba(99,102,241,0.12)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 4, border: `1px solid ${borderAlpha}`, background: bgAlpha, color, fontSize: "11.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
      onMouseLeave={e => (e.currentTarget.style.background = bgAlpha)}
    >
      <Plus size={12} /> Tambah Produk
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SOCreate({ onNavigate, initialData }: SOCreateProps) {
  const { customers, productCatalog, salesOrders, refreshBackendData, updateSalesOrder } = useApp();
  const catalogProductOptions = productCatalog.map(product => ({
    id: product.id,
    label: `${product.partNumber} - ${product.description}`,
    partNumber: product.partNumber,
    unit: product.unit || "pcs",
    materialSpec: product.materialSpec,
    bomItems: product.bomItems,
  }));

  const isEdit = initialData?.mode === "edit";
  const editSoId = initialData?.soId;
  const existingAppSo = isEdit ? salesOrders.find(s => s.id === editSoId) : null;

  const prefillCustomer = initialData?.customerId
    ? customers.find(c => c.code === initialData.customerId)
    : existingAppSo ? customers.find(c => c.code === existingAppSo.customerId) : null;

  const [orderType, setOrderType] = useState<OrderType>(isEdit ? "new" : initialData?.orderType ?? null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    customerCode: prefillCustomer?.code ?? `CUST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    customerName: prefillCustomer?.contactPerson ?? prefillCustomer?.contact ?? "",
    company: prefillCustomer?.name ?? "",
    phone: prefillCustomer?.phone ?? "",
    email: prefillCustomer?.email ?? (prefillCustomer?.contact && prefillCustomer?.contact.includes('@') ? prefillCustomer.contact : ""),
    address: prefillCustomer?.address ?? "",
    deadline: existingAppSo?.deadline ?? "",
    generalNotes: "",
    estimatedAmount: 0,
  });

  const [products, setProducts] = useState<ProductRow[]>([
    existingAppSo ? {
      ...emptyProduct(),
      type: "custom",
      productName: existingAppSo.description,
      customName: existingAppSo.description,
      quantity: String(existingAppSo.quantity),
      unit: existingAppSo.unit,
      materials: emptyProduct().materials,
    } : emptyProduct()
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [generatedSONumber, setGeneratedSONumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(!!initialData?.customerId);

  const today = new Date().toISOString().split("T")[0];

  const [repeatForm, setRepeatForm] = useState<RepeatForm>({
    customerId: initialData?.customerId || "", previousSoId: initialData?.soId || "", deadline: today, generalNotes: "", estimatedAmount: 0
  });

  const [repeatProducts, setRepeatProducts] = useState<ProductRow[]>([]);

  const selectedCustomer = orderType === "repeat"
    ? customers.find(c => c.code === repeatForm.customerId)
    : null;

  React.useEffect(() => {
    if (orderType === "repeat" && repeatForm.previousSoId && repeatProducts.length === 0 && salesOrders.length > 0) {
      const selectedSo = salesOrders.find(so => so.id === repeatForm.previousSoId || so.soNumber === repeatForm.previousSoId);
      if (selectedSo) {
        setRepeatForm(prev => ({
          ...prev,
          estimatedAmount: selectedSo.estimatedAmount || 0,
          generalNotes: selectedSo.notes || "",
        }));

        const matchedProduct = catalogProductOptions.find(p => p.label.includes(selectedSo.description));
        let materials: any[] = [];
        if (matchedProduct) {
          materials = matchedProduct.bomItems?.length ? matchedProduct.bomItems.map((b: any) => ({
            id: b.inventoryItemId,
            name: `${b.inventoryItemCode} - ${b.inventoryItemName}`,
            specification: "",
            quantity: String(b.quantity),
            unit: b.unit,
          })) : [];
        }

        setRepeatProducts([{
          ...emptyProduct(),
          type: matchedProduct ? "existing" : "custom",
          productName: matchedProduct ? matchedProduct.label : selectedSo.description,
          customName: selectedSo.description,
          quantity: String(selectedSo.quantity),
          unit: selectedSo.unit,
          unitPrice: selectedSo.estimatedAmount && selectedSo.quantity ? Math.floor(selectedSo.estimatedAmount / selectedSo.quantity) : 0,
          materials,
        }]);
      }
    }
  }, [orderType, repeatForm.previousSoId, salesOrders, repeatProducts.length, catalogProductOptions]);

  React.useEffect(() => {
    if (orderType === "new") {
      const total = products.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
      setCustomerForm(f => ({ ...f, estimatedAmount: total }));
    }
  }, [products, orderType]);

  const handleBack = () => {
    if (orderType) {
      handleReset();
    } else {
      onNavigate("so-list");
    }
  };

  const updateProduct = useCallback((id: string, updated: ProductRow, list: ProductRow[], setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => {
    setter(list.map(p => p.id === id ? updated : p));
  }, []);

  const addProduct = (setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => [...prev, emptyProduct()]);
  const removeProduct = (id: string, setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => prev.filter(p => p.id !== id));

  const handleReset = () => {
    setSubmitted(false); setOrderType(null); setGeneratedSONumber("");
    setIsExistingCustomer(false);
    setCustomerForm({ customerCode: `CUST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, customerName: "", company: "", phone: "", email: "", address: "", deadline: "", generalNotes: "", estimatedAmount: 0 });
    setProducts([emptyProduct()]); setRepeatForm({ customerId: "", previousSoId: "", deadline: today, generalNotes: "", estimatedAmount: 0 });
    setRepeatProducts([]);
  };

  const handleRepeatSoSelect = (soId: string) => {
    const selectedSo = salesOrders.find(so => so.id === soId || so.soNumber === soId);
    setRepeatForm({
      ...repeatForm,
      previousSoId: soId,
      estimatedAmount: selectedSo?.estimatedAmount || 0,
      generalNotes: selectedSo?.notes || "",
    });
    if (selectedSo) {
      const matchedProduct = catalogProductOptions.find(p => p.label.includes(selectedSo.description));
      let materials: any[] = [];
      if (matchedProduct) {
        materials = matchedProduct.bomItems?.length ? matchedProduct.bomItems.map((b: any) => ({
          id: b.inventoryItemId,
          name: `${b.inventoryItemCode} - ${b.inventoryItemName}`,
          specification: "",
          quantity: String(b.quantity),
          unit: b.unit,
        })) : [];
      }

      setRepeatProducts([{
        ...emptyProduct(),
        type: matchedProduct ? "existing" : "custom",
        productName: matchedProduct ? matchedProduct.label : selectedSo.description,
        customName: selectedSo.description,
        quantity: String(selectedSo.quantity),
        unit: selectedSo.unit,
        unitPrice: selectedSo.estimatedAmount && selectedSo.quantity ? Math.floor(selectedSo.estimatedAmount / selectedSo.quantity) : 0,
        materials,
      }]);
    } else {
      setRepeatProducts([]);
    }
  };



  const ensureCustomerId = async (input: {
    code: string;
    company: string;
    customerName: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => {
    const code = input.code.trim().toUpperCase();
    const backendCustomers = await salesApi.listCustomers();
    const existing = backendCustomers.find(customer => customer.code.toUpperCase() === code);
    if (existing) {
      return existing.id;
    }

    const created = await salesApi.createCustomer({
      code,
      name: input.company.trim() || input.customerName.trim() || code,
      address: input.address || null,
      contactPerson: input.customerName.trim() || null,
      email: input.email || null,
      phone: input.phone || null,
    });
    return created.id;
  };

  const ensureProductId = async (row: ProductRow) => {
    const selected = catalogProductOptions.find(product => product.label === row.productName);
    if (selected) {
      return selected.id;
    }

    const name = (row.type === "custom" ? row.customName : row.productName).trim();
    const fallbackName = name || "Custom Product";
    const compact = fallbackName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18) || "CUSTOM";
    const created = await salesApi.createProduct({
      partNumber: `FG-${compact.slice(0, 5)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      description: fallbackName,
      unit: row.unit || "pcs",
      materialSpec: row.materials.map(material => material.specification || material.name).filter(Boolean).join("; ") || row.notes || null,
    });
    return created.id;
  };

  const createSalesOrderFromRows = async (
    customerId: string,
    targetDate: string,
    customerDrawingUrl: string,
    rows: ProductRow[],
  ) => {
    const items = await Promise.all(rows.map(async row => ({
      productId: await ensureProductId(row),
      qty: Number(row.quantity) || 1,
      notes: row.materials && row.materials.length > 0 ? JSON.stringify(row.materials) : (row.notes || null),
    })));

    const payload = {
      customerId,
      soDate: today,
      targetDate,
      customerDrawingUrl: customerDrawingUrl || null,
      designReference: rows.some(r => r.type === "custom" && r.designId === "none") ? "INTERNAL_DESIGN" : null,
      designStatus: rows.some(r => r.type === "custom") ? "PendingDesign" : "Approved",
      items,
    };

    // Retry loop untuk menangani eventual consistency (replikasi PGMQ dari MasterData ke Production)
    let lastError: any;
    for (let i = 0; i < 6; i++) {
      try {
        return await salesApi.createSalesOrder(payload);
      } catch (error: any) {
        lastError = error;
        // Tunggu 2.5 detik sebelum mencoba lagi agar replika MasterData punya waktu sinkronisasi
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    throw lastError;
  };

  const handleNewOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && editSoId) {
      window.alert("Edit Sales Order langsung belum tersedia di backend. Buat SO baru dari QUT atau repeat order untuk E2E.");
      return;
    }

    setIsSubmitting(true);
    try {
      const customerId = await ensureCustomerId({
        code: customerForm.customerCode,
        company: customerForm.company,
        customerName: customerForm.customerName,
        email: customerForm.email,
        phone: customerForm.phone,
        address: customerForm.address,
      });
      const custProduct = products.find(p => p.type === "custom" && p.designId === "customer");
      const finalImageUrl = custProduct?.customerDesignUrl || "";
      const created = await createSalesOrderFromRows(customerId, customerForm.deadline, finalImageUrl, products);

      if (customerForm.estimatedAmount) {
        updateSalesOrder(created.soNumber || created.id, { estimatedAmount: customerForm.estimatedAmount });
      }

      await refreshBackendData();
      setGeneratedSONumber(created.soNumber);
      setSubmitted(true);
    } catch (error: any) {
      if (error?.response?.status === 401) return; // apiClient will handle redirect
      console.error(error);
      window.alert("Gagal membuat Sales Order di backend. Cek data customer, produk, dan URL gambar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepeatOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const customerId = await ensureCustomerId({
        code: selectedCustomer.code,
        company: selectedCustomer.name,
        customerName: selectedCustomer.contactPerson || selectedCustomer.name,
        email: selectedCustomer.email || selectedCustomer.contact,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
      });
      const custRepeatProduct = repeatProducts.find(p => p.type === "custom" && p.designId === "customer");
      const finalImageUrl = custRepeatProduct?.customerDesignUrl || "";
      const created = await createSalesOrderFromRows(customerId, repeatForm.deadline, finalImageUrl, repeatProducts);



      if (repeatForm.estimatedAmount) {
        updateSalesOrder(created.soNumber || created.id, { estimatedAmount: repeatForm.estimatedAmount });
      }

      await refreshBackendData();
      setGeneratedSONumber(created.soNumber);
      setSubmitted(true);
    } catch (error: any) {
      if (error?.response?.status === 401) return; // apiClient will handle redirect
      console.error(error);
      window.alert("Gagal membuat Repeat Order di backend.");
    } finally {
      setIsSubmitting(false);
    }
  };



  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const totalItems = orderType === "repeat"
      ? repeatProducts.length
      : products.length;
    const isCustomSubmit = orderType === "repeat"
      ? repeatProducts.some(r => r.type === "custom")
      : products.some(r => r.type === "custom");

    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: S.font }}>
        <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 8, padding: 40, textAlign: "center", maxWidth: 460, width: "100%" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 size={28} style={{ color: "#22C55E" }} />
          </div>
          <h2 style={{ color: S.slate, marginBottom: 6 }}>{isEdit ? "Sales Order Diperbarui" : "Sales Order Dibuat"}</h2>
          <p style={{ color: S.secondary, fontSize: "13px", marginBottom: 4 }}>Nomor Sales Order:</p>
          <p style={{ color: S.cyan, fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{generatedSONumber}</p>
          <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 20px" }}>
            {totalItems} item produk · {isEdit ? "Perubahan disimpan" : "Tersimpan di backend"}
          </p>
          <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "10px 14px", marginBottom: 24, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>
              <span style={{ fontWeight: 600, color: "#F59E0B" }}>Langkah selanjutnya:</span>
              {" "}
              {isCustomSubmit
                ? "Pesanan telah disimpan. Anda dapat mengubah referensi desain dari Detail SO kapan saja sebelum tim Engineering memulai tahap produksi (In Production)."
                : "Pesanan telah disimpan dan Harga telah ditetapkan. Pesanan akan diteruskan ke tim Finance untuk pembuatan Invoice DP."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset}
              style={{ flex: 1, padding: "8px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.slate, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Buat SO Lagi</button>
            <button onClick={() => onNavigate("so-list")}
              style={{ flex: 1, padding: "8px 16px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >Lihat Daftar SO</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={handleBack}
          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, cursor: "pointer", transition: "background 0.12s, color 0.12s", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget).style.background = S.bg; (e.currentTarget).style.color = S.slate; }}
          onMouseLeave={e => { (e.currentTarget).style.background = S.white; (e.currentTarget).style.color = S.secondary; }}
        >
          <ChevronLeft size={15} />
        </button>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>
            {!orderType ? "Buat Sales Order" : orderType === "repeat" ? "Repeat Order" : "Pesanan Baru"}
          </h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            {!orderType
              ? "Pilih jenis order untuk melanjutkan"
              : orderType === "repeat"
                ? "Pilih pelanggan existing dan tambahkan produk repeat"
                : "Isi form untuk membuat pesanan baru"}
          </p>
        </div>
      </div>

      {/* Step breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {["Jenis Order", orderType === "repeat" ? "Repeat Order" : "Pesanan Baru", "Submit"].map((step, i) => {
          const active = (i === 0 && !orderType) || (i === 1 && !!orderType);
          const done = i === 0 && !!orderType;
          return (
            <React.Fragment key={step}>
              <span style={{ fontSize: "11.5px", color: done ? S.cyan : active ? S.slate : "#CBD5E1", fontWeight: active || done ? 500 : 400 }}>
                {step}
              </span>
              {i < 2 && <ChevronRight size={10} style={{ color: "#CBD5E1" }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Choose order type ─────────────────────────────────────────── */}
      {!orderType && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, maxWidth: 860 }}>
          {[
            { type: "new" as const, icon: <Plus size={22} style={{ color: "#10B981" }} />, title: "Pesanan Baru (New Order)", desc: "Buat Sales Order baru dari awal. Dapat dilanjutkan ke request desain jika pesanan bersifat custom.", accentColor: "#10B981" },
            { type: "repeat" as const, icon: <RefreshCw size={22} style={{ color: "#6366F1" }} />, title: "Repeat Order", desc: "Pilih pelanggan existing dan ulangi order produk sebelumnya. Data auto-fill untuk mempercepat proses.", accentColor: "#6366F1" },
          ].map(card => (
            <button key={card.type} onClick={() => setOrderType(card.type)}
              style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `2px solid ${S.border}`, borderRadius: 8, padding: 22, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s", fontFamily: S.font }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = card.accentColor; (e.currentTarget).style.boxShadow = `0 4px 12px ${card.accentColor}33`; (e.currentTarget).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = S.border; (e.currentTarget).style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"; (e.currentTarget).style.transform = "translateY(0)"; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 8, background: S.bgHover, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                {card.icon}
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 6px", fontSize: "16px", fontWeight: 600 }}>{card.title}</h3>
              <p style={{ color: S.secondary, fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── New Order Form ────────────────────────────────────────────────────── */}
      {orderType === "new" && (
        <form onSubmit={handleNewOrderSubmit}
          style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>

          <SectionCard title="Informasi Pelanggan" icon={<User size={14} />}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setIsExistingCustomer(false);
                  setCustomerForm({ ...customerForm, customerCode: `CUST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, customerName: "", company: "", phone: "", email: "", address: "" });
                }}
                style={{ padding: "6px 14px", borderRadius: 4, fontSize: "12.5px", fontWeight: !isExistingCustomer ? 600 : 400, background: !isExistingCustomer ? S.primary : S.white, color: !isExistingCustomer ? S.white : S.secondary, border: `1px solid ${!isExistingCustomer ? S.primary : S.border}`, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s" }}
              >
                Pelanggan Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExistingCustomer(true);
                  setCustomerForm({ ...customerForm, customerCode: "", customerName: "", company: "", phone: "", email: "", address: "" });
                }}
                style={{ padding: "6px 14px", borderRadius: 4, fontSize: "12.5px", fontWeight: isExistingCustomer ? 600 : 400, background: isExistingCustomer ? S.primary : S.white, color: isExistingCustomer ? S.white : S.secondary, border: `1px solid ${isExistingCustomer ? S.primary : S.border}`, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s" }}
              >
                Pelanggan Terdaftar
              </button>
            </div>

            {isExistingCustomer && (
              <div style={{ marginBottom: 16 }}>
                <Label text="Pilih Pelanggan Existing" required />
                <SearchableCustomerSelect
                  customers={customers}
                  value={customerForm.customerCode}
                  onChange={val => {
                    const c = customers.find(cust => cust.code === val);
                    if (c) {
                      setCustomerForm({
                        ...customerForm,
                        customerCode: c.code,
                        customerName: c.contactPerson || c.name,
                        company: c.name,
                        phone: c.phone || "",
                        email: c.email || c.contact || "",
                        address: c.address || "",
                      });
                    }
                  }}
                />
              </div>
            )}

            <Grid2>
              <div>
                <Label text="Kode Pelanggan (Auto)" required />
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 4, height: "32px", boxSizing: "border-box" }}>
                  <Hash size={13} style={{ color: "#2563EB" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A", fontFamily: "monospace" }}>{customerForm.customerCode}</span>
                </div>
              </div>
              <div>
                <Label text="Nama Kontak (PIC)" required />
                <Input icon={<User size={11} />} placeholder="Nama lengkap PIC" value={customerForm.customerName} onChange={e => setCustomerForm({ ...customerForm, customerName: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
              </div>
              <div>
                <Label text="Nama Perusahaan" required />
                <Input icon={<Building2 size={11} />} placeholder="PT. / CV. Perusahaan" value={customerForm.company} onChange={e => setCustomerForm({ ...customerForm, company: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
              </div>
              <div>
                <Label text="No. Telepon" required />
                <Input icon={<Phone size={11} />} type="tel" placeholder="08xxxxxxxxxx" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
              </div>
              <div>
                <Label text="Email" required />
                <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Alamat Pengiriman" required />
                <Textarea placeholder="Alamat lengkap tujuan pengiriman" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
            <Grid2>
              <div>
                <Label text="Target Pengiriman (Project Deadline)" required />
                <Input icon={<Calendar size={11} />} type="date" value={customerForm.deadline} onChange={e => setCustomerForm({ ...customerForm, deadline: e.target.value })} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Catatan Umum" />
                <Input placeholder="Instruksi umum, catatan pengiriman..." value={customerForm.generalNotes} onChange={e => setCustomerForm({ ...customerForm, generalNotes: e.target.value })} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard
            title={`Daftar Produk (${products.length} item)`}
            icon={<Layers size={14} />}
            action={<AddProductBtn onClick={() => addProduct(setProducts)} />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map((row, idx) => (
                <ProductLineItem
                  key={row.id}
                  row={row} index={idx} total={products.length}
                  productOptions={catalogProductOptions}
                  onChange={updated => updateProduct(row.id, updated, products, setProducts)}
                  onRemove={() => removeProduct(row.id, setProducts)}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Penetapan Harga" icon={<DollarSign size={14} />}>
            <div style={{ padding: 14, background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 6 }}>
              <Label text="Harga Estimasi / Nilai Kesepakatan Awal (Opsional)" />
              <CurrencyInput icon={<span style={{ fontWeight: 600, fontSize: 12 }}>Rp</span>} placeholder="0" value={customerForm.estimatedAmount || 0} onChange={(val: number) => setCustomerForm({ ...customerForm, estimatedAmount: val })} />
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: S.secondary }}>
                *Jika Anda telah menyepakati harga dengan pelanggan, isikan total nilainya di sini. Pesanan akan otomatis melewati tahap "Waiting Pricing" dari Finance, sehingga Produksi bisa langsung dimulai. Jika dikosongkan, Finance yang akan menentukan harganya.
              </p>
            </div>
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={handleReset}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit" disabled={isSubmitting}
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: isSubmitting ? "#94A3B8" : S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <CheckCircle2 size={14} /> {isSubmitting ? "Menyimpan..." : "Submit Sales Order"}
            </button>
          </div>
        </form>
      )}

      {/* ── Repeat Order Form ─────────────────────────────────────────────────── */}
      {orderType === "repeat" && (
        <form onSubmit={handleRepeatOrderSubmit}
          style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>

          <SectionCard title="Pilih Pelanggan" icon={<Search size={14} />}>
            <div style={{ marginBottom: selectedCustomer ? 14 : 0 }}>
              <Label text="Pelanggan" required />
              <SearchableCustomerSelect
                customers={customers}
                value={repeatForm.customerId}
                onChange={val => {
                  setRepeatForm({ ...repeatForm, customerId: val, previousSoId: "" });
                  setRepeatProducts([]);
                }}
              />
            </div>
            {selectedCustomer && (
              <div style={{ marginBottom: 14 }}>
                <Label text="Sales Order Sebelumnya" required />
                <Select value={repeatForm.previousSoId} onChange={e => handleRepeatSoSelect(e.target.value)} required>
                  <option value="">— Pilih SO untuk di-repeat —</option>
                  {salesOrders.filter(so => selectedCustomer && so.customerId === selectedCustomer.code).map(so => (
                    <option key={so.id} value={so.id}>{so.soNumber || so.id} - {so.description}</option>
                  ))}
                </Select>
              </div>
            )}
            {selectedCustomer && (
              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 4, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[
                  { icon: <Building2 size={11} />, label: "Perusahaan", value: selectedCustomer.name },
                  { icon: <Phone size={11} />, label: "Telepon", value: selectedCustomer.phone },
                  { icon: <Mail size={11} />, label: "Kontak", value: selectedCustomer.contact },
                  { icon: <MapPin size={11} />, label: "Alamat", value: selectedCustomer.address },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#0EA5E9", display: "flex", alignItems: "center", gap: 4 }}>{f.icon} {f.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#0C4A6E", fontWeight: 500 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
            <Grid2>
              <div>
                <Label text="Target Pengiriman (Project Deadline)" required />
                <Input icon={<Calendar size={11} />} type="date" value={repeatForm.deadline} onChange={e => setRepeatForm({ ...repeatForm, deadline: e.target.value })} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Catatan Umum" />
                <Input placeholder="Tambahan catatan khusus..." value={repeatForm.generalNotes} onChange={e => setRepeatForm({ ...repeatForm, generalNotes: e.target.value })} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard
            title={`Produk Repeat Order (${repeatProducts.length} item)`}
            icon={<Layers size={14} />}
            action={<AddProductBtn onClick={() => addProduct(setRepeatProducts)} />}
          >
            {repeatForm.previousSoId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {repeatProducts.map((row, idx) => (
                  <ProductLineItem
                    key={row.id}
                    row={row} index={idx} total={repeatProducts.length}
                    productOptions={catalogProductOptions}
                    onChange={updated => updateProduct(row.id, updated, repeatProducts, setRepeatProducts)}
                    onRemove={() => removeProduct(row.id, setRepeatProducts)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "12.5px", color: S.secondary, padding: "10px 0" }}>
                Pilih Sales Order sebelumnya untuk memuat produk secara otomatis.
              </div>
            )}
          </SectionCard>

          <SectionCard title="Penetapan Harga" icon={<DollarSign size={14} />}>
            <div style={{ padding: 14, background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 6 }}>
              <Label text="Harga Estimasi / Nilai Kesepakatan Awal (Opsional)" />
              <CurrencyInput icon={<span style={{ fontWeight: 600, fontSize: 12 }}>Rp</span>} placeholder="0" value={repeatForm.estimatedAmount || 0} onChange={(val: number) => setRepeatForm({ ...repeatForm, estimatedAmount: val })} />
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: S.secondary }}>
                *Jika Anda telah menyepakati harga dengan pelanggan, isikan total nilainya di sini. Pesanan akan otomatis melewati tahap "Waiting Pricing" dari Finance, sehingga Produksi bisa langsung dimulai. Jika dikosongkan, Finance yang akan menentukan harganya.
              </p>
            </div>
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={handleReset}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit" disabled={isSubmitting}
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: isSubmitting ? "#94A3B8" : S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <RefreshCw size={14} /> {isSubmitting ? "Menyimpan..." : "Submit Repeat Order"}
            </button>
          </div>
        </form>
      )}


    </div>
  );
}
