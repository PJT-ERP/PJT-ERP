import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Trash2, Plus, ChevronLeft, CheckCircle } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { PurchasingUrgency, SalesOrder } from "../../components/data/mockData";
import { productionApi } from "../../services/productionApi";
import { masterDataApi, InventoryItemDto } from "../../services/masterDataApi";
import { isGuid, toBackendUserId } from "../../services/backendIds";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

type MaterialOption = {
  key: string;
  itemName: string;
  specification: string;
  quantity?: number;
};

function parseMaterialText(value?: string | null): MaterialOption[] {
  if (!value) return [];

  return value
    .split(/[;\n]+/)
    .map((entry, index) => {
      const text = entry.trim();
      if (!text) return null;
      const separatorIndex = text.indexOf(":");
      const itemName = separatorIndex >= 0 ? text.slice(0, separatorIndex).trim() : text;
      const specification = separatorIndex >= 0 ? text.slice(separatorIndex + 1).trim() : "";
      if (!itemName) return null;

      return {
        key: `text-${index}-${itemName}`,
        itemName,
        specification,
      };
    })
    .filter(Boolean) as MaterialOption[];
}

function getMaterialOptions(so: SalesOrder): MaterialOption[] {
  const options: MaterialOption[] = [];
  const seen = new Set<string>();

  const addOption = (item: string, spec: string, quantity?: number) => {
    const key = `${item.toLowerCase().trim()}|${spec.toLowerCase().trim()}`;
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      options.push({ key: `mat-${seen.size}`, itemName: item.trim(), specification: spec.trim(), quantity });
    }
  };

  // 1. If Engineer explicitly defined materials, use them (but filter out obvious test data like "pppp")
  if (Array.isArray(so.materials) && so.materials.length > 0) {
    let hasValidEngineerMaterials = false;
    so.materials.forEach((material: any) => {
      const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
      const specification = String(material?.specification || material?.spec || material?.size || "").trim();
      
      // Ignore obvious dummy test inputs
      if (itemName && itemName.toLowerCase() !== "pppp") {
        const quantity = typeof material?.quantity === 'number' ? material.quantity : Number(material?.quantity);
        addOption(itemName, specification, isNaN(quantity) ? undefined : quantity);
        hasValidEngineerMaterials = true;
      }
    });
    
    // If engineer provided a valid BOM, we shouldn't mix it with raw SO descriptions
    if (hasValidEngineerMaterials) {
      return options;
    }
  }

  // 2. Fallback to parsing initial materials from SO creation
  parseMaterialText(so.material).forEach(m => addOption(m.itemName, m.specification));
  
  if (Array.isArray(so.items)) {
    so.items.forEach((item: any) => {
      const itemName = String(item?.productName || item?.productDescription || item?.partNumber || "").trim();
      if (itemName) {
        addOption(itemName, "");
      }
    });
  }

  // Only use description if we still have absolutely nothing
  if (options.length === 0 && so.description) {
    addOption(so.description, so.spec || "");
  }

  return options;
}

function MaterialAutocomplete({
  value,
  onChange,
  onSelectProduct,
  options,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: any) => void;
  options: any[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  const filtered = options.filter(p => 
    (p.code + ' ' + p.name).toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => {
          setIsFocused(false);
          if (value && !options.some(p => p.name.toLowerCase() === value.toLowerCase())) {
            onChange("");
          }
        }}
        placeholder="Ketik manual atau pilih dari daftar..."
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 14px", 
          border: `1px solid ${isFocused ? S.cyan : S.border}`, 
          borderRadius: 6, fontSize: "13.5px", outline: "none", 
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(200, 16, 46, 0.1)` : "none",
          fontFamily: S.font
        }}
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, zIndex: 50,
          ...(direction === 'down' ? { top: "100%", marginTop: 4 } : { bottom: "100%", marginBottom: 4 }),
          background: "#fff", border: `1px solid ${S.border}`,
          borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 280, overflowY: "auto", overflowX: "hidden"
        }}>
          {filtered.map(p => (
            <div 
              key={p.id}
              onMouseDown={e => {
                e.preventDefault(); // Prevent blur
                onSelectProduct(p);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${S.bg}`,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: S.slate }}>{p.name}</div>
              <div style={{ fontSize: "11.5px", color: S.secondary, marginTop: 4 }}>{p.code} | Stok: {p.currentStock} {p.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProductionMaterialRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const prefillStockIssues = (location.state as any)?.stockIssues as Array<{ itemName: string; required: number; available: number }> | undefined;
  const { salesOrders, currentUser, refreshBackendData, purchasingRequests } = useApp();
  
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

  // Fetch BOM data directly from API to avoid race conditions with context state
  useEffect(() => {
    if (!so) return;

    // If stock issues were passed from the production start modal, pre-fill from those
    if (prefillStockIssues && prefillStockIssues.length > 0) {
      setItems(prefillStockIssues.map(issue => ({
        materialKey: `stock-${issue.itemName.replace(/\s/g, '_')}`,
        itemName: issue.itemName,
        specification: "",
        quantity: String(issue.required),
        maxQuantity: issue.required,
        unit: "pcs",
        urgency: "Urgent" as PurchasingUrgency,
        purchaseCategory: "Project",
      })));
      setNotes(`Auto-generated dari pengecekan stok — material tidak mencukupi untuk memulai produksi.`);
      return;
    }

    // Jika sudah ada MR (misalnya ditolak dan dikembalikan), gunakan item dari MR tersebut
    if (request && request.items && request.items.length > 0) {
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
      // Fallback to legacy so.materials
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

    masterDataApi.listProducts().then(products => {
      const productsById = new Map(products.map(p => [p.id, p]));
      const materialsByKey = new Map<string, { materialKey: string; itemName: string; specification: string; quantity: number; unit: string; urgency: PurchasingUrgency; purchaseCategory: string }>();

      (soItems as any[]).forEach((soItem: any) => {
        const product = productsById.get(soItem.productId);
        if (!product || !product.bomItems || product.bomItems.length === 0) return;

        const itemQty = Number(soItem.quantity || soItem.qty || 1);
        product.bomItems.forEach((bomItem: any) => {
          const bomQty = Number(bomItem.quantity || 0);
          if (bomQty <= 0) return;
          const key = bomItem.inventoryItemId || `${bomItem.inventoryItemName}|${bomItem.unit}`;
          const total = bomQty * Math.max(itemQty, 1);

          if (materialsByKey.has(key)) {
            materialsByKey.get(key)!.quantity += total;
          } else {
            materialsByKey.set(key, {
              materialKey: key,
              itemName: bomItem.inventoryItemName,
              specification: bomItem.inventoryItemCode || "",
              quantity: total,
              unit: bomItem.unit || "pcs",
              urgency: "Urgent" as PurchasingUrgency,
              purchaseCategory: "Project",
            });
          }
        });
      });

      const uniqueBom = Array.from(materialsByKey.values());
      setBomOptions(uniqueBom.map(m => ({ id: m.materialKey, name: m.itemName, code: m.specification || 'BOM', unit: m.unit, currentStock: 0, spec: m.specification, maxQuantity: m.quantity })));

      if (uniqueBom.length > 0) {
        setItems(uniqueBom.map(m => ({ ...m, quantity: String(m.quantity), maxQuantity: m.quantity })));
      } else {
        // No BOM found for products — fallback to legacy
        const mats = getMaterialOptions(so);
        setBomOptions(mats.map(m => ({ id: m.key, name: m.itemName, code: m.specification || 'BOM', unit: 'pcs', currentStock: 0, spec: m.specification, maxQuantity: m.quantity })));
        if (mats.length > 0) {
          setItems(mats.map(m => ({ materialKey: m.key, itemName: m.itemName, specification: m.specification, quantity: m.quantity ? String(m.quantity) : "1", maxQuantity: m.quantity, unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" })));
        } else {
          setItems([{ materialKey: "", itemName: "", specification: "", quantity: "1", unit: "pcs", urgency: "Urgent" as PurchasingUrgency, purchaseCategory: "Project" }]);
        }
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
    spec: (p as any).specification || p.description || ""
  }));

  if (!so) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Sales Order tidak ditemukan.</p>
        <button onClick={() => navigate("/erp/production")} style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Kembali</button>
      </div>
    );
  }


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
    // materialKey is used when the user picks from the autocomplete dropdown
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

  const uniqueItemNames = new Set(parsedItems.filter(item => item.itemName).map(item => item.itemName));
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
      await productionApi.submitMaterialRequest(salesOrderId, {
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || so.assignedName || "Engineering",
        notes: notes || null,
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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: S.bg, fontFamily: S.font }}>
      <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <button 
            onClick={() => { window.location.href = '/erp/production'; }} 
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: S.white, border: `1px solid ${S.border}`, borderRadius: "8px", cursor: "pointer", color: S.slate, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: "8px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s", alignSelf: "flex-start" }}
            onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.borderColor = "#CBD5E1"; }}
            onMouseLeave={e => { e.currentTarget.style.background = S.white; e.currentTarget.style.borderColor = S.border; }}
          >
            <ChevronLeft size={16} /> Kembali ke Dasbor Produksi
          </button>

          <div style={{ background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: 32 }}>
          {isSuccess ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={32} style={{ color: "#22C55E" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                Material Request Berhasil Diajukan
              </h3>
              <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
                Pengajuan MR untuk {so.id} telah dikirim ke Supervisor untuk direview sebelum diteruskan ke tim Purchasing.
              </p>
              <button onClick={() => { window.location.href = '/erp/production'; }} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Dasbor Produksi</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ color: S.slate, margin: 0, fontSize: "22px" }}>Permintaan Material (MR)</h2>
                <p style={{ color: S.secondary, margin: "4px 0 0", fontSize: "14px" }}>
                  {so.id} — {so.customerName}
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "16px" }}>💡</span>
                  <p style={{ fontSize: "13.5px", color: "#1D4ED8", margin: 0 }}>
                    Isi daftar item untuk MR. Pengajuan ini memerlukan approval Supervisor sebelum diteruskan ke Purchasing.
                  </p>
                </div>

                { (request?.status === 'Ditolak' || request?.backendStatus === 'Rejected') && request?.rejectionReason && (
                  <div style={{ padding: "16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#B91C1C" }}>MR Sebelumnya Ditolak (Catatan SPV):</p>
                    <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#DC2626" }}>{request.rejectionReason}</p>
                  </div>
                )}

                {errorMsg && (
                  <div style={{ padding: "16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "14px" }}>
                    {errorMsg}
                  </div>
                )}

                {hasDuplicates && (
                  <div style={{ padding: "12px 16px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, color: "#92400E", fontSize: "13.5px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⚠️</span> Terdapat material yang duplikat / sama persis. Harap gabungkan quantity-nya menjadi 1 baris item saja.
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: S.slate }}>Daftar Material <span style={{ color: "#EF4444" }}>*</span></h3>
                  <button type="button" onClick={addItem} style={{ padding: "8px 14px", background: "#FEF2F2", color: S.cyan, border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "#FEF2F2"}>
                    <Plus size={14} /> Tambah Material
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Item #{index + 1}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} style={{ border: "none", background: "transparent", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: 500 }}>
                            <Trash2 size={14} /> Hapus
                          </button>
                        )}
                      </div>

                      {/* Row 1: Nama Item & Kategori */}
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 2 }}>
                          <select
                            value={item.materialKey || item.itemName}
                            onChange={e => {
                              const p = bomOptions.find(o => o.id === e.target.value || o.name === e.target.value);
                              if (p) {
                                updateItem(index, "materialKey", p.id);
                                updateItem(index, "itemName", p.name);
                                updateItem(index, "unit", p.unit);
                                updateItem(index, "maxQuantity", String(p.maxQuantity));
                                if (p.spec) {
                                  updateItem(index, "specification", p.spec);
                                }
                              } else {
                                updateItem(index, "materialKey", "");
                                updateItem(index, "itemName", "");
                              }
                            }}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", outline: "none", fontFamily: S.font, background: "#fff" }}
                          >
                            <option value="">Pilih Material BOM...</option>
                            {bomOptions.map(o => (
                              <option key={o.id} value={o.id}>{o.name} {o.spec ? `(${o.spec})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <select
                            value={item.purchaseCategory}
                            onChange={e => updateItem(index, "purchaseCategory", e.target.value)}
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg }}
                          >
                            <option>Project</option>
                            <option>Consumable</option>
                            <option>Tools</option>
                            <option>Maintenance</option>
                            <option>Asset</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Spesifikasi, Qty, Unit, Urgency */}
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ flex: 2 }}>
                          <input
                            value={item.specification}
                            onChange={e => updateItem(index, "specification", e.target.value)}
                            placeholder="Spesifikasi / ukuran..."
                            disabled={true}
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box", backgroundColor: "#F8FAFC", color: S.secondary }}
                          />
                        </div>
                        <div style={{ width: 80, position: "relative" }}>
                          <input
                            type="number"
                            min="1"
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={e => {
                              const val = Number(e.target.value);
                              if (item.maxQuantity && val > item.maxQuantity) {
                                updateItem(index, "quantity", String(item.maxQuantity));
                              } else {
                                updateItem(index, "quantity", e.target.value);
                              }
                            }}
                            placeholder="Qty"
                            required
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
                          />
                          {item.maxQuantity && (
                            <div style={{ position: "absolute", bottom: -18, left: 4, fontSize: "10px", color: S.secondary, whiteSpace: "nowrap" }}>Max: {item.maxQuantity}</div>
                          )}
                        </div>
                        <div style={{ width: 100 }}>
                          <select
                            value={item.unit}
                            onChange={e => updateItem(index, "unit", e.target.value)}
                            disabled={true}
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: "#F8FAFC", boxSizing: "border-box", color: S.secondary, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
                          >
                            {Array.from(new Set(["pcs", "kg", "meter", "lembar", "batang", "roll", "set", "box", "pack", item.unit])).filter(Boolean).map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ width: 130 }}>
                          <select
                            value={item.urgency}
                            onChange={e => updateItem(index, "urgency", e.target.value)}
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg, boxSizing: "border-box" }}
                          >
                            <option>Normal</option>
                            <option>Urgent</option>
                            <option>Critical</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: "14px", color: S.slate, fontWeight: 500, marginBottom: 8 }}>Catatan Tambahan</label>
                  <textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    placeholder="Tulis pesan untuk SPV/Purchasing..."
                    rows={3}
                    style={{ width: "100%", padding: "12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 16, borderTop: `1px solid ${S.border}`, paddingTop: 24 }}>
                  <button type="button" onClick={() => navigate("/erp/production")} style={{ flex: 1, padding: "12px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}>Batal</button>
                  <button type="submit" disabled={!canSubmit || isSubmitting} style={{ flex: 2, padding: "12px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", opacity: canSubmit && !isSubmitting ? 1 : 0.6, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {isSubmitting ? "Mengajukan..." : "Ajukan Material Request"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
