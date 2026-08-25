import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { masterDataApi } from "../../../../services/masterDataApi";
import { InventoryItem } from "./InventoryHelpers";

interface StockMutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: InventoryItem | null;
}

export function StockMutationModal({ isOpen, onClose, onSuccess, item }: StockMutationModalProps) {
  const [qty, setQty] = useState<number | "">("");
  const [type, setType] = useState<"in" | "out">("out");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQty("");
      setType("out"); // Default to 'out' (pengurangan)
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return alert("Pilih jenis mutasi");
    if (!qty || isNaN(qty as number) || (qty as number) <= 0) return alert("Kuantitas tidak valid");

    try {
      setSubmitting(true);
      const numQty = Number(qty);
      const newStock = type === "in" ? item.currentStock + numQty : item.currentStock - numQty;
      
      await masterDataApi.mutateStock(item.id, {
        type: type as "in" | "out",
        quantity: numQty,
        reason: reason
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.warn("Failed to mutate stock", error);
      alert("Gagal mencatat mutasi stok.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E]";
  const labelClass = "block text-[11px] font-semibold text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">Form Mutasi Material</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Material</label>
              <input readOnly value={`${item.code} - ${item.name}`} className={`${inputClass} bg-slate-100 cursor-not-allowed`} />
            </div>
            
            <div>
              <label className={labelClass}>Kuantitas <span className="text-[#C8102E]">*</span></label>
              <div className="flex gap-2">
                <input required type="number" min="1" value={qty} onChange={e => setQty(e.target.value === "" ? "" : Number(e.target.value))} className={inputClass} placeholder="0" />
                <div className="flex items-center justify-center px-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium whitespace-nowrap">
                  {item.unit}
                </div>
              </div>
            </div>
            
            <div>
              <label className={labelClass}>Jenis Mutasi <span className="text-[#C8102E]">*</span></label>
              <select required value={type} onChange={e => setType(e.target.value as "in" | "out")} className={inputClass}>
                <option value="out">Keluar (Pengurangan)</option>
                <option value="in">Masuk (Penambahan)</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <label className={labelClass}>Alasan Mutasi <span className="text-[#C8102E]">*</span></label>
              <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)} className={`${inputClass} resize-none`} placeholder="Contoh: Barang rusak, retur, dll" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded bg-[#C8102E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Catat Mutasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
