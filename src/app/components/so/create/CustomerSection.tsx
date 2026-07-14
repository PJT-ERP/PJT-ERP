import React from "react";
import { User, Building2, Phone, Mail, Hash } from "lucide-react";
import { Customer } from "../../data/mockData";
import { Label, Input, Textarea, SearchableCustomerSelect, SectionCard, Grid2 } from "./FormHelpers";

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  secondary: "#475569",
  border: "#CBD5E1",
  white: "#FFFFFF",
};

interface CustomerFormData {
  customerCode: string;
  customerName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
}

interface CustomerSectionProps {
  form: CustomerFormData;
  onChange: (form: CustomerFormData) => void;
  isExistingCustomer: boolean;
  onToggleExisting: (existing: boolean) => void;
  customers: Customer[];
}

export function CustomerSection({ form, onChange, isExistingCustomer, onToggleExisting, customers }: CustomerSectionProps) {
  const set = (updates: Partial<CustomerFormData>) => onChange({ ...form, ...updates });

  return (
    <SectionCard title="Informasi Pelanggan" icon={<User size={14} />}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { onToggleExisting(false); onChange({ ...form, customerCode: "", customerName: "", company: "", phone: "", email: "", address: "" }); }}
          style={{ padding: "6px 14px", borderRadius: 4, fontSize: "12.5px", fontWeight: !isExistingCustomer ? 600 : 400, background: !isExistingCustomer ? S.primary : S.white, color: !isExistingCustomer ? S.white : S.secondary, border: `1px solid ${!isExistingCustomer ? S.primary : S.border}`, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s" }}
        >
          Pelanggan Baru
        </button>
        <button
          type="button"
          onClick={() => { onToggleExisting(true); onChange({ ...form, customerCode: "", customerName: "", company: "", phone: "", email: "", address: "" }); }}
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
            value={form.customerCode}
            onChange={val => {
              const c = customers.find(cust => cust.code === val);
              if (c) {
                onChange({
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
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A", fontFamily: "monospace", opacity: form.customerCode ? 1 : 0.6 }}>{form.customerCode || "Otomatis"}</span>
          </div>
        </div>
        <div>
          <Label text="Nama Kontak (PIC)" required />
          <Input icon={<User size={11} />} placeholder="Nama lengkap PIC" value={form.customerName} onChange={e => set({ customerName: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
        <div>
          <Label text="Nama Perusahaan" required />
          <Input icon={<Building2 size={11} />} placeholder="PT. / CV. Perusahaan" value={form.company} onChange={e => set({ company: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
        <div>
          <Label text="No. Telepon" required />
          <Input icon={<Phone size={11} />} type="tel" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => set({ phone: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
        <div>
          <Label text="Email" required />
          <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" value={form.email} onChange={e => set({ email: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label text="Alamat Pengiriman" required />
          <Textarea placeholder="Alamat lengkap tujuan pengiriman" value={form.address} onChange={e => set({ address: e.target.value })} required readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
      </Grid2>
    </SectionCard>
  );
}
