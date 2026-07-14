import React, { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2, RefreshCw,
  Layers, Search, Building2, Phone, Mail, MapPin,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { salesApi } from "../../services/salesApi";
import { Select, SectionCard, Label, SearchableCustomerSelect } from "./create/FormHelpers";
import {
  ProductRow, ProductOption, emptyProduct,
  AddProductBtn, ProductLineItem
} from "./create/ProductLineItem";
import { SuccessScreen } from "./create/SuccessScreen";
import { OrderTypeSelector } from "./create/OrderTypeSelector";
import { CustomerSection } from "./create/CustomerSection";
import { OrderDetailSection } from "./create/OrderDetailSection";
import { PricingSection } from "./create/PricingSection";

interface SOCreateProps {
  onNavigate: (page: string, data?: unknown) => void;
  initialData?: { customerId?: string; orderType?: "new" | "repeat"; mode?: string; soId?: string };
}

type OrderType = "new" | "repeat" | null;

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

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

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
    customerCode: prefillCustomer?.code ?? "",
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
    customerId: initialData?.customerId || "", previousSoId: initialData?.soId || "", deadline: "", generalNotes: "", estimatedAmount: 0
  });

  const [repeatProducts, setRepeatProducts] = useState<ProductRow[]>([]);

  const selectedCustomer = orderType === "repeat"
    ? customers.find(c => c.code === repeatForm.customerId)
    : null;

  // ── Effects ──
  React.useEffect(() => {
    if (orderType === "repeat" && repeatForm.previousSoId && repeatProducts.length === 0 && salesOrders.length > 0) {
      const selectedSo = salesOrders.find(so => so.id === repeatForm.previousSoId || so.soNumber === repeatForm.previousSoId);
      if (selectedSo) {
        setRepeatForm(prev => ({
          ...prev,
          estimatedAmount: selectedSo.estimatedAmount || 0,
          generalNotes: selectedSo.notes || "",
        }));

        if (selectedSo.items && selectedSo.items.length > 0) {
          const totalItemQty = selectedSo.items.reduce((sum: number, item: any) => sum + (item.quantity || item.qty || 0), 0);
          const totalEstimated = selectedSo.estimatedAmount || 0;

          const mappedProducts = selectedSo.items.map((item: any, idx: number) => {
            const itemPartNumber = item.partNumber || item.productPartNumber || "";
            const matchedProduct = catalogProductOptions.find(p => p.id === item.productId)
              || (itemPartNumber ? catalogProductOptions.find(p => p.partNumber === itemPartNumber) : undefined)
              || catalogProductOptions.find(p => p.label.includes(item.productName || itemPartNumber));

            let materials: any[] = [];
            if (matchedProduct) {
              materials = matchedProduct.bomItems?.length ? matchedProduct.bomItems.map((b: any) => ({
                id: b.inventoryItemId,
                name: `${b.inventoryItemCode} - ${b.inventoryItemName}`,
                specification: "",
                quantity: String(b.quantity || b.qty),
                unit: b.unit,
              })) : [];
            }

            const itemQty = item.quantity || item.qty || 1;
            let unitPrice = item.unitPrice || 0;
            if (unitPrice === 0 && totalItemQty > 0 && totalEstimated > 0) {
              unitPrice = Math.floor(totalEstimated / totalItemQty);
            }

            return {
              ...emptyProduct(),
              type: (matchedProduct ? "existing" : "custom") as "existing" | "custom",
              productName: matchedProduct ? matchedProduct.label : (item.productName || itemPartNumber || selectedSo.description || `Item ${idx + 1}`),
              customName: item.productName || selectedSo.description,
              quantity: String(itemQty),
              unit: item.unit || "PCS",
              unitPrice,
              materials,
            } as ProductRow;
          });
          setRepeatProducts(mappedProducts);
        } else {
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
    }
  }, [orderType, repeatForm.previousSoId, salesOrders, repeatProducts.length, catalogProductOptions]);

  React.useEffect(() => {
    if (orderType === "new") {
      const total = products.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
      setCustomerForm(f => ({ ...f, estimatedAmount: total }));
    }
  }, [products, orderType]);

  React.useEffect(() => {
    if (!isExistingCustomer && !isEdit && orderType === "new" && (!customerForm.customerCode || customerForm.customerCode.startsWith("CUST-") === false)) {
      import("../../services/salesApi").then(({ salesApi }) => {
        salesApi.getNextCustomerCode().then(res => {
          setCustomerForm(f => ({ ...f, customerCode: res.code }));
        }).catch(() => {});
      });
    }
  }, [isExistingCustomer, isEdit, orderType]);

  // ── Product list helpers ──
  const handleBack = () => {
    if (orderType) { handleReset(); } else { onNavigate("so-list"); }
  };

  const updateProduct = useCallback((id: string, updated: ProductRow, list: ProductRow[], setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => {
    setter(list.map(p => p.id === id ? updated : p));
  }, []);

  const addProduct = (setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => [...prev, emptyProduct()]);
  const removeProduct = (id: string, setter: React.Dispatch<React.SetStateAction<ProductRow[]>>) => setter(prev => prev.filter(p => p.id !== id));

  const handleReset = () => {
    setSubmitted(false); setOrderType(null); setGeneratedSONumber("");
    setIsExistingCustomer(false);
    setCustomerForm({ customerCode: "", customerName: "", company: "", phone: "", email: "", address: "", deadline: "", generalNotes: "", estimatedAmount: 0 });
    setProducts([emptyProduct()]); setRepeatForm({ customerId: "", previousSoId: "", deadline: "", generalNotes: "", estimatedAmount: 0 });
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
    setRepeatProducts([]);
  };

  // ── Backend integration ──
  const ensureCustomerId = async (input: { code: string; company: string; customerName: string; email?: string; phone?: string; address?: string }) => {
    const code = input.code.trim().toUpperCase();
    const backendCustomers = await salesApi.listCustomers();
    const existing = backendCustomers.find(customer => customer.code.toUpperCase() === code);
    if (existing) return { id: existing.id, code: existing.code, isNew: false };

    const created = await salesApi.createCustomer({
      code,
      name: input.company.trim() || input.customerName.trim() || code,
      address: input.address || null,
      contactPerson: input.customerName.trim() || null,
      email: input.email || null,
      phone: input.phone || null,
    });
    return { id: created.id, code: created.code, isNew: true };
  };

  const ensureProductId = async (row: ProductRow, nextPrdNum: { current: number }) => {
    if (row.type === "existing" && row.productName) {
      const selected = catalogProductOptions.find(product => product.label === row.productName || product.label.includes(row.productName));
      if (selected) return { id: selected.id, isNew: false };
    }

    const name = (row.type === "custom" ? row.customName : row.productName).trim();
    const fallbackName = name || "Custom Product";
    const created = await salesApi.createProduct({
      partNumber: "",
      description: fallbackName,
      unit: row.unit || "pcs",
      materialSpec: row.materials.map(m => m.specification || m.name).filter(Boolean).join("; ") || row.notes || null,
    });
    return { id: created.id, isNew: true };
  };

  const createSalesOrderFromRows = async (
    customerId: string, targetDate: string, customerDrawingUrl: string,
    rows: ProductRow[], designStatus?: string,
  ) => {
    let maxPrd = 0;
    productCatalog.forEach(p => {
      if (p.partNumber.startsWith("PRD-")) {
        const num = parseInt(p.partNumber.split("-")[1], 10);
        if (!isNaN(num) && num > maxPrd) maxPrd = num;
      }
    });
    const nextPrdNum = { current: maxPrd + 1 };

    const items = [];
    const newlyCreatedProductIds: string[] = [];

    try {
      for (const row of rows) {
        const productRes = await ensureProductId(row, nextPrdNum);
        if (productRes.isNew) newlyCreatedProductIds.push(productRes.id);

        items.push({
          productId: productRes.id,
          qty: Number(row.quantity) || 1,
          unitPrice: row.unitPrice || 0,
          notes: row.materials && row.materials.length > 0 ? JSON.stringify(row.materials) : (row.notes || null),
          designReference: row.type === "custom" && row.designId === "none" ? "INTERNAL_DESIGN" : null,
          customerDrawingUrl: row.type === "custom" && row.designId === "customer" ? (row.customerDesignUrl || null) : null,
        });
      }

      return await salesApi.createSalesOrder({
        customerId, soDate: today, targetDate,
        customerDrawingUrl: customerDrawingUrl || null,
        designReference: rows.some(r => r.type === "custom" && r.designId === "none") ? "INTERNAL_DESIGN" : null,
        designStatus: designStatus ?? (rows.some(r => r.type === "custom") ? "PendingDesign" : "Approved"),
        items,
      });
    } catch (error) {
      for (const pid of newlyCreatedProductIds) {
        try { await salesApi.deleteProduct(pid); } catch (e) { console.error("Failed to rollback orphaned product", pid, e); }
      }
      throw error;
    }
  };

  // ── Submit handlers ──
  const handleNewOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && editSoId) {
      window.alert("Edit Sales Order langsung belum tersedia di backend. Buat SO baru dari QUT atau repeat order untuk E2E.");
      return;
    }

    setIsSubmitting(true);
    try {
      const missingDesignUrl = products.some(p => p.type === "custom" && p.designId === "customer" && !p.customerDesignUrl?.trim());
      if (missingDesignUrl) {
        window.alert("Mohon lengkapi URL Referensi Desain untuk produk custom yang menggunakan referensi pelanggan.");
        setIsSubmitting(false);
        return;
      }

      const customerRes = await ensureCustomerId({
        code: customerForm.customerCode, company: customerForm.company,
        customerName: customerForm.customerName, email: customerForm.email,
        phone: customerForm.phone, address: customerForm.address,
      });
      
      try {
        const custProduct = products.find(p => p.type === "custom" && p.designId === "customer");
        const finalImageUrl = custProduct?.customerDesignUrl || "";
        const created = await createSalesOrderFromRows(customerRes.id, customerForm.deadline, finalImageUrl, products);
        if (customerForm.estimatedAmount) {
          updateSalesOrder(created.soNumber || created.id, { estimatedAmount: customerForm.estimatedAmount });
        }
        await refreshBackendData();
        setGeneratedSONumber(created.soNumber);
        setSubmitted(true);
      } catch (error) {
        if (customerRes.isNew) {
          try { await salesApi.deleteCustomer(customerRes.code); } catch (e) { console.error("Failed to rollback orphaned customer", customerRes.code, e); }
        }
        throw error;
      }
    } catch (error: any) {
      if (error?.response?.status === 401) return;
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
      const missingDesignUrl = repeatProducts.some(p => p.type === "custom" && p.designId === "customer" && !p.customerDesignUrl?.trim());
      if (missingDesignUrl) {
        window.alert("Mohon lengkapi URL Referensi Desain untuk produk custom yang menggunakan referensi pelanggan.");
        setIsSubmitting(false);
        return;
      }

      const customerRes = await ensureCustomerId({
        code: selectedCustomer.code, company: selectedCustomer.name,
        customerName: selectedCustomer.contactPerson || selectedCustomer.name,
        email: selectedCustomer.email || selectedCustomer.contact,
        phone: selectedCustomer.phone, address: selectedCustomer.address,
      });
      
      try {
        const custRepeatProduct = repeatProducts.find(p => p.type === "custom" && p.designId === "customer");
        const finalImageUrl = custRepeatProduct?.customerDesignUrl || "";
        const created = await createSalesOrderFromRows(customerRes.id, repeatForm.deadline, finalImageUrl, repeatProducts, "Approved");
        if (repeatForm.estimatedAmount) {
          updateSalesOrder(created.soNumber || created.id, { estimatedAmount: repeatForm.estimatedAmount });
        }
        await refreshBackendData();
        setGeneratedSONumber(created.soNumber);
        setSubmitted(true);
      } catch (error) {
        if (customerRes.isNew) {
          try { await salesApi.deleteCustomer(customerRes.code); } catch (e) { console.error("Failed to rollback orphaned customer", customerRes.code, e); }
        }
        throw error;
      }
    } catch (error: any) {
      if (error?.response?.status === 401) return;
      console.error(error);
      window.alert("Gagal membuat Repeat Order di backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submitted state ──
  if (submitted) {
    const totalItems = orderType === "repeat" ? repeatProducts.length : products.length;
    const isCustomSubmit = orderType === "repeat"
      ? repeatProducts.some(r => r.type === "custom")
      : products.some(r => r.type === "custom");

    return (
      <SuccessScreen
        generatedSoNumber={generatedSONumber}
        totalItems={totalItems}
        isCustomSubmit={isCustomSubmit}
        isEdit={isEdit}
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
        <form onSubmit={handleNewOrderSubmit} style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
          <CustomerSection
            form={{ customerCode: customerForm.customerCode, customerName: customerForm.customerName, company: customerForm.company, phone: customerForm.phone, email: customerForm.email, address: customerForm.address }}
            onChange={f => setCustomerForm({ ...customerForm, ...f })}
            isExistingCustomer={isExistingCustomer}
            onToggleExisting={setIsExistingCustomer}
            customers={customers}
          />

          <OrderDetailSection
            deadline={customerForm.deadline}
            onDeadlineChange={v => setCustomerForm({ ...customerForm, deadline: v })}
            generalNotes={customerForm.generalNotes}
            onNotesChange={v => setCustomerForm({ ...customerForm, generalNotes: v })}
          />

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

          <PricingSection
            estimatedAmount={customerForm.estimatedAmount || 0}
            onChange={val => setCustomerForm({ ...customerForm, estimatedAmount: val })}
          />

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

      {/* ===== Repeat Order Form ===== */}
      {orderType === "repeat" && (
        <form onSubmit={handleRepeatOrderSubmit} style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
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
                <Select required value={repeatForm.previousSoId} onChange={e => handleRepeatSoSelect(e.target.value)}>
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

          <OrderDetailSection
            deadline={repeatForm.deadline}
            onDeadlineChange={v => setRepeatForm({ ...repeatForm, deadline: v })}
            generalNotes={repeatForm.generalNotes}
            onNotesChange={v => setRepeatForm({ ...repeatForm, generalNotes: v })}
          />

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

          <PricingSection
            estimatedAmount={repeatForm.estimatedAmount || 0}
            onChange={val => setRepeatForm({ ...repeatForm, estimatedAmount: val })}
          />

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
