import React, { useState, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, CheckCircle2,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText, Search,
  ChevronRight, Trash2, GripVertical,
  Layers, Link as LinkIcon
} from "lucide-react";
import { productOptions, ENGINEERING_DESIGNS, STANDARD_PRODUCTS_BOM } from "../data/mockData";
import { useApp } from "../context/AppContext";
import type { Page } from "../layout/erp-layout";
import { useERPStore } from "../../store/useERPStore";

interface SOCreateProps {
  onNavigate: (page: Page, data?: unknown) => void;
  initialData?: { customerId?: string; orderType?: "new" | "repeat" };
}

type OrderType = "new" | "repeat" | "from_qut" | null;

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
});

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
  customerImageUrl: string;
  estimatedAmount?: number;
}

interface RepeatForm {
  customerId: string;
  previousSoId: string;
  deadline: string;
  generalNotes: string;
  customerImageUrl: string;
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

function SectionCard({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: S.bg }}>
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
  onChange: (updated: ProductRow) => void;
  onRemove: () => void;
}

function ProductLineItem({ row, index, total, onChange, onRemove }: ProductRowProps) {
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
              const stdBom = STANDARD_PRODUCTS_BOM[pName];
              onChange({
                ...row,
                productName: pName,
                designId: "",
                materials: stdBom ? stdBom.map(m => ({ id: m.id, name: m.name, specification: m.spec, quantity: String(m.quantity), unit: m.unit })) : []
              });
            }} required>
              <option value="">— Pilih produk —</option>
              {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          )}
        </div>

        {isCustom && (
          <div style={{ marginBottom: 10 }}>
            <Label text="No Permintaan / ID Desain (Opsional)" />
            <Select
              value={row.designId}
              onChange={e => {
                const selectedDesignId = e.target.value;
                if (selectedDesignId === "none" || selectedDesignId === "") {
                  onChange({ ...row, designId: selectedDesignId, materials: [] });
                } else {
                  const design = ENGINEERING_DESIGNS.find(d => d.id === selectedDesignId);
                  onChange({
                    ...row,
                    designId: selectedDesignId,
                    materials: design ? design.materials.map(m => ({
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
              <option value="">— Pilih ID Desain —</option>
              <option value="none">Belum ada ID Desain (Ajukan ke Engineer)</option>
              {ENGINEERING_DESIGNS.filter(d => d.status === "Approved").map(d => (
                <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
              ))}
            </Select>
            <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>
              *Jika dikosongkan, pesanan akan berstatus "Menunggu Engineering" untuk kelengkapan desain & material.
            </p>
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
                  {row.materials.map(mat => (
                    <tr key={mat.id}>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.slate }}>{mat.name}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.secondary }}>{mat.specification || "-"}</td>
                      <td style={{ padding: "6px 8px", borderBottom: `1px solid ${S.border}`, color: S.slate, textAlign: "right", fontWeight: 500 }}>{mat.quantity} {mat.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: S.secondary, fontStyle: "italic" }}>
              *Data material dikunci dan diambil secara otomatis dari {isCustom ? "persetujuan tim Engineering" : "database produk standar"}.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "120px 90px 1fr", gap: 10 }}>
          <div>
            <Label text="Jumlah (Qty)" required />
            <Input icon={<Hash size={11} />} type="number" min="1" placeholder="0" value={row.quantity} onChange={e => onChange({ ...row, quantity: e.target.value })} required />
          </div>
          <div>
            <Label text="Satuan" />
            <Select value={row.unit} onChange={e => onChange({ ...row, unit: e.target.value })}>
              {["pcs", "unit", "batang", "lembar", "kg", "ton", "set", "roll", "meter", "liter"].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
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
  const { customers, addSalesOrder, addCustomer, salesOrders, updateSalesOrder, quotations } = useApp();
  const { submitSOToFinance, updateSOInFinance, allSOs } = useERPStore();
  const allSos = allSOs;

  const isEdit = initialData?.mode === "edit";
  const editSoId = initialData?.soId;
  const existingAppSo = isEdit ? salesOrders.find(s => s.id === editSoId) : null;
  const existingFinanceSo = isEdit ? allSOs.find(s => s.soNumber === editSoId) : null;

  const prefillCustomer = initialData?.customerId
    ? customers.find(c => c.code === initialData.customerId)
    : existingAppSo ? customers.find(c => c.code === existingAppSo.customerId) : null;

  const [orderType, setOrderType] = useState<OrderType>(isEdit ? "new" : initialData?.orderType ?? null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    customerCode: prefillCustomer?.code ?? `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: prefillCustomer?.name ?? "",
    company: existingFinanceSo?.company ?? prefillCustomer?.name ?? "",
    phone: existingFinanceSo?.phone ?? prefillCustomer?.phone ?? "",
    email: existingFinanceSo?.email ?? prefillCustomer?.contact ?? "",
    address: existingFinanceSo?.address ?? prefillCustomer?.address ?? "",
    deadline: existingAppSo?.deadline ?? "",
    generalNotes: existingFinanceSo?.notes ?? "",
    customerImageUrl: existingFinanceSo?.customerImageUrl ?? "",
    estimatedAmount: existingFinanceSo?.estimatedAmount ?? 0,
  });

  const [products, setProducts] = useState<ProductRow[]>([
    existingFinanceSo ? {
      ...emptyProduct(),
      type: "custom",
      productName: existingFinanceSo.productName,
      customName: existingFinanceSo.productName,
      quantity: String(existingFinanceSo.quantity),
      unit: existingFinanceSo.unit,
      materials: existingFinanceSo.materials || emptyProduct().materials,
    } : existingAppSo ? {
      ...emptyProduct(),
      type: "custom",
      productName: existingAppSo.description,
      customName: existingAppSo.description,
      quantity: String(existingAppSo.quantity),
      unit: existingAppSo.unit,
      materials: existingAppSo.materials || emptyProduct().materials,
    } : emptyProduct()
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [generatedSONumber, setGeneratedSONumber] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [repeatForm, setRepeatForm] = useState<RepeatForm>({
    customerId: initialData?.customerId || "", previousSoId: "", deadline: today, generalNotes: "", customerImageUrl: "", estimatedAmount: 0
  });

  const [qutForm, setQutForm] = useState({
    qutId: "", customerId: "", deadline: today, generalNotes: "", customerImageUrl: ""
  });


  const [repeatProducts, setRepeatProducts] = useState<ProductRow[]>([]);
  const [qutProducts, setQutProducts] = useState<ProductRow[]>([]);

  const selectedCustomer = orderType === "repeat"
    ? customers.find(c => c.code === repeatForm.customerId)
    : orderType === "from_qut"
      ? customers.find(c => c.code === qutForm.customerId)
      : null;

  const handleBack = () => orderType ? setOrderType(null) : onNavigate("so-list");

  const updateProduct = useCallback((id: string, updated: ProductRow, list: ProductRow[], setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => {
    setter(list.map(p => p.id === id ? updated : p));
  }, []);

  const addProduct = (setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => [...prev, emptyProduct()]);
  const removeProduct = (id: string, setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => prev.filter(p => p.id !== id));

  const handleReset = () => {
    setSubmitted(false); setOrderType(null); setGeneratedSONumber("");
    setCustomerForm({ customerCode: "", customerName: "", company: "", phone: "", email: "", address: "", deadline: "", generalNotes: "", customerImageUrl: "", estimatedAmount: 0 });
    setProducts([emptyProduct()]); setRepeatForm({ customerId: "", previousSoId: "", deadline: "", generalNotes: "", customerImageUrl: "", estimatedAmount: 0 });
    setRepeatProducts([]);
    setQutForm({ qutId: "", customerId: "", deadline: today, generalNotes: "", customerImageUrl: "" });
    setQutProducts([]);
  };

  const handleRepeatSoSelect = (soId: string) => {
    setRepeatForm({ ...repeatForm, previousSoId: soId });
    const selectedSo = allSos.find(so => so.id === soId);
    if (selectedSo) {
      setRepeatProducts([{
        ...emptyProduct(),
        productName: selectedSo.description, // changed to description, as it stores the product name
        quantity: String(selectedSo.quantity),
        unit: selectedSo.unit,
      }]);
    } else {
      setRepeatProducts([]);
    }
  };

  const handleQutSelect = (qutId: string) => {
    const qut = quotations.find(q => q.id === qutId);
    if (qut) {
      setQutForm({ ...qutForm, qutId: qutId, customerId: qut.customerId });
      setQutProducts([{
        ...emptyProduct(),
        productName: qut.productName || qut.description,
        quantity: String(qut.quantity),
        unit: qut.unit,
        designId: qut.designId || "",
        materials: qut.materials || []
      }]);
    } else {
      setQutForm({ ...qutForm, qutId: "", customerId: "" });
      setQutProducts([]);
    }
  };

  const handleNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Using the first product for the store representation (simplification for the mock store)
    const primaryProduct = products[0];

    // Check if customer exists, if not create
    const existingCustomer = customers.find(c => c.code === customerForm.customerCode);
    if (!existingCustomer) {
      addCustomer({
        id: crypto.randomUUID(),
        code: customerForm.customerCode,
        name: customerForm.customerName,
        address: customerForm.address,
        contact: customerForm.email,
        phone: customerForm.phone,
        status: 'Active'
      });
    }

    if (isEdit && editSoId) {
      updateSalesOrder(editSoId, {
        customerId: customerForm.customerCode,
        description: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
        quantity: Number(primaryProduct.quantity) || 1,
        unit: primaryProduct.unit,
        designId: primaryProduct.designId,
        customerImageUrl: customerForm.customerImageUrl,
        materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
        deadline: customerForm.deadline,
      });

      if (existingFinanceSo) {
        updateSOInFinance(existingFinanceSo.id, {
          customerName: customerForm.customerName,
          customerCode: customerForm.customerCode,
          company: customerForm.company,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
          customerImageUrl: customerForm.customerImageUrl,
          productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
          designId: primaryProduct.designId,
          quantity: Number(primaryProduct.quantity) || 1,
          unit: primaryProduct.unit,
          materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
          notes: customerForm.generalNotes,
        });
      }

      setGeneratedSONumber(editSoId);
      setSubmitted(true);
      return;
    }

    const newSO = addSalesOrder({
      customerId: customerForm.customerCode,
      description: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      designId: primaryProduct.designId,
      customerImageUrl: customerForm.customerImageUrl,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      deadline: customerForm.deadline,
    });

    const soNumber = newSO.id;
    setGeneratedSONumber(soNumber);

    submitSOToFinance({
      id: crypto.randomUUID(),
      soNumber,
      customerName: customerForm.customerName,
      customerCode: customerForm.customerCode,
      company: customerForm.company,
      email: customerForm.email,
      phone: customerForm.phone,
      address: customerForm.address,
      customerImageUrl: customerForm.customerImageUrl,
      productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      designId: primaryProduct.designId,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      estimatedAmount: customerForm.estimatedAmount || 0,
      notes: customerForm.generalNotes,
    });

    setSubmitted(true);
  };

  const handleRepeatOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    // Using the first product for the store representation (simplification for the mock store)
    const primaryProduct = repeatProducts[0];

    const newSO = addSalesOrder({
      customerId: selectedCustomer.code,
      description: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      deadline: repeatForm.deadline,
    });

    const soNumber = newSO.id;
    setGeneratedSONumber(soNumber);

    submitSOToFinance({
      id: crypto.randomUUID(),
      soNumber,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code,
      company: selectedCustomer.name,
      email: selectedCustomer.contact,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      customerImageUrl: repeatForm.customerImageUrl,
      productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      designId: primaryProduct.designId,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      estimatedAmount: repeatForm.estimatedAmount || 0,
      notes: repeatForm.generalNotes,
    });

    setSubmitted(true);
  };

  const handleQutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const primaryProduct = qutProducts[0];
    const newSO = addSalesOrder({
      customerId: selectedCustomer.code,
      description: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      designId: primaryProduct.designId,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      deadline: qutForm.deadline,
    });

    const soNumber = newSO.id;
    setGeneratedSONumber(soNumber);

    submitSOToFinance({
      id: crypto.randomUUID(),
      soNumber,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code,
      company: selectedCustomer.name,
      email: selectedCustomer.contact,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      customerImageUrl: qutForm.customerImageUrl,
      productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      designId: primaryProduct.designId,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      materials: primaryProduct.materials.map(m => ({ id: m.id, name: m.name, quantity: Number(m.quantity) || 1, unit: m.unit, spec: m.specification })),
      estimatedAmount: quotations.find(q => q.id === qutForm.qutId)?.estimatedAmount || 0,
      notes: qutForm.generalNotes,
    });

    setSubmitted(true);
  };

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const totalItems = orderType === "from_qut" ? qutProducts.length : repeatProducts.length;
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
            {totalItems} item produk · {isEdit ? "Perubahan disimpan" : "Dikirim ke Finance untuk review"}
          </p>
          <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "10px 14px", marginBottom: 24, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>
              <span style={{ fontWeight: 600, color: "#F59E0B" }}>Langkah selanjutnya:</span>
              {" "}Departemen Finance akan mereview dan memverifikasi SO ini dalam 1×24 jam kerja.
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
            {!orderType ? "Buat Sales Order" : orderType === "repeat" ? "Repeat Order" : "Dari Penawaran (QUT)"}
          </h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            {!orderType
              ? "Pilih jenis order untuk melanjutkan"
              : orderType === "repeat"
                ? "Pilih pelanggan existing dan tambahkan produk repeat"
                : "Pilih Quotation yang telah disetujui (Won) untuk dibuatkan Sales Order"}
          </p>
        </div>
      </div>

      {/* Step breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {["Jenis Order", orderType === "repeat" ? "Repeat Order" : "Dari QUT", "Submit"].map((step, i) => {
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
            { type: "from_qut" as const, icon: <FileText size={22} style={{ color: "#10B981" }} />, title: "Dari Penawaran (QUT)", desc: "Pilih Quotation yang telah disetujui untuk langsung dikonversi menjadi Sales Order. Data akan ditarik secara otomatis.", accentColor: "#10B981" },
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
            <Grid2>
              <div>
                <Label text="Kode Pelanggan (Auto)" required />
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 4, height: "32px", boxSizing: "border-box" }}>
                  <Hash size={13} style={{ color: "#2563EB" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A", fontFamily: "monospace" }}>{customerForm.customerCode}</span>
                </div>
              </div>
              <div>
                <Label text="Nama Pelanggan" required />
                <Input icon={<User size={11} />} placeholder="Nama lengkap" value={customerForm.customerName} onChange={e => setCustomerForm({ ...customerForm, customerName: e.target.value })} required />
              </div>
              <div>
                <Label text="Perusahaan" required />
                <Input icon={<Building2 size={11} />} placeholder="Nama perusahaan" value={customerForm.company} onChange={e => setCustomerForm({ ...customerForm, company: e.target.value })} required />
              </div>
              <div>
                <Label text="No. Telepon" required />
                <Input icon={<Phone size={11} />} type="tel" placeholder="08xxxxxxxxxx" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} required />
              </div>
              <div>
                <Label text="Email" required />
                <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Alamat Pengiriman" required />
                <Textarea placeholder="Alamat lengkap tujuan pengiriman" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} required />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
            <Grid2>
              <div>
                <Label text="Deadline" required />
                <Input icon={<Calendar size={11} />} type="date" value={customerForm.deadline} onChange={e => setCustomerForm({ ...customerForm, deadline: e.target.value })} required />
              </div>
              <div>
                <Label text="URL Design" required />
                <Input icon={<LinkIcon size={11} />} type="url" placeholder="https://..." value={customerForm.customerImageUrl} onChange={e => setCustomerForm({ ...customerForm, customerImageUrl: e.target.value })} required />
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
                  onChange={updated => updateProduct(row.id, updated, products, setProducts)}
                  onRemove={() => removeProduct(row.id, setProducts)}
                />
              ))}
            </div>
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOrderType(null)}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <CheckCircle2 size={14} /> Submit Sales Order
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
              <Select value={repeatForm.customerId} onChange={e => { setRepeatForm({ ...repeatForm, customerId: e.target.value, previousSoId: "" }); setRepeatProducts([]); }} required>
                <option value="">— Pilih pelanggan existing —</option>
                {customers.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
            </div>
            {selectedCustomer && (
              <div style={{ marginBottom: 14 }}>
                <Label text="Sales Order Sebelumnya" required />
                <Select value={repeatForm.previousSoId} onChange={e => handleRepeatSoSelect(e.target.value)} required>
                  <option value="">— Pilih SO untuk di-repeat —</option>
                  {allSos.filter(so => so.customerName === selectedCustomer.name || so.company === selectedCustomer.name).map(so => (
                    <option key={so.id} value={so.id}>{so.soNumber} - {so.productName}</option>
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
                <Label text="Deadline" required />
                <Input icon={<Calendar size={11} />} type="date" value={repeatForm.deadline} onChange={e => setRepeatForm({ ...repeatForm, deadline: e.target.value })} required />
              </div>
              <div>
                <Label text="URL Gambar Referensi Customer" required />
                <Input icon={<LinkIcon size={11} />} type="url" placeholder="https://..." value={repeatForm.customerImageUrl} onChange={e => setRepeatForm({ ...repeatForm, customerImageUrl: e.target.value })} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Catatan Umum" />
                <Input placeholder="Perubahan spesifikasi, catatan khusus..." value={repeatForm.generalNotes} onChange={e => setRepeatForm({ ...repeatForm, generalNotes: e.target.value })} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard
            title={`Produk Repeat Order`}
            icon={<Layers size={14} />}
          >
            {repeatForm.previousSoId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {repeatProducts.map((row, idx) => (
                  <div key={row.id} style={{ border: `1px solid ${S.border}`, borderRadius: 6, padding: 14, background: "#F8FAFC" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: S.slate, marginBottom: 4 }}>{row.productName}</div>
                    <div style={{ fontSize: "12px", color: S.secondary }}>Jumlah: {row.quantity} {row.unit}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "12.5px", color: S.secondary, padding: "10px 0" }}>
                Pilih Sales Order sebelumnya untuk memuat produk secara otomatis.
              </div>
            )}
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOrderType(null)}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <RefreshCw size={14} /> Submit Repeat Order
            </button>
          </div>
        </form>
      )}

      {/* ── From QUT Order Form ───────────────────────────────────────────────── */}
      {orderType === "from_qut" && (
        <form onSubmit={handleQutSubmit}
          style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>

          <SectionCard title="Pilih Penawaran (QUT)" icon={<FileText size={14} />}>
            <div style={{ marginBottom: 14 }}>
              <Label text="Nomor Penawaran (QUT)" required />
              <Select value={qutForm.qutId} onChange={e => handleQutSelect(e.target.value)} required>
                <option value="">— Pilih Penawaran (QUT) —</option>
                {quotations.filter(q => q.status === 'won').map(q => {
                  const cust = customers.find(c => c.code === q.customerId);
                  return (
                    <option key={q.id} value={q.id}>{q.id} - {cust?.name} ({q.productName})</option>
                  );
                })}
              </Select>
            </div>
            {selectedCustomer && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 4, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[
                  { icon: <User size={11} />, label: "Pelanggan", value: selectedCustomer.name },
                  { icon: <Building2 size={11} />, label: "Perusahaan", value: selectedCustomer.company || selectedCustomer.name },
                  { icon: <Phone size={11} />, label: "Telepon", value: selectedCustomer.phone },
                  { icon: <Mail size={11} />, label: "Email", value: selectedCustomer.contact },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#16A34A", display: "flex", alignItems: "center", gap: 4 }}>{f.icon} {f.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#14532D", fontWeight: 500 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
            <Grid2>
              <div>
                <Label text="Deadline" required />
                <Input icon={<Calendar size={11} />} type="date" value={qutForm.deadline} onChange={e => setQutForm({ ...qutForm, deadline: e.target.value })} required />
              </div>
              <div>
                <Label text="URL Gambar Referensi Customer" required />
                <Input icon={<LinkIcon size={11} />} type="url" placeholder="https://..." value={qutForm.customerImageUrl} onChange={e => setQutForm({ ...qutForm, customerImageUrl: e.target.value })} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Label text="Catatan Tambahan" />
                <Input placeholder="Catatan khusus terkait pembuatan SO ini..." value={qutForm.generalNotes} onChange={e => setQutForm({ ...qutForm, generalNotes: e.target.value })} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard
            title={`Produk dari QUT`}
            icon={<Layers size={14} />}
          >
            {qutForm.qutId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {qutProducts.map((row) => (
                  <div key={row.id} style={{ border: `1px solid ${S.border}`, borderRadius: 6, padding: 14, background: "#F8FAFC" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: S.slate, marginBottom: 4 }}>{row.productName}</div>
                    <div style={{ fontSize: "12px", color: S.secondary }}>Jumlah: {row.quantity} {row.unit}</div>
                    {row.designId && <div style={{ fontSize: "12px", color: S.primary, marginTop: 4 }}>Desain: {row.designId}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "12.5px", color: S.secondary, padding: "10px 0" }}>
                Pilih QUT terlebih dahulu untuk memuat produk secara otomatis.
              </div>
            )}
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOrderType(null)}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit" disabled={!qutForm.qutId}
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: !qutForm.qutId ? "#94A3B8" : S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: !qutForm.qutId ? "not-allowed" : "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = !qutForm.qutId ? "1" : "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <CheckCircle2 size={14} /> Submit SO dari QUT
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
