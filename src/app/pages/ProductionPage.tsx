import React, { useState } from "react";
import { PlayCircle, PauseCircle, CheckSquare, Clock, Users, Package, FileWarning, ExternalLink, Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../components/context/AppContext";
import { PurchasingRequest, PurchasingUrgency, SalesOrder, getStatusColor } from "../components/data/mockData";
import { productionApi } from "../services/productionApi";
import { purchasingApi } from "../services/purchasingApi";
import { salesApi } from "../services/salesApi";
import { isGuid, toBackendUserId } from "../services/backendIds";
import { useFinanceData } from "../components/finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../components/so/invoice-sync";
import { masterDataApi, InventoryItemDto } from "../services/masterDataApi";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

type SystemMessage = {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  steps?: string[];
};

function SystemMessageDialog({ message, onClose }: { message: SystemMessage; onClose: () => void }) {
  const tone = {
    success: { bg: "#DCFCE7", border: "#BBF7D0", color: "#15803D", icon: <CheckSquare size={24} /> },
    info: { bg: "#E0F2FE", border: "#BAE6FD", color: "#0369A1", icon: <Package size={24} /> },
    warning: { bg: "#FEF3C7", border: "#FCD34D", color: "#B45309", icon: <FileWarning size={24} /> },
    error: { bg: "#FEE2E2", border: "#FCA5A5", color: "#B91C1C", icon: <FileWarning size={24} /> },
  }[message.tone];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div style={{ width: "100%", maxWidth: 480, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 20px 45px rgba(15,23,42,0.18)", overflow: "hidden", fontFamily: S.font }}>
        <div style={{ padding: "18px 22px", display: "flex", gap: 14, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {tone.icon}
          </div>
          <div>
            <h3 style={{ margin: 0, color: S.slate, fontSize: 18, fontWeight: 700 }}>{message.title}</h3>
            <p style={{ margin: "5px 0 0", color: S.secondary, fontSize: 13.5, lineHeight: 1.5 }}>{message.message}</p>
          </div>
        </div>
        {message.steps && message.steps.length > 0 && (
          <div style={{ padding: "16px 22px", background: S.bg }}>
            <p style={{ margin: "0 0 10px", color: S.slate, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Alur Berikutnya</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {message.steps.map((step, index) => (
                <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: S.white, border: `1px solid ${S.border}`, color: S.slate, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ color: S.slate, fontSize: 13, lineHeight: 1.45 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding: "14px 22px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  const labels: Record<string, string> = {
    waiting_dp: 'Menunggu DP',
    pending_assignment: 'Menunggu Penugasan',
    material_preparation: 'Persiapan Material',
    in_production: 'Sedang Diproduksi',
    qc_check: 'Proses QC',
    'Ready for Production': 'Siap Produksi',
    'In Production': 'Sedang Diproduksi',
    QC: 'Proses QC',
  };

  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {labels[status] || status}
    </span>
  );
}

function getDrawingUrl(so: SalesOrder) {
  return so.customerDrawingUrl || so.designLink || "";
}

function getBackendSalesOrderId(so: SalesOrder) {
  return so.backendId || so.id;
}

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

function DrawingLinks({ so }: { so: SalesOrder }) {
  const drawingUrl = getDrawingUrl(so);
  if (!drawingUrl) {
    return null;
  }

  return (
    <a
      href={drawingUrl}
      target="_blank"
      rel="noreferrer"
      onClick={event => event.stopPropagation()}
      style={{ color: S.cyan, fontSize: "12px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
    >
      <ExternalLink size={12} /> Gambar SO
    </a>
  );
}

function AssignOperatorModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { users, currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operators = users.filter(u => u.role === 'Engineering' || u.role === 'Engineering Supervisor');

  const handleAssign = async (operatorId: string) => {
    if (isSubmitting) return;
    const operator = users.find(u => u.id === operatorId);
    const operatorBackendId = toBackendUserId(operator);
    const reviewer = users.find(user => user.role === "Engineering Supervisor") || currentUser || operator;
    const reviewerBackendId = toBackendUserId(reviewer);
    const salesOrderId = getBackendSalesOrderId(so);

    if (!operator || !operatorBackendId || !reviewer || !reviewerBackendId || !isGuid(salesOrderId)) {
      alert("Tidak bisa assign operator karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await salesApi.assignSalesOrderEngineers(salesOrderId, {
        productionWorker: { userId: operatorBackendId, name: operator.name },
        qcReviewer: { userId: reviewerBackendId, name: reviewer.name },
      });

      try {
        await salesApi.confirmSalesOrder(salesOrderId, toBackendUserId(currentUser) || reviewerBackendId);
      } catch (confirmError) {
        console.warn("Operator assigned, but SO confirmation is not ready yet.", confirmError);
      }

      await refreshBackendData();
      onClose();
    } catch (error) {
      console.warn("Failed to assign operator in backend.", error);
      alert("Gagal assign operator ke backend. Cek koneksi API atau data SO.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 380, padding: 24, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h2 style={{ color: S.slate, margin: "0 0 4px", fontSize: "18px" }}>Tugaskan Operator</h2>
        <p style={{ color: S.secondary, margin: "0 0 16px", fontSize: "12.5px" }}>{so.id} - {so.description || so.productName}</p>
        
        {isSubmitting ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: S.secondary, fontSize: "14px", fontWeight: 500 }}>Menyimpan Penugasan...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {operators.map(operator => (
                <button
                  key={operator.id}
                  onClick={() => handleAssign(operator.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${S.border}`,
                    background: S.white,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}
                >
                  <p style={{ margin: 0, color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>{operator.name}</p>
                  <p style={{ margin: "2px 0 0", color: S.secondary, fontSize: "12px" }}>{operator.email}</p>
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}>Batal</button>
          </>
        )}
      </div>
    </div>
  );
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
  disabled: boolean;
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
    <div ref={wrapperRef} style={{ position: "relative", flex: 2, display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => setIsFocused(false)}
        placeholder="Ketik atau pilih dari Master Data..."
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 10px", 
          border: `1px solid ${isFocused ? S.cyan : S.border}`, 
          borderRadius: 6, fontSize: "13px", outline: "none", 
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(200, 16, 46, 0.1)` : "none"
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
                e.preventDefault();
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

function MaterialRequestModal({
  so,
  onClose,
  onSubmitted,
  onMessage,
}: {
  so: SalesOrder;
  onClose: () => void;
  onSubmitted: () => void;
  onMessage: (message: SystemMessage) => void;
}) {
  const { currentUser, refreshBackendData } = useApp();
  const materialOptions = getMaterialOptions(so);
  const firstMaterial = materialOptions[0];
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    masterDataApi.listInventory().then(setInventoryItems).catch(console.error);
  }, []);
  const [items, setItems] = useState([
    {
      materialKey: firstMaterial?.key || "",
      itemName: firstMaterial?.itemName || "",
      specification: firstMaterial?.specification || "",
      quantity: "1",
      unit: "PCS",
      urgency: "Urgent" as PurchasingUrgency,
      purchaseCategory: "Project",
    },
  ]);

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
    if (!canSubmit) return;

    if (isSubmitting) return;

    // Priority order for requestedByUserId:
    // 1. currentUser.id if it's a real GUID (user logged in via backend JWT)
    // 2. productionWorkerUserId from the SO (the assigned backend worker's GUID)
    // 3. local assignedTo if it's a GUID
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const requesterId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId)) {
      onMessage({
        tone: "error",
        title: "MR Tidak Bisa Diajukan",
        message: "Data backend Sales Order belum lengkap. Refresh data atau pastikan SO sudah tersinkron ke backend.",
      });
      return;
    }

    if (!requesterId) {
      onMessage({
        tone: "error",
        title: "Operator Tidak Ditemukan",
        message: "ID operator tidak ditemukan. Silakan login ulang dengan akun Engineering yang ditugaskan.",
      });
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
      onSubmitted();
      await refreshBackendData();
      window.setTimeout(() => {
        void refreshBackendData();
      }, 1500);
      onMessage({
        tone: "success",
        title: "MR Diajukan ke Supervisor",
        message: `Material Request untuk ${so.id} sudah dibuat dan menunggu approval Engineering Supervisor.`,
      });
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to submit production material request to backend.", error);
      // Try to extract backend error message
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      onMessage({
        tone: "error",
        title: "Gagal Mengajukan MR",
        message: backendMsg || "MR gagal dikirim ke backend. Cek koneksi API atau data operator.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Permintaan Material</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Isi daftar item untuk MR. Pengajuan ini memerlukan approval Supervisor sebelum diteruskan ke Purchasing.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item, index) => (
              <div key={index} style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 600 }}>Item #{index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} style={{ border: "none", background: "transparent", color: S.secondary, cursor: "pointer", display: "flex" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <MaterialAutocomplete
                  value={item.itemName}
                  onChange={(val) => updateItem(index, "itemName", val)}
                  onSelectProduct={(p) => {
                    updateItem(index, "materialKey", p.id);
                    updateItem(index, "itemName", p.name);
                    updateItem(index, "unit", p.unit);
                    if (p.category) updateItem(index, "purchaseCategory", p.category);
                  }}
                  options={inventoryItems}
                  disabled={false}
                />
                <textarea
                  value={item.specification}
                  onChange={e => updateItem(index, "specification", e.target.value)}
                  placeholder="Spesifikasi / ukuran"
                  rows={2}
                  style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "none" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, "quantity", e.target.value)}
                    placeholder="Qty"
                    required
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <input
                    value={item.unit}
                    onChange={e => updateItem(index, "unit", e.target.value)}
                    placeholder="Unit"
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <select
                    value={item.urgency}
                    onChange={e => updateItem(index, "urgency", e.target.value)}
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", background: S.white }}
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ padding: "10px", border: `1px dashed ${S.border}`, background: S.white, color: S.secondary, borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Tambah Item
            </button>
          </div>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Catatan MR"
            rows={2}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!canSubmit || isSubmitting} style={{ flex: 1, padding: "10px", background: "#EAB308", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Mengajukan..." : "Ajukan MR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.startProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to start production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal mulai produksi: ${backendMsg}` : "Gagal mulai produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  let isLate = false;
  let daysLate = 0;
  if (so.deadline) {
    const todayStr = new Date().toISOString().split("T")[0];
    const deadlineStr = so.deadline.split("T")[0];
    const tDate = new Date(todayStr);
    const dDate = new Date(deadlineStr);
    if (tDate > dDate) {
      isLate = true;
      daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{so.status === 'Paused' ? 'Lanjutkan Produksi' : 'Mulai Produksi'}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {isLate && (
            <div style={{ padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
              <div>
                <strong>Peringatan Keterlambatan</strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px" }}>Produksi ini telah melewati deadline selama <strong>{daysLate} hari</strong>.</p>
              </div>
            </div>
          )}
          <div>
            <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, lineHeight: "1.5" }}>
              {so.status === 'Paused' && so.pauseReason === 'Mesin Rusak' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Mesin Rusak</strong>. Apakah mesin sudah diperbaiki dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason === 'Kapasitas Penuh' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Kapasitas Penuh</strong>. Apakah kapasitas mesin sudah tersedia dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason === 'Material Kurang' ? (
                <>Produksi sebelumnya dihentikan karena <strong>Material Kurang</strong>. Apakah material sudah tersedia lengkap dan Anda yakin ingin melanjutkan produksi?</>
              ) : so.status === 'Paused' && so.pauseReason ? (
                <>Produksi sebelumnya dihentikan karena <strong>{so.pauseReason}</strong>. Apakah kendala sudah teratasi dan Anda yakin ingin melanjutkan produksi?</>
              ) : (
                <>Apakah Anda yakin ingin mulai mengerjakan produksi untuk pesanan ini? <br />
                <strong>Waktu mulai akan tercatat otomatis sesuai waktu saat ini.</strong></>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.65 : 1 }}>
              <PlayCircle size={16} /> {isSubmitting ? "Menyimpan..." : (so.status === 'Paused' ? "Lanjutkan Produksi" : "Konfirmasi Mulai")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function PauseProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !pauseReason.trim()) return;

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.pauseProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
        reason: pauseReason.trim(),
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to pause production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal pause produksi: ${backendMsg}` : "Gagal pause produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Jeda Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#991B1B", fontSize: "13.5px" }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginTop: -2 }} /> Peringatan: Menjeda produksi berarti menghentikan catatan waktu kerja. Pastikan hal ini dilakukan karena ada kendala di lapangan.
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "12.5px", color: S.slate }}>Alasan Jeda/Kendala:</p>
            <textarea
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Contoh: Mesin CNC rusak, bahan baku aluminium habis..."
              rows={3}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: S.font }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "-6px" }}>
            <button type="button" onClick={() => setPauseReason("Material Kurang")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Material Kurang</button>
            <button type="button" onClick={() => setPauseReason("Mesin Rusak")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Mesin Rusak</button>
            <button type="button" onClick={() => setPauseReason("Kapasitas Penuh")} style={{ padding: "4px 10px", fontSize: "11.5px", background: "#F1F5F9", border: `1px solid ${S.border}`, borderRadius: 12, cursor: "pointer", color: S.slate }}>Kapasitas Penuh</button>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting || !pauseReason.trim()} style={{ flex: 1, padding: "10px", background: "#EA580C", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: (isSubmitting || !pauseReason.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (isSubmitting || !pauseReason.trim()) ? 0.65 : 1 }}>
               {isSubmitting ? "Menyimpan..." : "Jeda Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lateReason, setLateReason] = useState("");

  let canFinish = true;
  let hMinus3Str = "";
  if (so.deadline) {
    const deadlineDate = new Date(so.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      const hMinus3 = new Date(deadlineDate);
      hMinus3.setDate(deadlineDate.getDate() - 3);
      hMinus3.setHours(0, 0, 0, 0);
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      canFinish = todayDate >= hMinus3;
      hMinus3Str = hMinus3.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  let isLate = false;
  let daysLate = 0;
  if (so.deadline) {
    const todayStr = new Date().toISOString().split("T")[0];
    const deadlineStr = so.deadline.split("T")[0];
    const tDate = new Date(todayStr);
    const dDate = new Date(deadlineStr);
    if (tDate > dDate) {
      isLate = true;
      daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !canFinish || (isLate && !lateReason.trim())) return;
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Tidak bisa menyelesaikan produksi karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionApi.finishProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
      });
      await refreshBackendData();
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to finish production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal selesai produksi: ${backendMsg}` : "Gagal menyelesaikan produksi di backend. Cek koneksi API atau data operator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Selesai Produksi</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {isLate && (
            <>
              <div style={{ padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}><AlertTriangle size={16} /></div>
                <div>
                  <strong>Peringatan Keterlambatan</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "13px" }}>Produksi ini telah melewati deadline selama <strong>{daysLate} hari</strong>.</p>
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "12.5px", color: S.slate }}>Alasan Keterlambatan:</p>
                <textarea
                  value={lateReason}
                  onChange={e => setLateReason(e.target.value)}
                  placeholder="Contoh: Material kurang, mesin rusak..."
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: S.font }}
                />
              </div>
            </>
          )}
          {!canFinish ? (
            <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#991B1B", fontSize: "13.5px" }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginTop: -2 }} /> Tombol baru dapat diklik mulai <strong>{hMinus3Str}</strong> (Minimal H-3 Deadline).
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, lineHeight: "1.5" }}>
                Apakah Anda yakin ingin menyelesaikan produksi untuk pesanan ini? <br />
                <strong>Waktu selesai akan tercatat otomatis sesuai waktu saat ini.</strong>
              </p>
            </div>
          )}
          
          {!canFinish ? (
            <div style={{ display: "flex", paddingTop: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Mengerti</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
              <button type="submit" disabled={isSubmitting || (isLate && !lateReason.trim())} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: isSubmitting || (isLate && !lateReason.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting || (isLate && !lateReason.trim()) ? 0.65 : 1 }}>
                <CheckSquare size={16} /> {isSubmitting ? "Menyimpan..." : "Selesai Produksi"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function PaginationControl({ currentPage, totalItems, itemsPerPage, onPageChange }: { currentPage: number, totalItems: number, itemsPerPage: number, onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems <= itemsPerPage) return null;
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
      <span style={{ fontSize: "13.5px", color: "#64748B" }}>
        {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} hasil
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
          disabled={currentPage === 1}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 28, height: 28, padding: "0 8px",
              borderRadius: 8, border: "none",
              background: p === currentPage ? S.cyan : "transparent",
              color: p === currentPage ? "#FFFFFF" : "#475569",
              fontSize: "13.5px", fontWeight: p === currentPage ? 600 : 500,
              cursor: "pointer", transition: "all 0.1s"
            }}
          >
            {p}
          </button>
        ))}
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
          disabled={currentPage >= totalPages}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= totalPages ? "#CBD5E1" : S.secondary, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function MaterialReviewModal({
  so,
  request,
  onClose,
  onApprove,
  onReject,
}: {
  so: SalesOrder;
  request?: PurchasingRequest;
  onClose: () => void;
  onApprove: () => Promise<boolean>;
  onReject: (reason: string) => Promise<boolean>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const items = request?.items && request.items.length > 0
    ? request.items
    : [{
        itemName: request?.itemName || so.description,
        specification: request?.specification || so.spec || "-",
        quantity: request?.quantity || 1,
        unit: request?.unit || "PCS",
      }];

  const handleApprove = async () => {
    if (isApproving) return;
    setIsApproving(true);
    const ok = await onApprove();
    setIsApproving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden", fontFamily: S.font, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: 18 }}>Review Material Request</h2>
            <p style={{ color: S.secondary, margin: "4px 0 0", fontSize: 12.5 }}>{so.id} - {so.description}</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: 22, lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: S.secondary, fontSize: 12, fontWeight: 600 }}>No. MR</p>
              <p style={{ margin: "3px 0 0", color: S.slate, fontSize: 13.5, fontFamily: "monospace" }}>{request?.id || "-"}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: S.secondary, fontSize: 12, fontWeight: 600 }}>Diajukan Oleh</p>
              <p style={{ margin: "3px 0 0", color: S.slate, fontSize: 13.5 }}>{request?.requestedBy || so.assignedName || "Engineering"}</p>
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 8px", color: S.secondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Daftar Material</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, index) => (
                <div key={`${item.itemName}-${index}`} style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, background: S.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <p style={{ margin: 0, color: S.slate, fontSize: 13.5, fontWeight: 700 }}>{item.itemName}</p>
                    <span style={{ color: S.slate, fontSize: 12, fontWeight: 700, background: S.white, border: `1px solid ${S.border}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <p style={{ margin: "5px 0 0", color: S.secondary, fontSize: 12.5 }}>{item.specification || "-"}</p>
                </div>
              ))}
            </div>
          </div>

          {request?.notes && (
            <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 12 }}>
              <p style={{ margin: "0 0 4px", color: S.secondary, fontSize: 12, fontWeight: 700 }}>Catatan Engineer</p>
              <p style={{ margin: 0, color: S.slate, fontSize: 13 }}>{request.notes}</p>
            </div>
          )}

          {rejectMode && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: "12px", color: "#991B1B", margin: "0 0 8px", fontWeight: 700 }}>Catatan Penolakan Supervisor</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Contoh: qty terlalu banyak, spesifikasi belum lengkap..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5", borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  disabled={isApproving}
                  style={{ flex: 1, padding: "9px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (isApproving) return;
                    setIsApproving(true);
                    const ok = await onReject(rejectReason);
                    setIsApproving(false);
                    if (ok) onClose();
                  }}
                  disabled={isApproving || !rejectReason.trim()}
                  style={{ flex: 1, padding: "9px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isApproving || !rejectReason.trim() ? "not-allowed" : "pointer", opacity: isApproving || !rejectReason.trim() ? 0.55 : 1 }}
                >
                  {isApproving ? "Menolak..." : "Konfirmasi Tolak"}
                </button>
              </div>
            </div>
          )}
        </div>

        {!rejectMode && (
          <div style={{ padding: "14px 22px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setRejectMode(true)} disabled={isApproving} style={{ flex: 1, padding: "10px", background: S.white, border: "1px solid #FECACA", color: "#EF4444", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}>
              Tolak
            </button>
            <button type="button" onClick={handleApprove} disabled={isApproving} style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: isApproving ? "not-allowed" : "pointer", opacity: isApproving ? 0.65 : 1 }}>
              {isApproving ? "Menyetujui..." : "Approve ke Purchasing"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductionDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { purchasingRequests } = useApp();
  const materials = getMaterialOptions(so);
  const request = purchasingRequests.find(pr => pr.salesOrderId === so.id || pr.salesOrderId === so.backendId);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, fontFamily: S.font, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Detail Pesanan & BOM</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: -4 }}>
            <StatusBadge status={so.status} />
            {(so as any).productionStatus && (so as any).productionStatus !== so.status && <StatusBadge status={(so as any).productionStatus} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Pelanggan</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.customerName || so.customerId}</p>
            </div>
            <div>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Deadline</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.deadline}</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Deskripsi Produk</p>
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>{so.description}</p>
            </div>
          </div>
          { (request?.status === 'Ditolak' || request?.backendStatus === 'Rejected') && request?.rejectionReason && (
            <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#B91C1C" }}>MR Ditolak (Catatan SPV):</p>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#DC2626" }}>{request.rejectionReason}</p>
            </div>
          )}
          { so.status === 'Paused' && so.pauseReason && (
            <div style={{ padding: "12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#9A3412" }}>Alasan Produksi Dihentikan Sementara:</p>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#C2410C" }}>{so.pauseReason}</p>
            </div>
          )}
          <div>
            <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 4px", fontWeight: 600 }}>Link Desain / Gambar</p>
            {getDrawingUrl(so) ? (
              <a href={getDrawingUrl(so)} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "14px", fontWeight: 500, textDecoration: "underline" }}>Lihat Gambar Desain</a>
            ) : (
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>
                {so.backendDesignStatus === 'Approved' && !so.designApprovedAt ? "Ini produk terdaftar, jadi tidak butuh desain" : "Tidak ada link desain"}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: "13px", color: S.secondary, margin: "0 0 8px", fontWeight: 600 }}>Bill of Materials (BOM) / Kebutuhan</p>
            {materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map((m, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                    <span style={{ fontWeight: 600, color: S.slate }}>{m.itemName}</span>
                    {m.specification && <span style={{ color: S.secondary }}> - {m.specification}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: S.slate, margin: 0 }}>Belum ada data BOM.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductionPage() {
  const { salesOrders, currentUser, users, purchasingRequests, customers, refreshBackendData } = useApp();
  const canReadFinanceData = currentUser?.role === "Finance"
    || currentUser?.role === "Admin"
    || currentUser?.role === "Owner"
    || currentUser?.role === "Sales";
  const { invoices } = useFinanceData(canReadFinanceData);
  const mergedSalesOrders = salesOrders.map(so => mergeSalesOrderInvoice(so, invoices));

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const currentBackendUserId = toBackendUserId(currentUser);

  const navigate = useNavigate();
  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [pauseModal, setPauseModal] = useState<SalesOrder | null>(null);
  const [reviewMrModal, setReviewMrModal] = useState<SalesOrder | null>(null);
  const [detailModal, setDetailModal] = useState<SalesOrder | null>(null);
  const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(null);

  const handleResume = async (so: SalesOrder) => {
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      await productionApi.resumeProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
      });
      await refreshBackendData();
    } catch (error: unknown) {
      console.warn("Failed to resume production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal resume produksi: ${backendMsg}` : "Gagal resume produksi di backend.");
    }
  };

  const [localMaterialRequestSoIds, setLocalMaterialRequestSoIds] = useState<Set<string>>(() => new Set());

  // Pagination states
  const itemsPerPage = 5;
  const [pagePending, setPagePending] = useState(1);
  const [pageMaterialPrep, setPageMaterialPrep] = useState(1);
  const [pageInProd, setPageInProd] = useState(1);
  const [pageWaitQC, setPageWaitQC] = useState(1);

  // Lists
  const isAssignedToCurrentUser = (so: SalesOrder) => !so.assignedTo || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId || isSupervisor;
  
  const isReadyForProd = (so: SalesOrder) => {
    if (so.status === 'Ready for Production') return true;
    // Exclude if it's already started production or reached QC
    if (so.startTime || so.qcDecision) return false;
    if (so.backendDesignStatus === 'Approved' && ['Waiting Pricing', 'Waiting Payment', 'Pending Design', 'Waiting Approval'].includes(so.status)) return true;
    return false;
  };

  const pendingAssignment = mergedSalesOrders.filter(so => isReadyForProd(so) && !so.assignedTo);
  const materialPrep = mergedSalesOrders.filter(so => isReadyForProd(so) && !!so.assignedTo && isAssignedToCurrentUser(so));
  const inProduction = mergedSalesOrders.filter(so => (so.status === 'In Production' || so.status === 'Paused') && isAssignedToCurrentUser(so));
  const waitingQC = mergedSalesOrders.filter(so => so.status === 'QC');

  const getMaterialRequest = (so: SalesOrder) => {
    const backendId = getBackendSalesOrderId(so);
    return purchasingRequests.find(request =>
      request.salesOrderId === backendId ||
      request.salesOrderId === so.backendId ||
      request.soId === so.id ||
      request.soId === so.soNumber,
    );
  };

  const rememberMaterialRequest = (so: SalesOrder) => {
    const keys = [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)].filter(Boolean) as string[];
    setLocalMaterialRequestSoIds(prev => {
      const next = new Set(prev);
      keys.forEach(key => next.add(key));
      return next;
    });
  };

  const hasLocalMaterialRequest = (so: SalesOrder) =>
    [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)]
      .filter(Boolean)
      .some(key => localMaterialRequestSoIds.has(key as string));

  const getMaterialRequestState = (so: SalesOrder): 'none' | 'requested' | 'finance_pending' | 'approved' | 'completed' | 'rejected' => {
    const request = getMaterialRequest(so);
    if (!request) return hasLocalMaterialRequest(so) ? 'requested' : 'none';
    if (request.backendStatus === 'SupervisorRejected' || request.backendStatus === 'FinanceRejected' || request.backendStatus === 'Rejected') return 'rejected';
    if (request.backendStatus === 'Completed' || request.backendStatus === 'FinanceApproved' || request.status === 'Selesai') return 'completed';
    if (request.backendStatus === 'SupervisorApproved' || request.backendStatus === 'Processing') return 'approved';
    if (request.status === 'Ditolak') return 'rejected';
    if (request.status === 'Diproses') return 'approved';
    return 'requested';
  };

  const approveMaterialRequest = async (so: SalesOrder) => {
    const request = getMaterialRequest(so);
    const reviewerId = toBackendUserId(currentUser);

    if (!request?.backendId || !reviewerId) {
      setSystemMessage({
        tone: "error",
        title: "MR Belum Lengkap",
        message: "MR belum punya data backend lengkap untuk approval. Refresh data atau minta engineer submit ulang MR.",
      });
      return false;
    }

    if (request.backendStatus && request.backendStatus !== 'Submitted') {
      await refreshBackendData();
      if (request.backendStatus === 'SupervisorApproved') {
        setSystemMessage({
          tone: "info",
          title: "MR Sudah Disetujui",
          message: "MR ini sudah disetujui Supervisor dan sudah berada di antrian Purchasing.",
        });
        return false;
      }
      if (request.backendStatus === 'FinanceApproved' || request.backendStatus === 'Processing' || request.backendStatus === 'Completed') {
        setSystemMessage({
          tone: "info",
          title: "MR Sudah Diproses",
          message: "MR ini sudah melewati approval Supervisor dan sedang/selesai diproses Purchasing atau Finance.",
        });
        return false;
      }
      setSystemMessage({
        tone: "warning",
        title: "MR Tidak Bisa Di-approve",
        message: "MR tidak bisa di-approve pada status saat ini. Cek ulang status pengajuan di daftar MR.",
      });
      return false;
    }

    try {
      await purchasingApi.supervisorReviewPurchaseRequest(request.backendId, {
        reviewedByUserId: reviewerId,
        decision: 'Accept',
      });
      await refreshBackendData();
      setSystemMessage({
        tone: "success",
        title: "MR Disetujui Supervisor",
        message: "Permintaan material sudah diteruskan ke Purchasing untuk pengecekan supplier, harga, dan pembuatan PO.",
        steps: [
          "Purchasing membuka daftar MR dan mengisi supplier serta total harga.",
          "Purchasing membuat Purchase Order dari MR tersebut.",
          "Finance melakukan approval/pembayaran MR.",
          "Setelah Finance approve, status material menjadi lengkap.",
          "Engineer Worker bisa mulai produksi dari kartu SO terkait.",
        ],
      });
      return true;
    } catch (error) {
      console.warn("Failed to approve MR in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      setSystemMessage({
        tone: "error",
        title: "Gagal Approve MR",
        message: axiosError?.response?.data?.message || "Review MR gagal dikirim ke backend. Cek koneksi API atau status MR.",
      });
      return false;
    }
  };

  const rejectMaterialRequest = async (so: SalesOrder, reason: string) => {
    const request = getMaterialRequest(so);
    const reviewerId = toBackendUserId(currentUser);

    if (!request?.backendId || !reviewerId) {
      setSystemMessage({
        tone: "error",
        title: "MR Belum Lengkap",
        message: "MR belum punya data backend lengkap untuk penolakan.",
      });
      return false;
    }

    try {
      await purchasingApi.supervisorReviewPurchaseRequest(request.backendId, {
        reviewedByUserId: reviewerId,
        decision: 'Reject',
        rejectionReason: reason,
      });
      await refreshBackendData();
      setSystemMessage({
        tone: "success",
        title: "MR Ditolak",
        message: "Permintaan material telah ditolak dan dikembalikan ke Engineer Worker untuk direvisi.",
      });
      return true;
    } catch (error) {
      console.warn("Failed to reject MR in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      setSystemMessage({
        tone: "error",
        title: "Gagal Menolak MR",
        message: axiosError?.response?.data?.message || "Penolakan MR gagal dikirim ke backend.",
      });
      return false;
    }
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0, fontSize: "20px", fontWeight: 600 }}>Dasbor Produksi</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 4 }}>
            Kelola penugasan mesin, persiapan material, dan proses produksi berjalan
          </p>
        </div>
      </div>

      {/* 1. Menunggu Penugasan (Supervisor Only) */}
      {isSupervisor && pendingAssignment.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Menunggu Penugasan Operator ({pendingAssignment.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).map((so, idx) => (
              <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                    <StatusBadge status={so.status} />
                  </div>
                  <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                  <DrawingLinks so={so} />
                </div>
                {currentUser?.role !== 'Admin' && (
                  <button onClick={() => setAssignModal(so)}
                    style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                    Tugaskan Operator
                  </button>
                )}
              </div>
            ))}
          </div>
          <PaginationControl currentPage={pagePending} totalItems={pendingAssignment.length} itemsPerPage={itemsPerPage} onPageChange={setPagePending} />
        </div>
      )}

      {/* 2. Persiapan Material */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Persiapan Material ({materialPrep.length})</span>
          </div>
        </div>
        {materialPrep.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada persiapan material</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              const mrState = getMaterialRequestState(so);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                      {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>Operator: <strong>{operator}</strong></span>
                      <DrawingLinks so={so} />
                    </div>

                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                      <button onClick={() => setReviewMrModal(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Review MR
                      </button>
                    )}
                    {(mrState === 'none' || ((so.isRework || so.qcStatus === 'NoGo') && mrState === 'completed')) && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {mrState === 'rejected' && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Ajukan Ulang MR
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (mrState === 'none' || mrState === 'completed') && (
                      <button onClick={() => setStartModal(so)}
                        style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <PlayCircle size={14} /> Mulai Produksi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageMaterialPrep} totalItems={materialPrep.length} itemsPerPage={itemsPerPage} onPageChange={setPageMaterialPrep} />
      </div>

      {/* 3. In Production */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Sedang Diproduksi ({inProduction.length})</span>
          </div>
        </div>
        {inProduction.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang sedang beroperasi</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              let isLate = false;
              let daysLate = 0;
              let canFinish = true;
              if (so.deadline) {
                const todayStr = new Date().toISOString().split("T")[0];
                const deadlineStr = so.deadline.split("T")[0];
                const tDate = new Date(todayStr);
                const dDate = new Date(deadlineStr);
                if (tDate > dDate) {
                  isLate = true;
                  daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
                }

                const hMinus3 = new Date(dDate);
                hMinus3.setDate(dDate.getDate() - 3);
                hMinus3.setHours(0, 0, 0, 0);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                canFinish = todayDate >= hMinus3;
              }
              const mrState = getMaterialRequestState(so);

              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {isLate && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Telat {daysLate} Hari</span>}
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                      {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>Operator: <strong>{operator}</strong></span>
                      {so.startTime && <span>· Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      <DrawingLinks so={so} />
                    </div>
                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                      <button onClick={() => setReviewMrModal(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Review MR
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <>
                        {so.status === 'Paused' ? (
                          <>
                            <button onClick={() => setStartModal(so)}
                              style={{ padding: "8px 16px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                              <PlayCircle size={14} /> Lanjutkan Produksi
                            </button>
                            {so.pauseReason?.toLowerCase().includes("material") && (mrState === 'none' || mrState === 'completed') && (
                              <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                                style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                <Package size={14} /> Req. Material Kurang
                              </button>
                            )}
                            {so.pauseReason?.toLowerCase().includes("material") && mrState === 'rejected' && (
                              <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                                style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                <FileWarning size={14} /> Ajukan Ulang MR
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => setPauseModal(so)}
                            style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <PauseCircle size={14} /> Jeda Produksi
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (so.status === 'Paused') return;
                            setCompleteModal(so);
                          }} 
                          style={{ padding: "8px 16px", background: !canFinish ? "#D1D5DB" : "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: so.status === 'Paused' ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: so.status === 'Paused' ? 0.5 : 1 }}>
                          <CheckSquare size={14} /> Selesai Produksi
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageInProd} totalItems={inProduction.length} itemsPerPage={itemsPerPage} onPageChange={setPageInProd} />
      </div>

      {/* 4. Menunggu QC */}
      <div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
            </div>
          </div>
          {waitingQC.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).map((so, idx) => {
                const customer = customers.find(c => c.code === so.customerId);
                return (
                  <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", borderBottom: idx < waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none", background: "#F8FAFC" }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                      </div>
                      <p style={{ fontSize: "12.5px", color: S.secondary, margin: 0 }}>{customer?.name} · {so.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationControl currentPage={pageWaitQC} totalItems={waitingQC.length} itemsPerPage={itemsPerPage} onPageChange={setPageWaitQC} />
        </div>
      </div>

      {assignModal && <AssignOperatorModal so={assignModal} onClose={() => setAssignModal(null)} />}

      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
      {pauseModal && <PauseProductionModal so={pauseModal} onClose={() => setPauseModal(null)} />}
      {reviewMrModal && (
        <MaterialReviewModal
          so={reviewMrModal}
          request={getMaterialRequest(reviewMrModal)}
          onClose={() => setReviewMrModal(null)}
          onApprove={() => approveMaterialRequest(reviewMrModal)}
          onReject={(reason) => rejectMaterialRequest(reviewMrModal, reason)}
        />
      )}
      {systemMessage && <SystemMessageDialog message={systemMessage} onClose={() => setSystemMessage(null)} />}
      {detailModal && <ProductionDetailModal so={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  );
}
