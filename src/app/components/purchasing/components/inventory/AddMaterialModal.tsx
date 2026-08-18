import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { masterDataApi, SupplierDto } from "../../../../services/masterDataApi";
import { InventoryItem } from "./InventoryHelpers";

export function AddMaterialModal({ isOpen, onClose, onAdded, inventoryItems, editItem, suppliers }: { isOpen: boolean; onClose: () => void; onAdded: () => void; inventoryItems: InventoryItem[], editItem?: InventoryItem | null, suppliers: SupplierDto[] }) {
  const [formData, setFormData] = useState({
    code: "", name: "", category: "Project", unit: "pcs",
    currentStock: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
    location: "", supplierName: "", unitPrice: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setFormData({
          code: editItem.code, name: editItem.name, category: editItem.category, unit: editItem.unit,
          currentStock: editItem.currentStock, minStock: editItem.minStock, maxStock: editItem.maxStock, reorderPoint: editItem.reorderPoint,
          location: editItem.location, supplierName: editItem.supplier, unitPrice: editItem.unitPrice
        });
        return;
      }

      const prefix = "MAT-";

      let maxNum = 0;
      inventoryItems.forEach(i => {
        if (i.code.startsWith(prefix)) {
          const num = parseInt(i.code.replace(prefix, ""), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextCode = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
      setFormData(prev => ({ ...prev, code: nextCode }));
    } else {
      // Reset form when closed
      setFormData({
        code: "", name: "", category: "Project", unit: "pcs",
        currentStock: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
        location: "", supplierName: "", unitPrice: 0
      });
    }
  }, [isOpen, inventoryItems, editItem]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editItem) {
        await masterDataApi.updateInventoryItem(editItem.id, formData);
      } else {
        await masterDataApi.createInventoryItem(formData);
      }
      onAdded();
      onClose();
    } catch (error) {
      console.warn("Failed to save material", error);
      alert("Gagal menyimpan material.");
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
          <h2 className="text-lg font-bold text-slate-800">{editItem ? "Edit Material" : "Tambah Material Baru"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kode Material <span className="text-[#C8102E]">*</span></label>
              <input required readOnly value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className={`${inputClass} bg-slate-100 cursor-not-allowed`} placeholder="Contoh: MAT-001" />
            </div>
            <div>
              <label className={labelClass}>Nama Material <span className="text-[#C8102E]">*</span></label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Aluminium Plate..." />
            </div>
            <div>
              <label className={labelClass}>Kategori <span className="text-[#C8102E]">*</span></label>
              <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputClass}>
                <option>Project</option>
                <option>Consumable</option>
                <option>Tools</option>
                <option>Asset</option>
                <option>Maintenance</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Satuan <span className="text-[#C8102E]">*</span></label>
              <input required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className={inputClass} placeholder="pcs, kg, m, dll" />
            </div>
            <div>
              <label className={labelClass}>Stok Awal <span className="text-[#C8102E]">*</span></label>
              <input type="number" required value={formData.currentStock === 0 ? "" : formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: e.target.value === "" ? 0 : Number(e.target.value) })} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Reorder Point <span className="text-[#C8102E]">*</span></label>
              <input type="number" required value={formData.reorderPoint === 0 ? "" : formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: e.target.value === "" ? 0 : Number(e.target.value) })} className={inputClass} placeholder="0" />
            </div>

            <div>
              <label className={labelClass}>Max Stock <span className="text-[#C8102E]">*</span></label>
              <input type="number" required value={formData.maxStock === 0 ? "" : formData.maxStock} onChange={e => setFormData({ ...formData, maxStock: e.target.value === "" ? 0 : Number(e.target.value) })} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Harga Satuan (Rp) <span className="text-[#C8102E]">*</span></label>
              <input 
                type="text" 
                required 
                value={formData.unitPrice === 0 ? "" : formData.unitPrice.toLocaleString("id-ID")} 
                onChange={e => {
                  const rawValue = e.target.value.replace(/[^0-9]/g, "");
                  setFormData({ ...formData, unitPrice: rawValue === "" ? 0 : Number(rawValue) });
                }} 
                className={inputClass} 
                placeholder="0" 
              />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Nama Supplier Default <span className="text-[#C8102E]">*</span></label>
              <select required value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} className={inputClass}>
                <option value="" disabled>Pilih Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Batal</button>
            <button type="submit" disabled={submitting} className="rounded bg-[#C8102E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
