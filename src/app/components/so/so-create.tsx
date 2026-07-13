import React, { useState, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, CheckCircle2,
  User, Building2, Phone, Mail, MapPin,
  Package, Hash, Calendar, FileText, Search,
  ChevronRight,
  Layers, DollarSign
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { salesApi } from "../../services/salesApi";
import {
  Label, Input, CurrencyInput, Textarea, Select,
  SearchableCustomerSelect, SectionCard, Grid2
} from "./create/FormHelpers";
import {
  ProductRow, ProductOption, emptyProduct,
  ProductLineItem, AddProductBtn
} from "./create/ProductLineItem";

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
  bgHover: "#E2E8F0",
  white: "#FFFFFF",
  red: "#EF4444",
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
      return { id: existing.id, code: existing.code, isNew: false };
    }

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
      if (selected) {
        return { id: selected.id, isNew: false };
      }
    }

    const name = (row.type === "custom" ? row.customName : row.productName).trim();
    const fallbackName = name || "Custom Product";
    const created = await salesApi.createProduct({
      partNumber: "",
      description: fallbackName,
      unit: row.unit || "pcs",
      materialSpec: row.materials.map(material => material.specification || material.name).filter(Boolean).join("; ") || row.notes || null,
    });
    return { id: created.id, isNew: true };
  };

  const createSalesOrderFromRows = async (
    customerId: string,
    targetDate: string,
    customerDrawingUrl: string,
    rows: ProductRow[],
    designStatus?: string,
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

      const payload = {
        customerId,
        soDate: today,
        targetDate,
        customerDrawingUrl: customerDrawingUrl || null,
        designReference: rows.some(r => r.type === "custom" && r.designId === "none") ? "INTERNAL_DESIGN" : null,
        designStatus: designStatus ?? (rows.some(r => r.type === "custom") ? "PendingDesign" : "Approved"),
        items,
      };

      return await salesApi.createSalesOrder(payload);
    } catch (error) {
      for (const pid of newlyCreatedProductIds) {
        try {
          await salesApi.deleteProduct(pid);
        } catch (e) {
          console.error("Failed to rollback orphaned product", pid, e);
        }
      }
      throw error;
    }
  };

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
        code: customerForm.customerCode,
        company: customerForm.company,
        customerName: customerForm.customerName,
        email: customerForm.email,
        phone: customerForm.phone,
        address: customerForm.address,
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
          try {
            await salesApi.deleteCustomer(customerRes.code);
          } catch (e) {
            console.error("Failed to rollback orphaned customer", customerRes.code, e);
          }
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
        code: selectedCustomer.code,
        company: selectedCustomer.name,
        customerName: selectedCustomer.contactPerson || selectedCustomer.name,
        email: selectedCustomer.email || selectedCustomer.contact,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
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
          try {
            await salesApi.deleteCustomer(customerRes.code);
          } catch (e) {
            console.error("Failed to rollback orphaned customer", customerRes.code, e);
          }
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

      {orderType === "new" && (
        <form onSubmit={handleNewOrderSubmit}
          style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>

          <SectionCard title="Informasi Pelanggan" icon={<User size={14} />}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setIsExistingCustomer(false);
                  setCustomerForm({ ...customerForm, customerCode: "", customerName: "", company: "", phone: "", email: "", address: "" });
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
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A", fontFamily: "monospace", opacity: customerForm.customerCode ? 1 : 0.6 }}>{customerForm.customerCode || "Otomatis"}</span>
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
