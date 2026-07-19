import { useState, useCallback, useEffect } from "react";
import { salesApi } from "../../../services/salesApi";
import { useApp } from "../../context/AppContext";
import { ProductLineItemType as ProductRow } from "../schema/soCreateSchema";
import { emptyProduct } from "../create/ProductLineItem";

export type OrderType = "new" | "repeat" | null;

export interface CustomerForm {
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

export interface RepeatForm {
  customerId: string;
  previousSoId: string;
  deadline: string;
  generalNotes: string;
  estimatedAmount?: number;
}

export function useSOCreate(initialData?: { customerId?: string; orderType?: "new" | "repeat"; mode?: string; soId?: string }) {
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingSubmitType, setPendingSubmitType] = useState<"new" | "repeat" | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [repeatForm, setRepeatForm] = useState<RepeatForm>({
    customerId: initialData?.customerId || "", previousSoId: initialData?.soId || "", deadline: "", generalNotes: "", estimatedAmount: 0
  });

  const [repeatProducts, setRepeatProducts] = useState<ProductRow[]>([]);

  const selectedCustomer = orderType === "repeat"
    ? customers.find(c => c.code === repeatForm.customerId)
    : null;

  useEffect(() => {
    if (orderType === "repeat" && repeatForm.previousSoId && repeatProducts.length === 0 && salesOrders.length > 0) {
      const selectedSo = salesOrders.find(so => so.id === repeatForm.previousSoId || so.soNumber === repeatForm.previousSoId);
      if (selectedSo) {
        setRepeatForm(prev => ({
          ...prev,
          estimatedAmount: selectedSo.estimatedAmount || 0,
          generalNotes: selectedSo.notes || "",
        }));

        if (selectedSo.items && selectedSo.items.length > 0) {
          const mappedProducts = selectedSo.items.map((item: any, idx: number) => {
            const itemPartNumber = item.partNumber || item.productPartNumber || "";
            const matchedProduct = catalogProductOptions.find(p => p.id === item.productId)
              || (itemPartNumber ? catalogProductOptions.find(p => p.partNumber === itemPartNumber) : undefined)
              || catalogProductOptions.find(p => p.label.includes(item.productName || itemPartNumber));

            let materials: any[] = [];
            if (matchedProduct) {
              materials = matchedProduct.bomItems?.length ? matchedProduct.bomItems.map((b: any) => ({
                id: b.inventoryItemId,
                name: b.inventoryItemName,
                code: b.inventoryItemCode,
                specification: "",
                quantity: String(b.quantity || b.qty),
                unit: b.unit,
              })) : [];
            }

            const itemQty = item.quantity || item.qty || 1;
            let unitPrice = item.unitPrice || 0;

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
            unitPrice: 0,
            materials,
          }]);
        }
      }
    }
  }, [orderType, repeatForm.previousSoId, salesOrders, repeatProducts.length, catalogProductOptions]);

  useEffect(() => {
    if (orderType === "new") {
      const total = products.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
      setCustomerForm(f => ({ ...f, estimatedAmount: total }));
    }
  }, [products, orderType]);

  useEffect(() => {
    if (orderType === "repeat") {
      const total = repeatProducts.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
      setRepeatForm(f => ({ ...f, estimatedAmount: total }));
    }
  }, [repeatProducts, orderType]);

  useEffect(() => {
    if (!isExistingCustomer && !isEdit && orderType === "new" && (!customerForm.customerCode || customerForm.customerCode.startsWith("CUST-") === false)) {
      import("../../../services/salesApi").then(({ salesApi }) => {
        salesApi.getNextCustomerCode().then(res => {
          setCustomerForm(f => ({ ...f, customerCode: res.code }));
        }).catch(() => {});
      });
    }
  }, [isExistingCustomer, isEdit, orderType]);

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
      const selected = catalogProductOptions.find(product => product.label === row.productName || product.label.includes(row.productName!));
      if (selected) return { id: selected.id, isNew: false };
    }

    const name = (row.type === "custom" ? (row.customName || "") : (row.productName || "")).trim();
    const fallbackName = name || "Custom Product";
    const created = await salesApi.createProduct({
      partNumber: "",
      description: fallbackName,
      unit: row.unit || "pcs",
      materialSpec: (row.materials || []).map((m: any) => m.specification || m.name).filter(Boolean).join("; ") || row.notes || null,
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

  const handleNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && editSoId) {
      window.alert("Edit Sales Order langsung belum tersedia di backend. Buat SO baru dari QUT atau repeat order untuk E2E.");
      return;
    }
    setPendingSubmitType("new");
    setConfirmModalOpen(true);
  };

  const executeNewOrderSubmit = async () => {
    setIsSubmitting(true);
    setConfirmModalOpen(false);
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

  const handleRepeatOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setPendingSubmitType("repeat");
    setConfirmModalOpen(true);
  };

  const executeRepeatOrderSubmit = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    setConfirmModalOpen(false);
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

  return {
    orderType, setOrderType,
    customerForm, setCustomerForm,
    products, setProducts,
    submitted,
    generatedSONumber,
    isSubmitting,
    isExistingCustomer, setIsExistingCustomer,
    confirmModalOpen, setConfirmModalOpen,
    pendingSubmitType, setPendingSubmitType,
    repeatForm, setRepeatForm,
    repeatProducts, setRepeatProducts,
    selectedCustomer,
    catalogProductOptions,
    isEdit, editSoId,
    customers, salesOrders,
    updateProduct, addProduct, removeProduct,
    handleReset,
    handleRepeatSoSelect,
    handleNewOrderSubmit, executeNewOrderSubmit,
    handleRepeatOrderSubmit, executeRepeatOrderSubmit
  };
}
