import React from "react";
import { User, Building2, Phone, Mail, Hash, AlertTriangle } from "lucide-react";
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
  const companyInput = watch("customerForm.company");

  const normalizeCompanyName = (name: string) =>
    name.toLowerCase().replace(/^(pt\.|cv\.|tbk\.|ud\.)\s*/i, "").replace(/[^a-z0-9]/gi, "").trim();

  const matchingCustomer = !isExistingCustomer && companyInput && companyInput.trim().length >= 3
    ? customers.find(c => {
        const normInput = normalizeCompanyName(companyInput);
        const normName = normalizeCompanyName(c.name);
        return (normName.length > 2 && normName === normInput) || c.name.toLowerCase().trim() === companyInput.toLowerCase().trim();
      })
    : null;

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
            value={customerCode || ""}
            onChange={val => {
              const c = customers.find(cust => cust.code === val);
              if (c) {
                const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
                setValue("customerForm.customerCode", c.code, options);
                setValue("customerForm.customerName", c.contactPerson || c.contact || c.name, options);
                setValue("customerForm.company", c.name, options);
                setValue("customerForm.phone", c.phone || "", options);
                setValue("customerForm.email", c.email || "", options);
                setValue("customerForm.address", c.address || "", options);
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
          <Input icon={<User size={11} />} placeholder="Nama lengkap PIC" {...register("customerForm.customerName")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} maxLength={120} />
          {errors.customerForm?.customerName && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.customerName.message}</p>}
        </div>
        <div>
          <Label text="Nama Perusahaan" required />
          <Input icon={<Building2 size={11} />} placeholder="PT. / CV. Perusahaan" {...register("customerForm.company")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} maxLength={160} />
          {errors.customerForm?.company && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.company.message}</p>}
        </div>
        <div>
          <Label text="No. Telepon" />
          <Input icon={<Phone size={11} />} type="tel" placeholder="08xxxxxxxxxx" {...register("customerForm.phone")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} maxLength={40} />
        </div>
        <div>
          <Label text="Email" />
          <Input icon={<Mail size={11} />} type="email" placeholder="email@perusahaan.com" {...register("customerForm.email")} readOnly={isExistingCustomer} style={{ opacity: isExistingCustomer ? 0.7 : 1 }} maxLength={160} />
          {errors.customerForm?.email && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{errors.customerForm.email.message}</p>}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label text="Alamat Lengkap" />
          <Textarea placeholder="Alamat lengkap perusahaan" {...register("customerForm.address")} readOnly={isExistingCustomer} style={{ minHeight: "60px", opacity: isExistingCustomer ? 0.7 : 1 }} maxLength={400} />
        </div>

        {matchingCustomer && (
          <div style={{
            gridColumn: "1 / -1",
            background: "#FFFBEB",
            border: "1px solid #FCD34D",
            borderRadius: 6,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 4
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <AlertTriangle size={18} style={{ color: "#D97706", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", color: "#92400E" }}>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  Perusahaan Sudah Terdaftar! ({matchingCustomer.name})
                </p>
                <p style={{ margin: "2px 0 0 0", color: "#B45309" }}>
                  Kode: <strong>{matchingCustomer.code}</strong> | PIC Terdaftar: <strong>{matchingCustomer.contactPerson || matchingCustomer.contact || matchingCustomer.name}</strong> ({matchingCustomer.phone || matchingCustomer.email || "No Telp N/A"})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onToggleExisting(true);
                const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
                setValue("customerForm.customerCode", matchingCustomer.code, options);
                setValue("customerForm.customerName", matchingCustomer.contactPerson || matchingCustomer.contact || matchingCustomer.name, options);
                setValue("customerForm.company", matchingCustomer.name, options);
                setValue("customerForm.phone", matchingCustomer.phone || "", options);
                setValue("customerForm.email", matchingCustomer.email || "", options);
                setValue("customerForm.address", matchingCustomer.address || "", options);
              }}
              style={{
                background: "#D97706",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              Gunakan Pelanggan Terdaftar Ini
            </button>
          </div>
        )}
      </Grid2>
    </SectionCard>
  );
}
