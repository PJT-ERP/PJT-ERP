import { useMemo, useState, useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, Plus, Trash2, ChevronDown } from "lucide-react";

import { purchasingApi } from "../../services/purchasingApi";
import { usePurchasingData } from "./usePurchasingData";

interface CreatePurchaseOrderPageProps {
  onNavigate?: (page: string) => void;
}

interface FormItem {
  requestItemId?: string;
  code: string;
  name: string;
  spec: string;
  qty: string;
  unit: string;
  totalPrice: string;
  category: string;
}

interface FieldLabelProps {
  children: ReactNode;
}



const UNITS = ["pcs", "batang", "lembar", "kg", "m", "box", "roll", "liter", "pasang", "kaleng"];
const TERMS = ["Cash", "Net 7", "Net 14", "Net 30", "Net 45"];
const PO_CATEGORIES = ["Asset", "Consumable", "Tools", "Project", "Maintenance"];

const emptyItem = (): FormItem => ({
  code: "",
  name: "",
  spec: "",
  qty: "",
  unit: "",
  totalPrice: "",
  category: "",
});

const formatRp = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

function FieldLabel({ children }: FieldLabelProps) {
  let content = children;
  if (typeof children === 'string' && children.endsWith(" *")) {
    content = (
      <>
        {children.slice(0, -2)} <span className="text-[#C8102E]">*</span>
      </>
    );
  }

  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
      {content}
    </label>
  );
}

function inputClass(extra: string = "") {
  return `w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 min-h-[38px] ${extra}`;
}

function SupplierCombobox({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative flex items-center w-full">
        <input type="text" value={query} onChange={handleChange} onFocus={() => setOpen(true)} placeholder={placeholder} className={inputClass("pr-8")} />
        <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <div key={o} onMouseDown={e => { e.preventDefault(); handleSelect(o); }} className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700">
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreatePurchaseOrderPage({ onNavigate }: CreatePurchaseOrderPageProps) {
  const { purchaseRequests, suppliers, inventoryItems, refresh } = usePurchasingData();
  const supplierNames = useMemo(() => suppliers.map(s => s.name), [suppliers]);
  const [supplier, setSupplier] = useState("");
  const [requestRefs, setRequestRefs] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [poCategory, setPoCategory] = useState("Consumable");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [createdPoDetails, setCreatedPoDetails] = useState<{ poNumber: string; supplier: string; total: number; itemCount: number } | null>(null);

  const updateField = (setter: (value: string) => void) => (value: string) => {
    setMessage(null);
    setter(value);
  };

  const eligibleRequests = useMemo(() => purchaseRequests.filter(request =>
    ["FinanceApproved", "Approved", "Processing"].includes(request.status) &&
    request.items.some(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected")
  ), [purchaseRequests]);

  const availableMaterials = useMemo(() => {
    const selected = eligibleRequests.find(request => request.id === selectedRequestId);
    return selected?.items
      .filter(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected")
      .map(item => item.itemName) || [];
  }, [eligibleRequests, selectedRequestId]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0),
    [items]
  );

  const removeItem = (index: number) => {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    setMessage(null);
    setItems(prev => prev.map((item, itemIndex) => {
      if (itemIndex === index) {
        if (field === "name") {
          const invItem = inventoryItems?.find(inv => inv.name === value || (inv.code + " - " + inv.name) === value);
          if (invItem) {
            return { ...item, [field]: value, code: invItem.code, unit: invItem.unit || item.unit };
          }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);

  const updateItemsForSupplier = (request: any, selectedSupplier: string) => {
    const openItems = request.items.filter((item: any) => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected");
    const supplierItems = openItems.filter((item: any) => !selectedSupplier || item.supplierName === selectedSupplier);
    
    setItems(supplierItems.map((item: any) => {
      let extractedCode = "";
      let extractedName = item.itemName;
      
      const invItem = inventoryItems?.find(inv => inv.name === item.itemName || (inv.code + " - " + inv.name) === item.itemName);
      let unit = "pcs";
      if (invItem) {
        extractedCode = invItem.code;
        extractedName = invItem.name;
        unit = invItem.unit || "pcs";
      } else {
        const match = item.itemName.match(/^([A-Z0-9]+-[A-Z0-9]+(?:\-[A-Z0-9]+)*)\s*-\s*(.*)/i);
        if (match) {
          extractedCode = match[1].toUpperCase();
          extractedName = match[2];
        } else if (item.itemName.toLowerCase().includes("stainless steel")) {
          extractedCode = "MAT-0002";
        }
      }

      let spec = item.size || "";
      if (spec.trim().toUpperCase() === extractedCode.trim().toUpperCase() || spec === "-") {
        spec = "";
      }

      return {
        requestItemId: item.id,
        code: extractedCode,
        name: extractedName,
        spec: spec,
        qty: String(item.qty),
        unit: unit,
        totalPrice: item.totalPrice ? String(item.totalPrice) : (item.estimatedPrice ? String(item.estimatedPrice) : ""),
        category: invItem?.category || item.purchaseCategory || item.category || "Consumable",
      };
    }));
  };

  const applySelectedRequest = (requestId: string) => {
    setMessage(null);
    setSelectedRequestId(requestId);
    const request = eligibleRequests.find(item => item.id === requestId);
    if (!request) {
      setRequestRefs("");
      setSoNumber("");
      setItems([emptyItem()]);
      setAvailableSuppliers([]);
      return;
    }

    const openItems = request.items.filter(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected");
    setRequestRefs(request.prNumber.replace(/^MR-/, "PR-"));
    setSoNumber(request.salesOrderNumber || "Non-project");
    setPoCategory(openItems[0]?.purchaseCategory || "Consumable");
    
    const uniqueSuppliers = Array.from(new Set(openItems.map(item => item.supplierName).filter(Boolean))) as string[];
    setAvailableSuppliers(uniqueSuppliers);
    
    const firstSupplier = uniqueSuppliers[0] || "";
    setSupplier(firstSupplier);
    
    updateItemsForSupplier(request, firstSupplier);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqId = params.get("reqId");
    if (reqId && eligibleRequests.length > 0) {
      // Find matching request by PR number or backend ID
      const request = eligibleRequests.find(r => r.id === reqId || r.prNumber.replace(/^MR-/, "PR-") === reqId);
      if (request && selectedRequestId !== request.id) {
        applySelectedRequest(request.id);
      }
    }
  }, [eligibleRequests, selectedRequestId]);

  const submitPO = async () => {
    const request = eligibleRequests.find(item => item.id === selectedRequestId);
    const hasInvalidItem = items.some(item => !item.requestItemId || Number(item.totalPrice) <= 0);
    setMessage(null);

    if (!request || !supplier || !dueDate || !terms || !shippingAddress.trim() || hasInvalidItem || isSubmitting) {
      console.log("Validation Failed:", {
        requestFound: !!request,
        supplier,
        dueDate,
        terms,
        shippingAddress,
        hasInvalidItem,
        items,
        isSubmitting
      });
      setMessage({
        type: "error",
        text: `Validasi gagal! ${!request ? 'PR belum dipilih.' : ''} ${!supplier ? 'Supplier kosong.' : ''} ${!dueDate ? 'Tgl kosong.' : ''} ${!terms ? 'Termin belum dipilih.' : ''} ${!shippingAddress.trim() ? 'Alamat pengiriman kosong.' : ''} ${hasInvalidItem ? 'Ada item yang tidak valid (pastikan kode, nama, qty > 0, total > 0, dan id request item ada).' : ''}`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const poNumber = await purchasingApi.previewNextPoNumber();
      await Promise.all(items.map(item => purchasingApi.processPurchaseRequestItem(request.id, item.requestItemId!, {
        supplierName: supplier,
        expectedArrivalDate: dueDate,
        poNumber,
        estimatedPrice: Number(item.totalPrice),
        totalPrice: Number(item.totalPrice),
        purchaseCategory: poCategory,
        purchaseNotes: [terms, shippingAddress, notes].filter(Boolean).join(" | ") || null,
      })));
      await refresh();
      setCreatedPoDetails({
        poNumber,
        supplier,
        total,
        itemCount: items.length,
      });
    } catch (error: any) {
      console.warn("Failed to create backend PO.", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.message || error?.response?.data?.title || error?.message || "Gagal membuat PO di backend. Cek status PR, item, supplier, dan koneksi API.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Buat Purchase Order</h1>
            <p className="mt-1 text-sm text-slate-500">Buat PO dari PR yang sudah disetujui, dengan referensi SO opsional.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.("requests")}
            className="rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={submitPO}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded bg-[#C8102E] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={15} />
            {isSubmitting ? "Menyimpan..." : "Buat PO"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className="rounded border px-4 py-3 text-sm"
          style={{
            background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
            borderColor: message.type === "success" ? "#bbf7d0" : "#fecaca",
            color: message.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-900">Informasi PO</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <FieldLabel>Supplier *</FieldLabel>
            {availableSuppliers.length > 1 ? (
              <>
                <select
                  value={supplier}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const selected = e.target.value;
                    setSupplier(selected);
                    const req = eligibleRequests.find(r => r.id === selectedRequestId);
                    if (req) updateItemsForSupplier(req, selected);
                  }}
                  className={inputClass()}
                >
                  {availableSuppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-600 mt-1">
                  PR ini memiliki {availableSuppliers.length} supplier berbeda. Pilih supplier untuk memfilter item PO.
                </p>
              </>
            ) : (
              <input value={supplier} readOnly placeholder="Supplier akan otomatis terisi dari PR" className={inputClass("cursor-not-allowed text-slate-500 bg-slate-50")} />
            )}
          </div>
          <div className="space-y-1.5">
            <FieldLabel>No Permintaan / PR *</FieldLabel>
            {(() => {
              const isLocked = !!new URLSearchParams(window.location.search).get("reqId");
              if (isLocked) {
                const req = eligibleRequests.find(r => r.id === selectedRequestId);
                const display = req ? `${req.prNumber.replace(/^MR-/, "PR-")} - ${req.projectName || req.salesOrderNumber || "Non-project"}` : selectedRequestId;
                return <input value={display} readOnly className={inputClass("cursor-not-allowed text-slate-500")} />;
              }
              return (
                <select 
                  value={selectedRequestId} 
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => applySelectedRequest(e.target.value)} 
                  className={inputClass()}
                >
                  <option value="">Pilih PR disetujui Supervisor</option>
                  {eligibleRequests.map(request => <option key={request.id} value={request.id}>{request.prNumber.replace(/^MR-/, "PR-")} - {request.projectName || request.salesOrderNumber || "Non-project"}</option>)}
                </select>
              );
            })()}
          </div>
          <div className="space-y-1.5">
            <FieldLabel>No SO</FieldLabel>
            <input value={soNumber} readOnly placeholder="Auto dari PR" className={inputClass("cursor-not-allowed text-slate-500")} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Referensi PR</FieldLabel>
            <input value={requestRefs} readOnly placeholder="Auto dari backend" className={inputClass("cursor-not-allowed text-slate-500")} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Kategori PO</FieldLabel>
            <select value={poCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateField(setPoCategory)(e.target.value)} className={inputClass()}>
              {PO_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Est. Kedatangan Barang *</FieldLabel>
            <input type="date" value={dueDate} onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(setDueDate)(e.target.value)} className={inputClass()} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Terms *</FieldLabel>
            <select value={terms} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateField(setTerms)(e.target.value)} className={inputClass()}>
              <option value="" disabled>Pilih Termin</option>
              {TERMS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <FieldLabel>Alamat Pengiriman *</FieldLabel>
            <input value={shippingAddress} onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(setShippingAddress)(e.target.value)} className={inputClass()} placeholder="Masukkan alamat pengiriman..." />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-900">Item Material</h2>
          <button
            disabled
            title="Item PO diambil dari PR backend"
            className="flex cursor-not-allowed items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
          >
            <Plus size={13} />
            Tambah Item
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Kode Item *</FieldLabel>
                <input readOnly value={item.code} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "code", e.target.value)} className={inputClass("cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Nama Material *</FieldLabel>
                <input value={item.name} readOnly onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "name", e.target.value)} className={inputClass("cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Kategori</FieldLabel>
                <input value={item.category} readOnly className={inputClass("cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Spesifikasi</FieldLabel>
                <input value={item.spec} readOnly onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "spec", e.target.value)} className={inputClass("cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <FieldLabel>Qty *</FieldLabel>
                <input value={item.qty} readOnly title="Qty telah disetujui dan tidak dapat diubah" onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "qty", e.target.value)} type="number" className={inputClass("text-right cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <FieldLabel>Satuan</FieldLabel>
                <input value={item.unit} readOnly onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "unit", e.target.value)} className={inputClass("px-1 sm:px-3 cursor-not-allowed opacity-80")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Total Harga *</FieldLabel>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-sm">Rp</span>
                  <input
                    type="text"
                    readOnly
                    value={item.totalPrice ? Number(item.totalPrice).toLocaleString("id-ID") : ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const rawVal = e.target.value.replace(/\D/g, "");
                      updateItem(index, "totalPrice", rawVal);
                    }}
                    title="Total harga telah disetujui Finance dan tidak dapat diubah"
                    className={inputClass("text-right pl-8 cursor-not-allowed opacity-80")}
                  />
                </div>
                {Number(item.qty) > 0 && Number(item.totalPrice) > 0 && (
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Harga satuan: {formatRp(Number(item.totalPrice) / Number(item.qty))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 bg-[#C8102E] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-red-100">Total Nilai PO</span>
          <span className="text-xl font-bold text-white">{formatRp(total)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <FieldLabel>Catatan Pengiriman</FieldLabel>
          <textarea
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField(setNotes)(e.target.value)}
            rows={4}
            placeholder="Instruksi khusus, kontak pengiriman, dokumen yang harus disertakan, dll."
            className={inputClass("resize-none")}
          />
        </div>
      </section>

      {createdPoDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#C8102E] p-6 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold">Purchase Order Berhasil Dibuat!</h3>
              <p className="text-red-100 text-sm mt-1">PO telah tercatat dan tersimpan di sistem backend.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Nomor PO</span>
                  <span className="font-bold text-slate-900 font-mono text-base">{createdPoDetails.poNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Supplier</span>
                  <span className="font-medium text-slate-800">{createdPoDetails.supplier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Jumlah Item</span>
                  <span className="font-medium text-slate-800">{createdPoDetails.itemCount} Item</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Total Estimasi</span>
                  <span className="font-bold text-[#C8102E] text-base">{formatRp(createdPoDetails.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedPoDetails(null);
                    onNavigate?.("orders");
                  }}
                  className="w-full py-3 px-4 bg-[#C8102E] hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lihat Daftar Purchase Order
                </button>
                {(() => {
                  const remainingReq = eligibleRequests.find(r => r.id === selectedRequestId);
                  const remainingUnorderedItems = remainingReq ? remainingReq.items.filter(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected") : [];
                  if (remainingUnorderedItems.length > 0) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setCreatedPoDetails(null);
                          applySelectedRequest(selectedRequestId);
                        }}
                        className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 font-medium rounded-lg border border-amber-200 transition cursor-pointer"
                      >
                        Lanjut Buat PO untuk Sisa Item ({remainingUnorderedItems.length})
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedPoDetails(null);
                        setItems([emptyItem()]);
                        setSupplier("");
                        setSoNumber("");
                        setRequestRefs("");
                        setSelectedRequestId("");
                        setDueDate("");
                      }}
                      className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      Buat PO Lainnya
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
