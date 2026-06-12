import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { Page } from "./layout";
import { purchasingApi } from "../../services/purchasingApi";
import { usePurchasingData } from "./usePurchasingData";

interface CreatePurchaseOrderPageProps {
  onNavigate: (page: Page) => void;
}

interface FormItem {
  requestItemId?: string;
  code: string;
  name: string;
  spec: string;
  qty: string;
  unit: string;
  totalPrice: string;
}

interface FieldLabelProps {
  children: ReactNode;
}

const SUPPLIERS = [
  "CV Bintang Logam",
  "PT Sumber Teknik",
  "UD Maju Jaya",
  "PT Indo Steel",
  "CV Tekno Prima",
  "PT Karya Mandiri",
];

const UNITS = ["pcs", "batang", "lembar", "kg", "m", "box", "roll", "liter", "pasang", "kaleng"];
const TERMS = ["Cash", "Net 7", "Net 14", "Net 30", "Net 45"];
const PO_CATEGORIES = ["Asset", "Consumable", "Tools", "Project", "Maintenance"];

const emptyItem = (): FormItem => ({
  code: "",
  name: "",
  spec: "",
  qty: "",
  unit: "pcs",
  totalPrice: "",
});

const formatRp = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
      {children}
    </label>
  );
}

function inputClass(extra: string = "") {
  return `w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-blue-100 ${extra}`;
}

export function CreatePurchaseOrderPage({ onNavigate }: CreatePurchaseOrderPageProps) {
  const { purchaseRequests, refresh } = usePurchasingData();
  const [supplier, setSupplier] = useState("");
  const [requestRefs, setRequestRefs] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [poCategory, setPoCategory] = useState("Consumable");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("Net 14");
  const [shippingAddress, setShippingAddress] = useState("Gudang Utama - Jl. Industri No. 1, Bekasi");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eligibleRequests = useMemo(() => purchaseRequests.filter(request =>
    ["SupervisorApproved", "FinanceApproved", "Approved", "Processing"].includes(request.status) &&
    request.items.some(item => item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected")
  ), [purchaseRequests]);

  const availableMaterials = useMemo(() => {
    const selected = eligibleRequests.find(request => request.id === selectedRequestId);
    return selected?.items
      .filter(item => item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected")
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
    setItems(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const applySelectedRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    const request = eligibleRequests.find(item => item.id === requestId);
    if (!request) {
      setRequestRefs("");
      setSoNumber("");
      setItems([emptyItem()]);
      return;
    }

    const openItems = request.items.filter(item => item.purchaseStatus !== "Received" && item.purchaseStatus !== "Rejected");
    setRequestRefs(request.prNumber);
    setSoNumber(request.salesOrderNumber || "Non-project");
    setPoCategory(openItems[0]?.purchaseCategory || "Consumable");
    setItems(openItems.map(item => ({
      requestItemId: item.id,
      code: item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase(),
      name: item.itemName,
      spec: item.size || item.notes || "",
      qty: String(item.qty),
      unit: "pcs",
      totalPrice: item.totalPrice ? String(item.totalPrice) : "",
    })));
  };

  const submitPO = async () => {
    const request = eligibleRequests.find(item => item.id === selectedRequestId);
    const hasInvalidItem = items.some(item => !item.requestItemId || !item.name || !item.code || Number(item.qty) <= 0 || Number(item.totalPrice) <= 0);

    if (!request || !supplier || !dueDate || hasInvalidItem || isSubmitting) {
      window.alert("Pilih MR yang sudah disetujui Supervisor, lengkapi supplier, tanggal jatuh tempo, kode item, nama material, qty, dan total harga sebelum membuat PO.");
      return;
    }

    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    try {
      setIsSubmitting(true);
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
      onNavigate("orders");
    } catch (error) {
      console.warn("Failed to create backend PO.", error);
      window.alert("Gagal membuat PO di backend. Cek response API untuk detail.");
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
            <p className="mt-1 text-sm text-slate-500">Buat PO dari MR yang sudah disetujui, dengan referensi SO opsional.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("orders")}
            className="rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={submitPO}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={15} />
            {isSubmitting ? "Menyimpan..." : "Buat PO"}
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-900">Informasi PO</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <FieldLabel>Supplier *</FieldLabel>
            <select value={supplier} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSupplier(e.target.value)} className={inputClass()}>
              <option value="">Pilih supplier</option>
              {SUPPLIERS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>No Permintaan / MR *</FieldLabel>
            <select value={selectedRequestId} onChange={(e: ChangeEvent<HTMLSelectElement>) => applySelectedRequest(e.target.value)} className={inputClass()}>
              <option value="">Pilih MR disetujui Supervisor</option>
              {eligibleRequests.map(request => <option key={request.id} value={request.id}>{request.prNumber} - {request.projectName || request.salesOrderNumber || "Non-project"}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>No SO</FieldLabel>
            <input value={soNumber} readOnly placeholder="Auto dari MR" className={inputClass("cursor-not-allowed text-slate-500")} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Referensi MR</FieldLabel>
            <input value={requestRefs} readOnly placeholder="Auto dari backend" className={inputClass("cursor-not-allowed text-slate-500")} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Kategori PO</FieldLabel>
            <select value={poCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => setPoCategory(e.target.value)} className={inputClass()}>
              {PO_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Jatuh Tempo *</FieldLabel>
            <input type="date" value={dueDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)} className={inputClass()} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Terms</FieldLabel>
            <select value={terms} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTerms(e.target.value)} className={inputClass()}>
              {TERMS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <FieldLabel>Alamat Pengiriman</FieldLabel>
            <input value={shippingAddress} onChange={(e: ChangeEvent<HTMLInputElement>) => setShippingAddress(e.target.value)} className={inputClass()} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-900">Item Material</h2>
          <button
            disabled
            title="Item PO diambil dari MR backend"
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
                <input value={item.code} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "code", e.target.value)} placeholder="MAT-001" className={inputClass()} />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <FieldLabel>Nama Material *</FieldLabel>
                {availableMaterials.length > 0 ? (
                  <select value={item.name} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateItem(index, "name", e.target.value)} className={inputClass()}>
                    <option value="">Pilih Material</option>
                    {availableMaterials.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                  </select>
                ) : (
                  <input value={item.name} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "name", e.target.value)} placeholder="Nama material / consumable / tools" className={inputClass()} />
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>Spesifikasi</FieldLabel>
                <input value={item.spec} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "spec", e.target.value)} placeholder="4x4x2mm, 6m" className={inputClass()} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <FieldLabel>Qty *</FieldLabel>
                <input value={item.qty} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "qty", e.target.value)} type="number" placeholder="0" className={inputClass("text-right")} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <FieldLabel>Satuan</FieldLabel>
                <select value={item.unit} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateItem(index, "unit", e.target.value)} className={inputClass("px-1 text-xs")}>
                  {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>Total Harga *</FieldLabel>
                  {Number(item.qty) > 0 && Number(item.totalPrice) > 0 && (
                    <span className="text-[10px] text-slate-400">Harga satuan otomatis: {formatRp(Number(item.totalPrice) / Number(item.qty))}</span>
                  )}
                </div>
                <input value={item.totalPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(index, "totalPrice", e.target.value)} type="number" placeholder="0" className={inputClass("text-right")} />
              </div>
              <div className="flex items-end md:col-span-1">
                <button
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="flex h-9 w-full items-center justify-center rounded border border-red-100 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Hapus item"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 bg-[#0f1e35] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-slate-300">Total Nilai PO</span>
          <span className="text-xl font-bold text-white">{formatRp(total)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <FieldLabel>Catatan Pengiriman</FieldLabel>
          <textarea
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            rows={4}
            placeholder="Instruksi khusus, kontak pengiriman, dokumen yang harus disertakan, dll."
            className={inputClass("resize-none")}
          />
        </div>
      </section>
    </div>
  );
}
