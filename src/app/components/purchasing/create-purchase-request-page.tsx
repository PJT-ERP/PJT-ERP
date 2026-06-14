import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { purchasingApi } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import { toBackendUserId } from "../../services/backendIds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { MRItem } from "./material-requests-page"; // Will export this next

export function CreatePurchaseRequestPage() {
  const { salesOrders, currentUser, refreshBackendData } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSoNumber, setFormSoNumber] = useState("");
  const [formItems, setFormItems] = useState<Partial<MRItem>[]>([{ code: "", name: "", spec: "", qty: 1, unit: "pcs" }]);
  const [formPriority, setFormPriority] = useState("Medium");
  const [formUrgency, setFormUrgency] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const availableMaterials = useMemo(() => {
    if (!formSoNumber) return [];
    const so = salesOrders.find((s) => (s.soNumber || s.id) === formSoNumber);
    if (so) return [so.material || so.description];
    return [];
  }, [formSoNumber, salesOrders]);

  const addFormItem = () => setFormItems([...formItems, { code: "", name: "", spec: "", qty: 1, unit: "pcs" }]);
  const removeFormItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateFormItem = (i: number, key: keyof MRItem, val: any) => {
    const next = [...formItems];
    next[i] = { ...next[i], [key]: val };
    setFormItems(next);
  };

  const submitManualRequest = async () => {
    if (isSubmitting) return;
    const validItems = formItems.filter(item => item.name && Number(item.qty) > 0);
    if (validItems.length === 0) {
      alert("Isi minimal satu item material.");
      return;
    }

    const requesterId = toBackendUserId(currentUser);
    if (!requesterId) {
      alert("User lokal belum punya mapping backend untuk membuat PR.");
      return;
    }

    const selectedSo = salesOrders.find((so) => (so.soNumber || so.id) === formSoNumber);
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
          itemName: item.name || item.code || "Material",
          size: item.spec || null,
          qty: Number(item.qty) || 1,
          notes: [formUrgency, formNotes].filter(Boolean).join(" - ") || null,
          urgency,
          purchaseCategory: selectedSo ? "Project" : "Consumable",
        })),
      });
      await refreshBackendData();
      navigate("/erp/purchasing/requests");
    } catch (error) {
      console.error("Failed to create manual purchase request.", error);
      alert("Gagal membuat PR di backend. Cek response API untuk detail.");
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
              onClick={addFormItem}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus size={14} /> Tambah Baris
            </button>
          </div>
          <div className="rounded border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[15%]">Kode</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[35%]">Nama Material</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[20%]">Spesifikasi</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[15%]">Jumlah</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[10%]">Satuan</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="p-2"><input type="text" className="w-full border rounded px-2 py-1 outline-none focus:border-blue-500" value={item.code} onChange={(e) => updateFormItem(i, "code", e.target.value)} placeholder="Opsional" /></td>
                    <td className="p-2"><input type="text" className="w-full border rounded px-2 py-1 outline-none focus:border-blue-500" value={item.name} onChange={(e) => updateFormItem(i, "name", e.target.value)} placeholder="Contoh: Baut 10mm" /></td>
                    <td className="p-2"><input type="text" className="w-full border rounded px-2 py-1 outline-none focus:border-blue-500" value={item.spec} onChange={(e) => updateFormItem(i, "spec", e.target.value)} placeholder="Warna/Ukuran" /></td>
                    <td className="p-2"><input type="number" className="w-full border rounded px-2 py-1 outline-none focus:border-blue-500" value={item.qty} onChange={(e) => updateFormItem(i, "qty", e.target.value)} min={1} /></td>
                    <td className="p-2"><input type="text" className="w-full border rounded px-2 py-1 outline-none focus:border-blue-500" value={item.unit} onChange={(e) => updateFormItem(i, "unit", e.target.value)} /></td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeFormItem(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" disabled={formItems.length === 1}><X size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            onClick={() => navigate("/erp/purchasing/requests")}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded"
          >
            Batal
          </button>
          <button
            onClick={submitManualRequest}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {isSubmitting ? "Mengirim..." : "Ajukan PR Manual"}
          </button>
        </div>
      </div>
    </div>
  );
}
