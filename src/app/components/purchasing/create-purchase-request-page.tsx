import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Plus, X, AlertCircle } from "lucide-react";
import { purchasingApi } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import { toBackendUserId } from "../../services/backendIds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { MRItem } from "./material-requests-page"; // Will export this next
import { usePurchasingData } from "./usePurchasingData";

function InventoryCombobox({ value, onChange, options, placeholder }: { value: string; onChange: (v: string, item?: any) => void; options: any[]; placeholder?: string; }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()) || o.code.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (o: any) => {
    setQuery(o.name);
    onChange(o.name, o);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value, undefined);
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative flex items-center w-full">
        <input type="text" value={query} onChange={handleChange} onFocus={() => setOpen(true)} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <div key={o.id} onMouseDown={e => { e.preventDefault(); handleSelect(o); }} className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700 flex flex-col">
              <span className="font-medium">{o.name}</span>
              <span className="text-xs text-slate-400">{o.code} | Stok: {o.currentStock} {o.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ManualRequestItem = Partial<MRItem> & {
  category?: "Asset" | "Consumable" | "Tools" | "Project" | "Maintenance";
};

const PURCHASE_CATEGORIES: NonNullable<ManualRequestItem["category"]>[] = ["Project", "Consumable", "Tools", "Asset", "Maintenance"];

export function CreatePurchaseRequestPage() {
  const { salesOrders, currentUser, refreshBackendData } = useApp();
  const { inventoryItems } = usePurchasingData();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogMsg, setDialogMsg] = useState<{ title: string; message: string } | null>(null);
  const [formSoNumber, setFormSoNumber] = useState("");
  const [formItems, setFormItems] = useState<ManualRequestItem[]>([{ code: "", name: "", spec: "", qty: 1, unit: "PCS", category: "Consumable" }]);
  const [formPriority, setFormPriority] = useState("Medium");
  const [formUrgency, setFormUrgency] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const addFormItem = () => setFormItems([...formItems, { code: "", name: "", spec: "", qty: 1, unit: "PCS", category: formSoNumber && formSoNumber !== "none" ? "Project" : "Consumable" }]);
  const removeFormItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateFormItem = (i: number, key: keyof ManualRequestItem, val: any) => {
    const next = [...formItems];
    next[i] = { ...next[i], [key]: val };
    setFormItems(next);
  };

  const submitManualRequest = async () => {
    if (isSubmitting) return;
    const validItems = formItems.filter(item => (item.code || item.name) && Number(item.qty) > 0);
    if (validItems.length === 0) {
      setDialogMsg({ title: "Peringatan", message: "Isi minimal satu item material dengan spesifikasi yang benar." });
      return;
    }
    if (validItems.some(item => !item.code || !item.code.trim())) {
      setDialogMsg({ title: "Peringatan", message: "Kode Material (SKU) wajib diisi untuk standar ERP agar spesifikasi akurat!" });
      return;
    }

    const requesterId = toBackendUserId(currentUser);
    if (!requesterId) {
      setDialogMsg({ title: "Gagal Mengajukan", message: "User lokal belum punya mapping backend untuk membuat PR." });
      return;
    }

    const selectedSo = formSoNumber && formSoNumber !== "none"
      ? salesOrders.find((so) => (so.soNumber || so.id) === formSoNumber)
      : undefined;
    const urgency = formPriority === "High" ? "Urgent" : "Normal";

    try {
      setIsSubmitting(true);
      await purchasingApi.createPurchaseRequest({
        requestDate: new Date().toISOString().split("T")[0],
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || "Purchasing",
        salesOrderId: selectedSo?.backendId || null,
        salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || null,
        projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : "Manual Purchase Request",
        items: validItems.map(item => ({
          salesOrderId: selectedSo?.backendId || null,
          salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || null,
          projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : "Manual Purchase Request",
          itemName: item.code ? `[${item.code}] ${item.name || "Material"}` : (item.name || "Material"),
          size: item.spec || null,
          qty: Number(item.qty) || 1,
          notes: [formUrgency, formNotes].filter(Boolean).join(" - ") || null,
          urgency,
          purchaseCategory: item.category || (selectedSo ? "Project" : "Consumable"),
        })),
      });
      await refreshBackendData();
      navigate("/erp/purchasing/requests");
    } catch (error) {
      console.error("Failed to create manual purchase request.", error);
      setDialogMsg({ title: "Gagal Membuat PR", message: "Gagal membuat PR di backend. Cek response API untuk detail." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={() => navigate("/erp/purchasing/requests")}
          className="rounded p-2 hover:bg-slate-100 transition"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Buat Purchase Request (PR) Manual</h1>
          <p className="text-sm text-slate-500 mt-1 m-0">
            Gunakan form ini untuk kebutuhan darurat yang belum diajukan via sistem Engineering.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terkait Sales Order?</label>
            <Select value={formSoNumber} onValueChange={setFormSoNumber}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih SO (Opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Bukan Project / Umum --</SelectItem>
                {salesOrders.map((so) => (
                  <SelectItem key={so.id} value={so.soNumber || so.id}>
                    {so.soNumber || so.id} - {so.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prioritas Pembelian</label>
            <Select value={formPriority} onValueChange={setFormPriority}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High (Mendesak)</SelectItem>
                <SelectItem value="Medium">Medium (Normal)</SelectItem>
                <SelectItem value="Low">Low (Bisa ditunda)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Barang (Item)</label>
            <button
              type="button"
              onClick={addFormItem}
              className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus size={14} /> Tambah Item
            </button>
          </div>

          <div className="space-y-3">
            {formItems.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-semibold text-slate-800">Item #{i + 1}</p>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">Isi material, qty, satuan, dan kategori PO.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFormItem(i)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={formItems.length === 1}
                    title="Hapus item"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Kode Material (SKU) <span className="text-[#C8102E]">*</span></label>
                    <input type="text" className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-mono uppercase outline-none focus:border-blue-500" value={item.code} onChange={(e) => updateFormItem(i, "code", e.target.value.toUpperCase())} placeholder="RAW-STL-001" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Pilih dari Master / Nama <span className="text-[#C8102E]">*</span></label>
                    <InventoryCombobox
                      value={item.name || ""}
                      onChange={(val, selectedItem) => {
                        const next = [...formItems];
                        next[i] = { ...next[i], name: val };
                        if (selectedItem) {
                          next[i].code = selectedItem.code;
                          next[i].unit = selectedItem.unit;
                          next[i].category = selectedItem.category;
                        }
                        setFormItems(next);
                      }}
                      options={inventoryItems}
                      placeholder="Pilih Master Data / Ketik deskripsi"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Kategori</label>
                    <Select value={item.category || "Consumable"} onValueChange={(value) => updateFormItem(i, "category", value as ManualRequestItem["category"])}>
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-6">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Spesifikasi</label>
                    <input type="text" className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" value={item.spec} onChange={(e) => updateFormItem(i, "spec", e.target.value)} placeholder="Grade, ukuran, warna, standar, dll." />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Jumlah <span className="text-[#C8102E]">*</span></label>
                    <input type="number" className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" value={item.qty} onChange={(e) => updateFormItem(i, "qty", e.target.value)} min={1} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Satuan</label>
                    <input type="text" className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" value={item.unit} onChange={(e) => updateFormItem(i, "unit", e.target.value.toUpperCase())} placeholder="PCS" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alasan Mendesak / Notes (Opsional)</label>
          <textarea
            className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 min-h-[80px]"
            placeholder="Tambahkan informasi tambahan..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate("/erp/purchasing/requests")}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submitManualRequest}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {isSubmitting ? "Mengirim..." : "Ajukan PR Manual"}
          </button>
        </div>
      </div>

      {dialogMsg && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{dialogMsg.title}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{dialogMsg.message}</p>
            <button
              type="button"
              onClick={() => setDialogMsg(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
