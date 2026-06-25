import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Trash2, Plus, ChevronLeft, CheckCircle } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingUrgency, SalesOrder } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";
import { masterDataApi, InventoryItemDto } from "../services/masterDataApi";
import { isGuid, toBackendUserId } from "../services/backendIds";

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

  const addOption = (item: string, spec: string) => {
    const key = `${item.toLowerCase().trim()}|${spec.toLowerCase().trim()}`;
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      options.push({ key: `mat-${seen.size}`, itemName: item.trim(), specification: spec.trim() });
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
        addOption(itemName, specification);
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
        onBlur={() => setIsFocused(false)}
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
  const { salesOrders, currentUser, refreshBackendData, purchasingRequests } = useApp();
  
  const so = salesOrders.find(s => s.id === id || s.backendId === id);
  const request = purchasingRequests.find(pr => pr.salesOrderId === id || pr.salesOrderId === so?.backendId);
  
  const materialOptions = so ? getMaterialOptions(so) : [];

  const [realInventoryItems, setRealInventoryItems] = useState<InventoryItemDto[]>([]);

  useEffect(() => {
    masterDataApi.listInventory().then(setRealInventoryItems).catch(console.error);
  }, []);

  const mergedOptions = [
    ...materialOptions.map((m, i) => ({
      id: `bom-${i}`,
      name: m.itemName,
      code: "BOM",
      currentStock: "-",
      unit: "pcs",
      spec: m.specification
    })),
    ...realInventoryItems.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      currentStock: p.currentStock || 0,
      unit: p.unit || "pcs"
    }))
  ];

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [items, setItems] = useState([
    {
      materialKey: "",
      itemName: "",
      specification: "",
      quantity: "1",
      unit: "pcs",
      urgency: "Urgent" as PurchasingUrgency,
      purchaseCategory: "Project",
    },
  ]);

  useEffect(() => {
    if (so) {
      const options = getMaterialOptions(so);
      
      const firstMaterial = options[0];
      if (firstMaterial && items[0].materialKey === "") {
        setItems([
          {
            materialKey: firstMaterial.key || "",
            itemName: firstMaterial.itemName || "",
            specification: firstMaterial.specification || "",
            quantity: "1",
            unit: "pcs",
            urgency: "Urgent",
            purchaseCategory: "Project",
          },
        ]);
      }
    }
  }, [so]);

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
      unit: "pcs",
      urgency: "Normal",
      purchaseCategory: "Project",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectMaterial = (index: number, materialKey: string) => {
    const selected = materialOptions.find(option => option.key === materialKey);
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index
      ? {
          ...item,
          materialKey,
          itemName: selected?.itemName || "",
          specification: selected?.specification || "",
        }
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

  const canSubmit = parsedItems.every(item => item.itemName && Number.isFinite(item.quantity) && item.quantity > 0);
  
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
      setErrorMsg("ID operator tidak ditemukan. Silakan login ulang dengan akun Engineering Worker yang ditugaskan.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.submitMaterialRequest(salesOrderId, {
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || so.assignedName || "Engineering Worker",
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
            onClick={() => navigate("/erp/production")} 
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
              <button onClick={() => navigate('/erp/production')} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Dasbor Produksi</button>
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
                          <MaterialAutocomplete
                            value={item.itemName}
                            onChange={val => updateItem(index, "itemName", val)}
                            onSelectProduct={p => {
                              updateItem(index, "itemName", p.name);
                              if (p.code !== "BOM") {
                                updateItem(index, "unit", p.unit);
                              }
                              if (p.spec) {
                                updateItem(index, "specification", p.spec);
                              }
                            }}
                            options={mergedOptions}
                          />
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
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ width: 80 }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(index, "quantity", e.target.value)}
                            placeholder="Qty"
                            required
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ width: 100 }}>
                          <select
                            value={item.unit}
                            onChange={e => updateItem(index, "unit", e.target.value)}
                            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg, boxSizing: "border-box", color: S.slate }}
                          >
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="meter">meter</option>
                            <option value="lembar">lembar</option>
                            <option value="batang">batang</option>
                            {!["pcs", "kg", "meter", "lembar", "batang"].includes(item.unit) && item.unit && (
                              <option value={item.unit}>{item.unit}</option>
                            )}
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
