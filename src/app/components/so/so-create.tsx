import React, { useState } from "react";
import { FormProvider, useFieldArray } from "react-hook-form";
import {
  ChevronLeft, ChevronRight, CheckCircle2, RefreshCw,
  Layers, Search, Building2, Phone, Mail, MapPin,
} from "lucide-react";
import { Select, SectionCard, Label, SearchableCustomerSelect } from "./create/FormHelpers";
import { ProductLineItem, AddProductBtn, emptyProduct } from "./create/ProductLineItem";
import { SuccessScreen } from "./create/SuccessScreen";
import { OrderTypeSelector } from "./create/OrderTypeSelector";
import { CustomerSection } from "./create/CustomerSection";
import { OrderDetailSection } from "./create/OrderDetailSection";
import { PricingSection } from "./create/PricingSection";
import { useNewOrderForm } from "./hooks/useNewOrderForm";
import { useRepeatOrderForm } from "./hooks/useRepeatOrderForm";
import { useSubmitSO } from "./hooks/useSubmitSO";
import { useApp } from "../context/AppContext";

interface SOCreateProps {
  onNavigate: (page: string, data?: unknown) => void;
  initialData?: { customerId?: string; orderType?: "new" | "repeat"; mode?: string; soId?: string };
}

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bg: "#F1F5F9",
  white: "#FFFFFF",
  cyan: "#C8102E",
};

export function SOCreate({ onNavigate, initialData }: SOCreateProps) {
  const { customers, salesOrders, productCatalog } = useApp();
  const submitSO = useSubmitSO();
  const newOrderMethods = useNewOrderForm(initialData);
  const repeatOrderMethods = useRepeatOrderForm(initialData);

  const [orderType, setOrderType] = useState<"new" | "repeat" | null>(initialData?.mode === "edit" ? "new" : initialData?.orderType ?? null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(!!initialData?.customerId);

  const { fields: newOrderFields, append: newOrderAppend, remove: newOrderRemove, update: newOrderUpdate } = useFieldArray({
    control: newOrderMethods.control,
    name: "products"
  });

  const { fields: repeatOrderFields, append: repeatOrderAppend, remove: repeatOrderRemove, update: repeatOrderUpdate } = useFieldArray({
    control: repeatOrderMethods.control,
    name: "repeatProducts"
  });

  const handleBack = () => {
    if (orderType) { handleReset(); } else { onNavigate("so-list"); }
  };

  const handleReset = () => {
    submitSO.reset();
    setOrderType(null);
    setIsExistingCustomer(false);
    newOrderMethods.reset();
    repeatOrderMethods.reset();
  };

  const catalogProductOptions = productCatalog.map(product => ({
    id: product.id,
    label: `${product.partNumber} - ${product.description}`,
    partNumber: product.partNumber,
    unit: product.unit || "pcs",
    materialSpec: product.materialSpec,
    bomItems: product.bomItems,
  }));

  const selectedCustomerId = repeatOrderMethods.watch("repeatForm.customerId");
  const selectedCustomer = customers.find(c => c.code === selectedCustomerId);

  // ── Submitted state ──
  if (submitSO.submitted) {
    const totalItems = orderType === "repeat" ? repeatOrderFields.length : newOrderFields.length;
    const isCustomSubmit = orderType === "repeat"
      ? repeatOrderMethods.getValues("repeatProducts").some(r => r.type === "custom")
      : newOrderMethods.getValues("products").some(r => r.type === "custom");

    return (
      <SuccessScreen
        generatedSoNumber={submitSO.generatedSONumber}
        totalItems={totalItems}
        isCustomSubmit={isCustomSubmit}
        isEdit={initialData?.mode === "edit"}
        onReset={handleReset}
        onViewList={() => onNavigate("so-list")}
      />
    );
  }

  // ── Main render ──
  return (
    <div style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 16 }}>
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

      {!orderType && <OrderTypeSelector onSelect={setOrderType} />}

      {/* ===== New Order Form ===== */}
      {orderType === "new" && (
        <FormProvider {...newOrderMethods}>
          <form onSubmit={newOrderMethods.handleSubmit((data) => submitSO.submitNewOrder(data))} style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
            <CustomerSection
              isExistingCustomer={isExistingCustomer}
              onToggleExisting={setIsExistingCustomer}
              customers={customers}
            />

            <OrderDetailSection namePrefix="customerForm" />

            <SectionCard
              title={`Daftar Produk (${newOrderFields.length} item)`}
              icon={<Layers size={14} />}
              action={<AddProductBtn onClick={() => newOrderAppend(emptyProduct())} />}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {newOrderFields.map((field, idx) => (
                    <ProductLineItem
                      key={field.id}
                      row={newOrderMethods.watch(`products.${idx}`)}
                      index={idx} total={newOrderFields.length}
                      productOptions={catalogProductOptions}
                      onChange={updated => newOrderUpdate(idx, updated)}
                      onRemove={() => newOrderRemove(idx)}
                    />
                ))}
              </div>
            </SectionCard>

            <PricingSection
              estimatedAmount={newOrderMethods.watch("customerForm.estimatedAmount") || 0}
              onChange={val => newOrderMethods.setValue("customerForm.estimatedAmount", val)}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={handleReset}
                style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = S.white)}
              >Batal</button>
              <button type="submit" disabled={submitSO.isSubmitting}
                style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: submitSO.isSubmitting ? "#94A3B8" : S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: submitSO.isSubmitting ? "not-allowed" : "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <CheckCircle2 size={14} /> {submitSO.isSubmitting ? "Menyimpan..." : "Submit Sales Order"}
              </button>
            </div>
          </form>
        </FormProvider>
      )}

      {/* ===== Repeat Order Form ===== */}
      {orderType === "repeat" && (
        <FormProvider {...repeatOrderMethods}>
          <form onSubmit={repeatOrderMethods.handleSubmit((data) => selectedCustomer ? submitSO.submitRepeatOrder(data, selectedCustomer) : null)} style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionCard title="Pilih Pelanggan" icon={<Search size={14} />}>
              <div style={{ marginBottom: repeatOrderMethods.watch("repeatForm.customerId") ? 14 : 0 }}>
                <Label text="Pelanggan" required />
                <SearchableCustomerSelect
                  customers={customers}
                  value={repeatOrderMethods.watch("repeatForm.customerId")}
                  onChange={val => {
                    repeatOrderMethods.setValue("repeatForm.customerId", val);
                    repeatOrderMethods.setValue("repeatForm.previousSoId", "");
                    repeatOrderMethods.setValue("repeatProducts", []);
                  }}
                />
              </div>
              {selectedCustomer && (
                <div style={{ marginBottom: 14 }}>
                  <Select required value={repeatOrderMethods.watch("repeatForm.previousSoId")} onChange={e => repeatOrderMethods.setValue("repeatForm.previousSoId", e.target.value)}>
                    <option value="">— Pilih SO untuk di-repeat —</option>
                    {salesOrders.filter(so => so.customerId === selectedCustomer.code).map(so => (
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
                    { icon: <Mail size={11} />, label: "Kontak", value: selectedCustomer.contactPerson },
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

            <OrderDetailSection namePrefix="repeatForm" />

            <SectionCard
              title={`Produk Repeat Order (${repeatOrderFields.length} item)`}
              icon={<Layers size={14} />}
              action={<AddProductBtn onClick={() => repeatOrderAppend(emptyProduct())} />}
            >
              {repeatOrderMethods.watch("repeatForm.previousSoId") ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {repeatOrderFields.map((field, idx) => (
                      <ProductLineItem
                        key={field.id}
                        row={repeatOrderMethods.watch(`repeatProducts.${idx}`)}
                        index={idx} total={repeatOrderFields.length}
                        productOptions={catalogProductOptions}
                        onChange={updated => repeatOrderUpdate(idx, updated)}
                        onRemove={() => repeatOrderRemove(idx)}
                      />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "12.5px", color: S.secondary, padding: "10px 0" }}>
                  Pilih Sales Order sebelumnya untuk memuat produk secara otomatis.
                </div>
              )}
            </SectionCard>

            <PricingSection
              estimatedAmount={repeatOrderMethods.watch("repeatForm.estimatedAmount") || 0}
              onChange={val => repeatOrderMethods.setValue("repeatForm.estimatedAmount", val)}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={handleReset}
                style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = S.white)}
              >Batal</button>
              <button type="submit" disabled={submitSO.isSubmitting}
                style={{ flex: 1, maxWidth: 320, padding: "8px 20px", borderRadius: 4, border: "none", background: submitSO.isSubmitting ? "#94A3B8" : S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: submitSO.isSubmitting ? "not-allowed" : "pointer", fontFamily: S.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <RefreshCw size={14} /> {submitSO.isSubmitting ? "Menyimpan..." : "Submit Repeat Order"}
              </button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}

export default SOCreate;
