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
import { useCustomersQuery, useSalesOrdersQuery, useProductsQuery } from "../../services/queries";

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
  const { data: productCatalog = [] } = useProductsQuery();
  const { data: salesOrders = [], isLoading: isLoadingOrders } = useSalesOrdersQuery();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  const submitSO = useSubmitSO();
  const newOrderMethods = useNewOrderForm(initialData);
  const tempRepeatMethods = useRepeatOrderForm(initialData);
  
  const [orderType, setOrderType] = useState<"new" | "repeat" | null>(initialData?.mode === "edit" ? "new" : initialData?.orderType ?? null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(!!initialData?.customerId);
  const [designSource, setDesignSource] = useState<"Engineering" | "CustomerProvided">("Engineering");
  const [engineeringReviewRequired, setEngineeringReviewRequired] = useState(true);
  const [customerDesignLink, setCustomerDesignLink] = useState("");
  const [customerBomJson, setCustomerBomJson] = useState('[{"name":"Material","quantity":1,"unit":"pcs"}]');

  const { fields: newOrderFields, append: newOrderAppend, remove: newOrderRemove } = useFieldArray({
    control: newOrderMethods.control,
    name: "products"
  });

  const { fields: repeatOrderFields, append: repeatOrderAppend, remove: repeatOrderRemove, replace: repeatOrderReplace } = useFieldArray({
    control: tempRepeatMethods.control,
    name: "repeatProducts"
  });
  
  const repeatOrderMethods = tempRepeatMethods;

  const previousSoId = repeatOrderMethods.watch("repeatForm.previousSoId");
  React.useEffect(() => {
    if (previousSoId && salesOrders.length > 0) {
      const selectedSo = salesOrders.find(so => so.id === previousSoId || so.soNumber === previousSoId);
      if (selectedSo) {
        import("./hooks/useRepeatOrderForm").then(({ mapRepeatProducts }) => {
          const mapped = mapRepeatProducts(selectedSo, productCatalog);
          repeatOrderReplace(mapped);
        });
      }
    }
  }, [previousSoId, salesOrders, productCatalog, repeatOrderReplace]);

  const handleBack = () => {
    if (orderType) { handleReset(); } else { onNavigate("so-list"); }
  };

  const handleReset = () => {
    submitSO.reset();
    setOrderType(null);
    setIsExistingCustomer(false);
    setDesignSource("Engineering");
    setEngineeringReviewRequired(true);
    setCustomerDesignLink("");
    setCustomerBomJson('[{"name":"Material","quantity":1,"unit":"pcs"}]');
    newOrderMethods.reset();
    repeatOrderMethods.reset();
  };

  const catalogProductOptions = productCatalog.map(product => {
    const sosWithThisProduct = salesOrders.filter(so => 
      so.items?.some((i: any) => i.productId === product.id || i.productPartNumber === product.partNumber) ||
      so.partNumber === product.partNumber
    );
    const hasHistoricalDesign = sosWithThisProduct.some(so => 
      so.status !== 'Pending Design' && 
      so.status !== 'Rejected' &&
      (so.backendDesignStatus === 'Approved' || so.designLink || so.customerDrawingUrl)
    );
    
    return {
      id: product.id,
      label: `${product.partNumber} - ${product.description}`,
      partNumber: product.partNumber,
      unit: product.unit || "pcs",
      materialSpec: product.materialSpec,
      bomItems: product.bomItems,
      hasHistoricalDesign
    };
  });

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
        isQuotation={orderType !== "repeat"}
        nextStepText={orderType === "repeat"
          ? "Pesanan repeat telah disimpan sebagai Sales Order."
          : designSource === "Engineering"
            ? "Quotation tersimpan. Engineering akan menyiapkan desain dan BOM untuk persetujuan SPV dan pelanggan."
            : engineeringReviewRequired
              ? "Quotation tersimpan bersama desain pelanggan. Engineering akan memeriksa kelayakan dan BOM sebelum persetujuan desain pelanggan."
              : "Quotation tersimpan bersama desain dan BOM dari pelanggan. Lanjutkan ke persetujuan desain pelanggan sebelum pricing."}
        isEdit={initialData?.mode === "edit"}
        onReset={handleReset}
        onViewList={() => onNavigate(orderType === "repeat" ? "so-list" : "quotation-list")}
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
            {!orderType ? "Buat Quotation (Penawaran)" : orderType === "repeat" ? "Repeat Order" : "Quotation Baru"}
          </h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            {!orderType
              ? "Pilih jenis order untuk membuat penawaran baru"
              : orderType === "repeat"
                ? "Pilih pelanggan existing dan tambahkan produk repeat"
                : "Isi form untuk membuat quotation penawaran baru"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {["Jenis Order", orderType === "repeat" ? "Repeat Order" : "Quotation Baru", "Submit"].map((step, i) => {
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

      {isLoadingOrders || isLoadingCustomers ? (
        <div className="animate-pulse" style={{ height: 200, width: "100%", background: "#f1f5f9", borderRadius: 6, marginTop: 20 }} />
      ) : (
        <>
          {!orderType && <OrderTypeSelector onSelect={setOrderType} />}

      {/* ===== New Order Form ===== */}
      {orderType === "new" && (
        <FormProvider {...newOrderMethods}>
          <form onSubmit={newOrderMethods.handleSubmit((data) => submitSO.submitNewQuotation(data, designSource, engineeringReviewRequired, customerDesignLink, customerBomJson))} style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
            <CustomerSection
              isExistingCustomer={isExistingCustomer}
              onToggleExisting={setIsExistingCustomer}
              customers={customers}
            />

            <OrderDetailSection namePrefix="customerForm" />

            <SectionCard title="Sumber Desain dan Review Engineering" icon={<Layers size={14} />}>
              <label style={{ display: "block", fontSize: 12, color: S.secondary, marginBottom: 5 }}>Sumber desain</label>
              <select value={designSource} onChange={e => setDesignSource(e.target.value as "Engineering" | "CustomerProvided")} style={{ width: "100%", padding: 9, border: `1px solid ${S.border}`, borderRadius: 4, marginBottom: 10 }}>
                <option value="Engineering">Desain disiapkan Engineering</option>
                <option value="CustomerProvided">Desain diberikan pelanggan</option>
              </select>
              {designSource === "CustomerProvided" && <>
                <label style={{ display: "block", fontSize: 12, color: S.secondary, marginBottom: 5 }}>Link desain pelanggan</label>
                <input type="url" required value={customerDesignLink} onChange={e => setCustomerDesignLink(e.target.value)} placeholder="https://..." style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `1px solid ${S.border}`, borderRadius: 4, marginBottom: 8 }} />
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: S.secondary }}>
                  <input type="checkbox" checked={engineeringReviewRequired} onChange={e => setEngineeringReviewRequired(e.target.checked)} />
                  Engineering perlu review kelayakan dan menyetujui BOM
                </label>
                {!engineeringReviewRequired && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#92400E" }}>Untuk tanpa review Engineering, BOM harus disertakan pada produk sebelum quotation dapat disimpan.</p>}
                {!engineeringReviewRequired && <>
                  <label style={{ display: "block", fontSize: 12, color: S.secondary, margin: "10px 0 5px" }}>BOM untuk costing/produksi (JSON)</label>
                  <textarea aria-label="BOM desain pelanggan" value={customerBomJson} onChange={e => setCustomerBomJson(e.target.value)} rows={4} placeholder='[{"name":"Material","specification":"S45C","quantity":2,"unit":"kg"}]' style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `1px solid ${S.border}`, borderRadius: 4, fontFamily: "monospace", fontSize: 12 }} />
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: S.secondary }}>Isi daftar material dengan name, quantity, dan unit. BOM tetap diperlukan meskipun review Engineering dilewati.</p>
                </>}
              </>}
              {designSource === "Engineering" && <p style={{ margin: 0, fontSize: 11, color: S.secondary }}>Engineering akan menyiapkan DesignLink dan BOM. Quotation tidak dapat lanjut ke harga sebelum SPV dan pelanggan menyetujui desain.</p>}
            </SectionCard>

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
                      onChange={updated => {
                        newOrderMethods.setValue(`products.${idx}`, updated, { shouldDirty: true, shouldTouch: true });
                        const allProducts = newOrderMethods.getValues("products");
                        const total = allProducts.reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
                        newOrderMethods.setValue("customerForm.estimatedAmount", total, { shouldDirty: true, shouldTouch: true });
                      }}
                      onRemove={() => newOrderRemove(idx)}
                    />
                ))}
              </div>
            </SectionCard>

            {(() => {
              const watchedProducts = newOrderMethods.watch("products");
              const estimatedTotal = (watchedProducts || []).reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);
              return (
                <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, color: "#1E40AF", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Total Harga Diajukan (Estimasi):</span>
                    <span style={{ fontSize: 16, color: "#1D4ED8", fontWeight: 700 }}>Rp {estimatedTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#3B82F6" }}>
                    *Harga akan diisi Finance (atau disetujui) setelah desain, review, dan persetujuan desain pelanggan selesai.
                  </div>
                </div>
              );
            })()}

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
                <CheckCircle2 size={14} /> {submitSO.isSubmitting ? "Menyimpan..." : "Submit Quotation"}
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
                        onChange={updated => {
                          repeatOrderMethods.setValue(`repeatProducts.${idx}`, updated, { shouldDirty: true, shouldTouch: true });
                          const allProducts = repeatOrderMethods.getValues("repeatProducts");
                          const total = allProducts.reduce((acc: number, p: any) => {
                            if (!p) return acc;
                            const qty = Number(p.quantity) || 0;
                            const price = Number(p.unitPrice) || 0;
                            return acc + qty * price;
                          }, 0);
                          repeatOrderMethods.setValue("repeatForm.estimatedAmount", total, { shouldDirty: true, shouldTouch: true });
                        }}
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
        </>
      )}
    </div>
  );
}

export default SOCreate;
