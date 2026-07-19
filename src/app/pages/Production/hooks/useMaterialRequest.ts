import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router";
import { useApp } from "../../../components/context/AppContext";
import { PurchasingUrgency } from "../../../components/data/mockData";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { getMaterialOptions } from "../components/material-request/MaterialRequestHelpers";

export function useMaterialRequest() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const prefillStockIssues = (location.state as any)?.stockIssues as Array<{ 
    itemName: string; 
    required: number; 
    available: number;
    specs?: Array<{ spec: string; quantity: number }>;
  }> | undefined;

  const { salesOrders, currentUser, refreshBackendData, purchasingRequests } = useApp();
  
  const prefillRef = useRef(prefillStockIssues);
  if (prefillStockIssues && prefillStockIssues.length > 0) {
    prefillRef.current = prefillStockIssues;
  }
  
  const so = salesOrders.find(s => s.id === id || s.backendId === id);
  const request = purchasingRequests.find(pr => pr.salesOrderId === id || pr.salesOrderId === so?.backendId);
  
  const [realInventoryItems, setRealInventoryItems] = useState<InventoryItemDto[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<Array<{
    materialKey: string;
    itemName: string;
    specification: string;
    quantity: string;
    maxQuantity?: number;
    unit: string;
    urgency: PurchasingUrgency;
    purchaseCategory: string;
  }>>([]);

  const [bomOptions, setBomOptions] = useState<any[]>([]);

  useEffect(() => {
    if (!so) return;

    const prefill = prefillRef.current;
    if (prefill && prefill.length > 0) {
      let hasMultipleSpecs = false;
      const mapped = prefill.flatMap(issue => {
        const missingQty = Math.max(0, issue.required - (issue.available || 0));
        
        if (issue.specs && issue.specs.length > 0) {
          if (issue.specs.length > 1) hasMultipleSpecs = true;
          return issue.specs.map((s, idx) => ({
            materialKey: `stock-${issue.itemName.replace(/\s/g, '_')}-${idx}`,
            itemName: issue.itemName,
            specification: s.spec,
            quantity: String(issue.specs!.length === 1 ? missingQty : s.quantity),
            maxQuantity: issue.specs!.length === 1 ? missingQty : s.quantity,
            unit: "pcs",
            urgency: "Urgent" as PurchasingUrgency,
            purchaseCategory: "Project",
          }));
        }

        return [{
          materialKey: `stock-${issue.itemName.replace(/\s/g, '_')}`,
          itemName: issue.itemName,
          specification: "",
          quantity: String(missingQty),
          maxQuantity: missingQty,
          unit: "pcs",
          urgency: "Urgent" as PurchasingUrgency,
          purchaseCategory: "Project",
        }];
      });
      setItems(mapped);
      setBomOptions(mapped.map(m => ({
        id: m.materialKey,
        name: m.itemName,
        code: '',
        currentStock: 0,
        unit: m.unit,
        spec: m.specification,
        maxQuantity: m.maxQuantity,
      })));
      
      if (hasMultipleSpecs) {
        setNotes(`Auto-generated dari pengecekan stok. Terdapat beberapa spesifikasi berbeda untuk material yang kurang. Silakan hapus atau sesuaikan kuantitas untuk spesifikasi yang benar-benar perlu dibeli.`);
      } else {
        setNotes(`Auto-generated dari pengecekan stok — material tidak mencukupi untuk memulai produksi.`);
      }
      return;
    }

    if (request && request.status !== 'Selesai' && request.items && request.items.length > 0) {
      setItems(request.items.map((m: any, idx: number) => ({
        materialKey: `req-${idx}`,
        itemName: m.itemName || "",
        specification: m.specification || m.size || "",
        quantity: String(m.quantity || m.qty || 1),
        unit: m.unit || "pcs",
        urgency: m.urgency || "Urgent",
        purchaseCategory: m.purchaseCategory || "Project",
      })));
      if (request.notes) {
        setNotes(request.notes);
      }
      return;
    }

    const soItems = so.items ?? [];
    const productIds = [...new Set((soItems as any[]).map((i: any) => i.productId).filter(Boolean))];

    if (productIds.length === 0) {
      const mats = getMaterialOptions(so);
      setBomOptions(mats.map(m => ({ id: m.key, name: m.itemName, code: m.specification || 'BOM', unit: 'pcs', currentStock: 0, spec: m.specification, maxQuantity: m.quantity })));
      if (mats.length > 0) {
        setItems(mats.map(m => ({
          materialKey: m.key,
          itemName: m.itemName,
          specification: m.specification,
          quantity: m.quantity ? String(m.quantity) : "1",
          maxQuantity: m.quantity,
          unit: "pcs",
          urgency: "Urgent" as PurchasingUrgency,
          purchaseCategory: "Project",
        })));
      } else {
        setItems([{ materialKey: "", itemName: "", specification: "", quantity: "1", unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }]);
      }
      return;
    }

    masterDataApi.getBomStock(productIds).then(bomStocks => {
      const issues: any[] = [];
      for (const soItem of (soItems || [])) {
        const soProductId = (soItem as any).productId;
        const soItemId = soItem.id;
        const customBoms = so.bomsPerItem?.[soItemId] || [];
        const bomStock = bomStocks.find(bs => bs.productId === soProductId);
        if (!bomStock?.items?.length) continue;

        const aggregatedItems = new Map<string, typeof bomStock.items[0]>();
        for (const item of bomStock.items) {
          const existing = aggregatedItems.get(item.inventoryItemId);
          if (existing) {
            existing.bomQuantity += item.bomQuantity;
          } else {
            aggregatedItems.set(item.inventoryItemId, { ...item });
          }
        }

        const productQty = (soItem as any).qty || soItem.quantity || 1;
        for (const item of aggregatedItems.values()) {
          const required = item.bomQuantity * productQty;
          const available = item.currentStock;
          
          const matchingCustomBoms = customBoms.filter(cb => cb.inventoryItemId === item.inventoryItemId);
          const specs = matchingCustomBoms.map(cb => ({
            spec: cb.spec || "",
            quantity: (cb.quantity || 1) * productQty
          }));
          
          if (available < required) {
            const existing = issues.find(i => i.itemName === item.inventoryItemName);
            if (existing) {
              existing.required += required;
              if (specs.length > 0) {
                existing.specs = [...(existing.specs || []), ...specs];
              }
            } else {
              issues.push({
                itemName: item.inventoryItemName,
                required,
                available,
                bomQty: item.bomQuantity,
                productQty,
                specs: specs.length > 0 ? specs : undefined
              });
            }
          }
        }
      }

      let hasMultipleSpecs = false;
      const mapped = issues.flatMap(issue => {
        const missingQty = Math.max(0, issue.required - (issue.available || 0));
        
        if (issue.specs && issue.specs.length > 0) {
          if (issue.specs.length > 1) hasMultipleSpecs = true;
          return issue.specs.map((s: any, idx: number) => ({
            materialKey: `stock-${issue.itemName.replace(/\s/g, '_')}-${idx}`,
            itemName: issue.itemName,
            specification: s.spec,
            quantity: String(issue.specs!.length === 1 ? missingQty : s.quantity),
            maxQuantity: issue.specs!.length === 1 ? missingQty : s.quantity,
            unit: "pcs",
            urgency: "Urgent" as PurchasingUrgency,
            purchaseCategory: "Project",
          }));
        }

        return [{
          materialKey: `stock-${issue.itemName.replace(/\s/g, '_')}`,
          itemName: issue.itemName,
          specification: "",
          quantity: String(missingQty),
          maxQuantity: missingQty,
          unit: "pcs",
          urgency: "Urgent" as PurchasingUrgency,
          purchaseCategory: "Project",
        }];
      });

      if (mapped.length > 0) {
        setItems(mapped);
        setBomOptions(mapped.map(m => ({
          id: m.materialKey,
          name: m.itemName,
          code: '',
          currentStock: 0,
          unit: m.unit,
          spec: m.specification,
          maxQuantity: m.maxQuantity,
        })));
        
        if (hasMultipleSpecs) {
          setNotes(`Auto-generated dari pengecekan stok. Terdapat beberapa spesifikasi berbeda untuk material yang kurang. Silakan hapus atau sesuaikan kuantitas untuk spesifikasi yang benar-benar perlu dibeli.`);
        } else {
          setNotes(`Auto-generated dari pengecekan stok — material tidak mencukupi untuk memulai produksi.`);
        }
      } else {
        const mats = getMaterialOptions(so);
        setBomOptions(mats.map(m => ({ id: m.key, name: m.itemName, code: m.specification || 'BOM', unit: 'pcs', currentStock: 0, spec: m.specification, maxQuantity: m.quantity })));
        setItems(mats.length > 0
          ? mats.map(m => ({ materialKey: m.key, itemName: m.itemName, specification: m.specification, quantity: m.quantity ? String(m.quantity) : "1", maxQuantity: m.quantity, unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }))
          : [{ materialKey: "", itemName: "", specification: "", quantity: "1", unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }]
        );
      }
    }).catch(() => {
      const mats = getMaterialOptions(so);
      setBomOptions(mats.map(m => ({ id: m.key, name: m.itemName, code: m.specification || 'BOM', unit: 'pcs', currentStock: 0, spec: m.specification, maxQuantity: m.quantity })));
      setItems(mats.length > 0
        ? mats.map(m => ({ materialKey: m.key, itemName: m.itemName, specification: m.specification, quantity: m.quantity ? String(m.quantity) : "1", maxQuantity: m.quantity, unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }))
        : [{ materialKey: "", itemName: "", specification: "", quantity: "1", unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }]
      );
    });
  }, [so?.id, request?.id]);

  useEffect(() => {
    masterDataApi.listInventory().then(setRealInventoryItems).catch(console.error);
  }, []);

  const mergedOptions = realInventoryItems.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    currentStock: p.currentStock || 0,
    unit: p.unit || "pcs",
    spec: (p as any).specification || (p as any).description || ""
  }));

  const updateItem = (index: number, key: keyof typeof items[number], value: string) => {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      materialKey: "",
      itemName: "",
      specification: "",
      quantity: "1",
      maxQuantity: undefined,
      unit: "pcs",
      urgency: "Normal",
      purchaseCategory: "Project",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectMaterial = (index: number, materialKey: string) => {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index
      ? { ...item, materialKey }
      : item));
  };

  const parsedItems = items.map(item => ({
    itemName: item.itemName.trim(),
    specification: item.specification.trim(),
    quantity: Number.parseInt(item.quantity, 10),
    unit: item.unit.trim() || "pcs",
    urgency: item.urgency,
    purchaseCategory: item.purchaseCategory,
  }));

  const uniqueItemNames = new Set(parsedItems.filter(item => item.itemName).map(item => item.itemName + '|' + item.specification));
  const hasDuplicates = parsedItems.filter(item => item.itemName).length !== uniqueItemNames.size;

  const canSubmit = parsedItems.every(item => 
    item.itemName && 
    mergedOptions.some(opt => opt.name === item.itemName) &&
    Number.isFinite(item.quantity) && 
    item.quantity > 0
  ) && !hasDuplicates;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!canSubmit) return;
    if (isSubmitting) return;

    if (!so) {
      setErrorMsg("Sales Order tidak ditemukan.");
      return;
    }

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const requesterId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = so.backendId || so.id;
    if (!isGuid(salesOrderId)) {
      setErrorMsg("Data backend Sales Order belum lengkap. Refresh data atau pastikan SO sudah tersinkron ke backend.");
      return;
    }

    if (!requesterId) {
      setErrorMsg("ID operator tidak ditemukan. Silakan login ulang dengan akun Engineering yang ditugaskan.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      try {
        const { salesApi } = await import("../../../services/salesApi");
        await salesApi.confirmSalesOrder(salesOrderId, requesterId);
      } catch (err) {
        console.warn("Auto-confirm SO silently failed or already confirmed", err);
      }

      const isSpvUser = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner' || currentUser?.username === 'eng_spv';
      const { purchasingApi } = await import("../../../services/purchasingApi");
      const created = await purchasingApi.createPurchaseRequest({
        requestDate: new Date().toISOString().split("T")[0],
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || currentUser?.role || 'Engineering User',
        salesOrderId: salesOrderId,
        salesOrderNumber: so.id,
        projectName: so.id,
        requireSupervisorApproval: !isSpvUser,
        items: parsedItems.map(item => ({
          materialRequirementId: null,
          salesOrderItemId: null,
          itemName: item.itemName,
          size: item.specification || null,
          qty: item.quantity,
          urgency: item.urgency,
          suggestedSupplier: null,
          notes: notes || null,
          purchaseCategory: item.purchaseCategory,
        })),
      });

      if (isSpvUser && created?.id) {
        try {
          await purchasingApi.supervisorReviewPurchaseRequest(created.id, {
            reviewedByUserId: requesterId,
            decision: 'Accept',
          });
        } catch (err) {
          console.warn("Auto supervisor review failed for production MR", err);
        }
      }

      await refreshBackendData();
      setIsSuccess(true);
    } catch (error: unknown) {
      console.warn("Failed to submit production material request to backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      setErrorMsg(backendMsg || "MR gagal dikirim ke backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    so,
    request,
    currentUser,
    items,
    updateItem,
    addItem,
    removeItem,
    selectMaterial,
    notes,
    setNotes,
    bomOptions,
    mergedOptions,
    isSubmitting,
    isSuccess,
    errorMsg,
    hasDuplicates,
    canSubmit,
    handleSubmit,
  };
}
