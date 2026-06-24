import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Trash2, Plus, ChevronLeft } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingUrgency, SalesOrder } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";
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

export function ProductionMaterialRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { salesOrders, currentUser, refreshBackendData, purchasingRequests } = useApp();
  
  const so = salesOrders.find(s => s.id === id || s.backendId === id);
  const request = purchasingRequests.find(pr => pr.salesOrderId === id || pr.salesOrderId === so?.backendId);
  
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [items, setItems] = useState([
    {
      materialKey: "",
      itemName: "",
      specification: "",
      quantity: "1",
      unit: "PCS",
      urgency: "Urgent" as PurchasingUrgency,
      purchaseCategory: "Project",
    },
  ]);

  useEffect(() => {
    if (so) {
      const options = getMaterialOptions(so);
      setMaterialOptions(options);
      
      const firstMaterial = options[0];
      if (firstMaterial && items[0].materialKey === "") {
        setItems([
          {
            materialKey: firstMaterial.key || "",
            itemName: firstMaterial.itemName || "",
            specification: firstMaterial.specification || "",
            quantity: "1",
            unit: "PCS",
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
      unit: "PCS",
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
    unit: item.unit.trim() || "PCS",
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
      alert(`Material Request untuk ${so.id} berhasil diajukan!`);
      navigate("/erp/production");
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
      <div style={{ padding: "16px 24px", background: S.white, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/erp/production")} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: S.secondary, fontSize: "14px", fontWeight: 500 }}>
          <ChevronLeft size={18} /> Kembali ke Dasbor Produksi
        </button>
      </div>

      <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: 32 }}>
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
                      <select
                        value={item.materialKey}
                        onChange={e => selectMaterial(index, e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.bg }}
                      >
                        <option value="" disabled>Pilih material / item...</option>
                        {materialOptions.map(option => (
                          <option key={option.key} value={option.key}>
                            {option.itemName}{option.specification ? ` - ${option.specification}` : ""}
                          </option>
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
                      <input
                        value={item.unit}
                        onChange={e => updateItem(index, "unit", e.target.value)}
                        placeholder="Unit"
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
                      />
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
        </div>
      </div>
    </div>
  );
}
