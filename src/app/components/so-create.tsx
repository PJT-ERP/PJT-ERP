import React, { useState, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, CheckCircle2,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText, Search,
  ChevronRight, Trash2, GripVertical,
  Layers,
} from "lucide-react";
import { customers, productOptions } from "./so-data";
import type { Page } from "./erp-layout";
import { submitSOToFinance } from "../store/erpStore";

interface SOCreateProps {
  onNavigate: (page: Page, data?: unknown) => void;
  initialData?: { customerId?: string; orderType?: "new" | "repeat" };
}

type OrderType = "new" | "repeat" | null;

const S = {
  font: "Inter, sans-serif",
  cyan: "#06B6D4",
  slate: "#1E293B",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  bgHover: "#F1F5F9",
  white: "#FFFFFF",
  red: "#EF4444",
};

// ─── Product line item ────────────────────────────────────────────────────────
interface ProductRow {
  id: string;
  type: "existing" | "custom";
  productName: string;
  customName: string;
  material: string;
  specification: string;
  quantity: string;
  unit: string;
  notes: string;
}

const emptyProduct = (): ProductRow => ({
  id: crypto.randomUUID(),
  type: "existing",
  productName: "",
  customName: "",
  material: "",
  specification: "",
  quantity: "",
  unit: "pcs",
  notes: "",
});

// ─── Customer form ────────────────────────────────────────────────────────────
interface CustomerForm {
  customerName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  deadline: string;
  generalNotes: string;
}

interface RepeatForm {
  customerId: string;
  deadline: string;
  generalNotes: string;
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
          border: `1px solid ${focused ? S.cyan : S.border}`,
          borderRadius: 4, padding: icon ? "7px 10px 7px 30px" : "7px 10px",
          fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none",
          transition: "border-color 0.12s, background 0.12s",
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
        border: `1px solid ${focused ? S.cyan : S.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none", resize: "none",
        transition: "border-color 0.12s, background 0.12s",
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
        border: `1px solid ${focused ? S.cyan : S.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none", cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
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
    <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
        <span style={{ color: S.cyan }}>{icon}</span>
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
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden", background: S.white, transition: "border-color 0.12s" }}>
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
        <div style={{ display: "flex", border: `1px solid ${S.border}`, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
          {(["existing", "custom"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...row, type: t })}
              style={{
                padding: "3px 10px", border: "none", cursor: "pointer",
                fontSize: "11px", fontWeight: 500, fontFamily: S.font,
                background: row.type === t ? S.cyan : S.white,
                color: row.type === t ? "#fff" : S.secondary,
                transition: "background 0.12s, color 0.12s",
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
            <Select value={row.productName} onChange={e => onChange({ ...row, productName: e.target.value })} required>
              <option value="">— Pilih produk —</option>
              {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <Label text="Material" />
            <Input placeholder="ST37, SS316L, A36..." value={row.material} onChange={e => onChange({ ...row, material: e.target.value })} />
          </div>
          <div>
            <Label text="Spesifikasi / Dimensi" />
            <Input placeholder="Ø50mm, 10×100×200mm..." value={row.specification} onChange={e => onChange({ ...row, specification: e.target.value })} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "120px 90px 1fr", gap: 10 }}>
          <div>
            <Label text="Jumlah (Qty)" required />
            <Input icon={<Hash size={11} />} type="number" min="1" placeholder="0" value={row.quantity} onChange={e => onChange({ ...row, quantity: e.target.value })} required />
          </div>
          <div>
            <Label text="Satuan" />
            <Select value={row.unit} onChange={e => onChange({ ...row, unit: e.target.value })}>
              {["pcs","unit","batang","lembar","kg","ton","set","roll","meter","liter"].map(u => (
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
  const borderAlpha = color === S.cyan ? "rgba(6,182,212,0.25)" : "rgba(99,102,241,0.25)";
  const bgAlpha     = color === S.cyan ? "rgba(6,182,212,0.06)" : "rgba(99,102,241,0.06)";
  const bgHover     = color === S.cyan ? "rgba(6,182,212,0.12)" : "rgba(99,102,241,0.12)";
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
  const prefillCustomer = initialData?.customerId
    ? customers.find(c => c.id === initialData.customerId)
    : null;

  const [orderType, setOrderType] = useState<OrderType>(initialData?.orderType ?? null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    customerName: prefillCustomer?.name     ?? "",
    company:      prefillCustomer?.company  ?? "",
    phone:        prefillCustomer?.phone    ?? "",
    email:        prefillCustomer?.email    ?? "",
    address:      prefillCustomer?.address  ?? "",
    deadline: "", generalNotes: "",
  });

  const [products, setProducts]           = useState<ProductRow[]>([emptyProduct()]);
  const [repeatForm, setRepeatForm]       = useState<RepeatForm>({ customerId: initialData?.customerId ?? "", deadline: "", generalNotes: "" });
  const [repeatProducts, setRepeatProducts] = useState<ProductRow[]>([emptyProduct()]);
  const [submitted, setSubmitted]         = useState(false);
  const [generatedSONumber, setGeneratedSONumber] = useState("");

  const selectedCustomer = customers.find(c => c.id === repeatForm.customerId);
  const handleBack = () => orderType ? setOrderType(null) : onNavigate("so-list");

  const updateProduct = useCallback((id: string, updated: ProductRow, list: ProductRow[], setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => {
    setter(list.map(p => p.id === id ? updated : p));
  }, []);

  const addProduct    = (setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => [...prev, emptyProduct()]);
  const removeProduct = (id: string, setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => prev.filter(p => p.id !== id));

  const handleReset = () => {
    setSubmitted(false); setOrderType(null); setGeneratedSONumber("");
    setCustomerForm({ customerName: "", company: "", phone: "", email: "", address: "", deadline: "", generalNotes: "" });
    setProducts([emptyProduct()]); setRepeatForm({ customerId: "", deadline: "", generalNotes: "" });
    setRepeatProducts([emptyProduct()]);
  };

  const handleNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const soNumber = `SO-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`;
    setGeneratedSONumber(soNumber);
    
    // Using the first product for the store representation (simplification for the mock store)
    const primaryProduct = products[0];
    
    submitSOToFinance({
      id: crypto.randomUUID(),
      soNumber,
      customerName: customerForm.customerName,
      company: customerForm.company,
      email: customerForm.email,
      phone: customerForm.phone,
      address: customerForm.address,
      productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      estimatedAmount: 0, // Set to 0 for finance to fill
      notes: customerForm.generalNotes,
    });
    
    setSubmitted(true);
  };

  const handleRepeatOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const soNumber = `SO-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`;
    setGeneratedSONumber(soNumber);
    
    // Using the first product for the store representation (simplification for the mock store)
    const primaryProduct = repeatProducts[0];
    
    submitSOToFinance({
      id: crypto.randomUUID(),
      soNumber,
      customerName: selectedCustomer.name,
      company: selectedCustomer.company,
      email: selectedCustomer.email,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      productName: primaryProduct.type === "custom" ? primaryProduct.customName : primaryProduct.productName,
      quantity: Number(primaryProduct.quantity) || 1,
      unit: primaryProduct.unit,
      estimatedAmount: 0, // Set to 0 for finance to fill
      notes: repeatForm.generalNotes,
    });
    
    setSubmitted(true);
  };

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const totalItems = orderType === "new" ? products.length : repeatProducts.length;
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: S.font }}>
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, padding: 40, textAlign: "center", maxWidth: 460, width: "100%" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 size={28} style={{ color: "#22C55E" }} />
          </div>
          <h2 style={{ color: S.slate, marginBottom: 6 }}>Sales Order Dibuat</h2>
          <p style={{ color: S.secondary, fontSize: "13px", marginBottom: 4 }}>Nomor Sales Order:</p>
          <p style={{ color: S.cyan, fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{generatedSONumber}</p>
          <p style={{ color: "#94A3B8", fontSize: "12px", margin: "0 0 20px" }}>
            {totalItems} item produk · Dikirim ke Finance untuk review
          </p>
          <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, padding: "10px 14px", marginBottom: 24, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>
              <span style={{ fontWeight: 600, color: "#F59E0B" }}>Langkah selanjutnya:</span>
              {" "}Departemen Finance akan mereview dan memverifikasi SO ini dalam 1×24 jam kerja.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset}
              style={{ flex: 1, padding: "8px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, color: S.slate, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
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
          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, color: S.secondary, cursor: "pointer", transition: "background 0.12s, color 0.12s", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget).style.background = S.bg; (e.currentTarget).style.color = S.slate; }}
          onMouseLeave={e => { (e.currentTarget).style.background = S.white; (e.currentTarget).style.color = S.secondary; }}
        >
          <ChevronLeft size={15} />
        </button>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>
            {!orderType ? "Buat Sales Order" : orderType === "new" ? "New Order" : "Repeat Order"}
          </h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            {!orderType
              ? "Pilih jenis order untuk melanjutkan"
              : orderType === "new"
              ? "Isi data pelanggan dan tambahkan satu atau lebih produk"
              : "Pilih pelanggan existing dan tambahkan produk repeat"}
          </p>
        </div>
      </div>

      {/* Step breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {["Jenis Order", orderType === "repeat" ? "Repeat Order" : "New Order", "Submit"].map((step, i) => {
          const active = (i === 0 && !orderType) || (i === 1 && !!orderType);
          const done   = i === 0 && !!orderType;
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, maxWidth: 600 }}>
          {[
            { type: "new"    as const, icon: <Plus size={22} style={{ color: S.cyan }} />,    title: "New Order",    desc: "Buat sales order dengan pelanggan baru atau produk yang belum pernah dipesan. Mendukung multi-produk dalam satu SO.", accentColor: S.cyan     },
            { type: "repeat" as const, icon: <RefreshCw size={22} style={{ color: "#6366F1" }} />, title: "Repeat Order", desc: "Pilih pelanggan existing dan ulangi order produk sebelumnya. Data auto-fill untuk mempercepat proses.",           accentColor: "#6366F1" },
          ].map(card => (
            <button key={card.type} onClick={() => setOrderType(card.type)}
              style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 6, padding: 22, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: S.font }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = card.accentColor; (e.currentTarget).style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = S.border; (e.currentTarget).style.boxShadow = "none"; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 8, background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                {card.icon}
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 6px" }}>{card.title}</h3>
              <p style={{ color: S.secondary, fontSize: "12.5px", margin: 0, lineHeight: 1.6 }}>{card.desc}</p>
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
                <Label text="Email" />
                <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} />
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
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
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
              <Select value={repeatForm.customerId} onChange={e => setRepeatForm({ ...repeatForm, customerId: e.target.value })} required>
                <option value="">— Pilih pelanggan existing —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} · {c.company} · {c.city}</option>
                ))}
              </Select>
            </div>
            {selectedCustomer && (
              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 4, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[
                  { icon: <Building2 size={11} />, label: "Perusahaan", value: selectedCustomer.company },
                  { icon: <Phone size={11} />,     label: "Telepon",    value: selectedCustomer.phone },
                  { icon: <Mail size={11} />,      label: "Email",      value: selectedCustomer.email },
                  { icon: <Hash size={11} />,      label: "Total Order",value: `${selectedCustomer.totalOrders} order` },
                  { icon: <MapPin size={11} />,    label: "Kota",       value: selectedCustomer.city },
                  { icon: <Calendar size={11} />,  label: "Order Terakhir", value: selectedCustomer.lastOrderDate },
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
                <Label text="Catatan Umum" />
                <Input placeholder="Perubahan spesifikasi, catatan khusus..." value={repeatForm.generalNotes} onChange={e => setRepeatForm({ ...repeatForm, generalNotes: e.target.value })} />
              </div>
            </Grid2>
          </SectionCard>

          <SectionCard
            title={`Daftar Produk (${repeatProducts.length} item)`}
            icon={<Layers size={14} />}
            action={<AddProductBtn onClick={() => addProduct(setRepeatProducts)} color="#6366F1" />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {repeatProducts.map((row, idx) => (
                <ProductLineItem
                  key={row.id}
                  row={row} index={idx} total={repeatProducts.length}
                  onChange={updated => updateProduct(row.id, updated, repeatProducts, setRepeatProducts)}
                  onRemove={() => removeProduct(row.id, setRepeatProducts)}
                />
              ))}
            </div>
          </SectionCard>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOrderType(null)}
              style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: "#6366F1", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <RefreshCw size={14} /> Submit Repeat Order
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
