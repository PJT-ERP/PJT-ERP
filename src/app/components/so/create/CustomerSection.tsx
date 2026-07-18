import React from "react";
import { User, Building2, Phone, Mail, Hash } from "lucide-react";
import { Customer } from "../../data/mockData";
import { Label, Input, Textarea, SearchableCustomerSelect, SectionCard, Grid2 } from "./FormHelpers";
import { useFormContext } from "react-hook-form";
import { NewOrderFormType } from "../schema/soCreateSchema";

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  secondary: "#475569",
  border: "#CBD5E1",
  white: "#FFFFFF",
};

interface CustomerSectionProps {
  isExistingCustomer: boolean;
  onToggleExisting: (existing: boolean) => void;
  customers: Customer[];
}

export function CustomerSection({ isExistingCustomer, onToggleExisting, customers }: CustomerSectionProps) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<NewOrderFormType>();
  const customerCode = watch("customerForm.customerCode");
  
  const handleToggle = (existing: boolean) => {
    onToggleExisting(existing);
    setValue("customerForm.customerCode", "");
    setValue("customerForm.customerName", "");
    setValue("customerForm.company", "");
    setValue("customerForm.phone", "");
    setValue("customerForm.email", "");
    setValue("customerForm.address", "");
  };

  return (
    <SectionCard title="Informasi Pelanggan" icon={<User size={14} />}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          style={{ padding: "6px 14px", borderRadius: 4, fontSize: "12.5px", fontWeight: !isExistingCustomer ? 600 : 400, background: !isExistingCustomer ? S.primary : S.white, color: !isExistingCustomer ? S.white : S.secondary, border: `1px solid ${!isExistingCustomer ? S.primary : S.border}`, cursor: "pointer", fontFamily: S.font, transition: "all 0.15s" }}
        >
          Pelanggan Baru
        </button>
        <button
          type="button"
          onClick={() => handleToggle(true)}
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
            value={customerCode}
            onChange={val => {
              const c = customers.find(cust => cust.code === val);
              if (c) {
                setValue("customerForm.customerCode", c.code);
                setValue("customerForm.customerName", c.contactPerson || c.name);
                setValue("customerForm.company", c.name);
                setValue("customerForm.phone", c.phone || "");
                setValue("customerForm.email", c.email || c.contact || "");
                setValue("customerForm.address", c.address || "");
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
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A", fontFamily: "monospace", opacity: customerCode ? 1 : 0.6 }}>{customerCode || "Otomatis"}</span>
          </div>
          {errors.customerForm?.customerCode && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.customerCode.message}</p>}
        </div>
        <div>
          <Label text="Nama Kontak (PIC)" required />
          <Input icon={<User size={11} />} placeholder="Nama lengkap PIC" {...register("customerForm.customerName")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
          {errors.customerForm?.customerName && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.customerName.message}</p>}
        </div>
        <div>
          <Label text="Nama Perusahaan" required />
          <Input icon={<Building2 size={11} />} placeholder="PT. / CV. Perusahaan" {...register("customerForm.company")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
          {errors.customerForm?.company && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.company.message}</p>}
        </div>
        <div>
          <Label text="No. Telepon" />
          <Input icon={<Phone size={11} />} type="tel" placeholder="08xxxxxxxxxx" {...register("customerForm.phone")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
        <div>
          <Label text="Email" />
          <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" {...register("customerForm.email")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} />
          {errors.customerForm?.email && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.email.message}</p>}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label text="Alamat Lengkap" />
          <Textarea placeholder="Alamat lengkap perusahaan" {...register("customerForm.address")} readOnly={isExistingCustomer} style={{ minHeight: "60px", opacity: isExistingCustomer ? 0.7 : 1 }} />
        </div>
      </Grid2>
    </SectionCard>
  );
}
