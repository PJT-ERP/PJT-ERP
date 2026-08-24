import React, { useState, useEffect } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";

interface EngineeringMutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EngineeringMutationModal({ isOpen, onClose, onSuccess }: EngineeringMutationModalProps) {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [qty, setQty] = useState<number | "">("");
  const [type, setType] = useState<"in" | "out">("out");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQty("");
      setType("out");
      setReason("");
      setSelectedItemId("");
      
      const fetchItems = async () => {
        setLoadingItems(true);
        try {
          const res = await masterDataApi.listInventory();
          setItems(res);
        } catch (e) {
          console.error("Failed to fetch inventory", e);
        } finally {
          setLoadingItems(false);
        }
      };
      fetchItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter(it => 
    it.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedItem = items.find(it => it.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return alert("Pilih material");
    if (!type) return alert("Pilih jenis mutasi");
    if (!qty || isNaN(qty as number) || (qty as number) <= 0) return alert("Kuantitas tidak valid");

    try {
      setSubmitting(true);
      const numQty = Number(qty);
      
      await masterDataApi.mutateStock(selectedItemId, {
        type: type,
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
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 relative">
              <label className={labelClass}>Material <span className="text-[#C8102E]">*</span></label>
              <div 
                className={`${inputClass} flex justify-between items-center cursor-pointer ${loadingItems ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={selectedItem ? "text-slate-900" : "text-slate-500"}>
                  {selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : loadingItems ? "Memuat data..." : "-- Pilih Material --"}
                </span>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
              
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100 relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Cari kode atau nama material..." 
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded outline-none focus:border-[#C8102E]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                      {filteredItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center">Material tidak ditemukan</div>
                      ) : (
                        filteredItems.map(it => (
                          <div 
                            key={it.id} 
                            className={`px-3 py-2 text-sm rounded cursor-pointer ${selectedItemId === it.id ? 'bg-[#C8102E]/10 text-[#C8102E] font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                            onClick={() => {
                              setSelectedItemId(it.id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            {it.code} - {it.name} <span className="text-slate-400 text-xs ml-1">(Stok: {it.currentStock} {it.unit})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div>
              <label className={labelClass}>Kuantitas <span className="text-[#C8102E]">*</span></label>
              <div className="flex gap-2">
                <input required type="number" min="1" value={qty} onChange={e => setQty(e.target.value === "" ? "" : Number(e.target.value))} className={inputClass} placeholder="0" />
                <div className="flex items-center justify-center px-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium whitespace-nowrap">
                  {selectedItem ? selectedItem.unit : "pcs"}
                </div>
              </div>
            </div>
            
            <div>
              <label className={labelClass}>Jenis Mutasi <span className="text-[#C8102E]">*</span></label>
              <input readOnly value="Keluar (Pengurangan)" className={`${inputClass} bg-slate-100 cursor-not-allowed text-slate-500`} />
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
