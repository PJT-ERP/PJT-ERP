import { DollarSign, X, UploadCloud } from 'lucide-react';
import { PO, calcTotal } from '../../../purchasing/purchase-orders-page';
import { formatIDR } from '../../mockData';

type POCategory = 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | '';

interface ApPaymentModalProps {
  selectedPo: PO;
  setSelectedPo: (po: PO | null) => void;
  suppliers: any[];
  category: POCategory;
  setCategory: (val: POCategory) => void;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
  notes: string;
  setNotes: (val: string) => void;
  handlePay: () => Promise<void>;
}

export function ApPaymentModal({
  selectedPo,
  setSelectedPo,
  suppliers,
  category,
  setCategory,
  proofFile,
  setProofFile,
  notes,
  setNotes,
  handlePay
}: ApPaymentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPo(null)} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <DollarSign size={18} className="text-[#C8102E]" />
              Proses Pembayaran Tagihan
            </h3>
            <p className="text-xs text-slate-500 mt-1">{selectedPo.id} - {selectedPo.supplier}</p>
          </div>
          <button onClick={() => setSelectedPo(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Info Box */}
          <div className="bg-red-50/50 border border-red-100 rounded-md p-4 space-y-3">
            <div className="flex justify-between items-start text-sm">
              <span className="text-slate-500">No. Rekening Tujuan</span>
              <div className="text-right">
                {(() => {
                  const supp = suppliers.find(s => s.name === selectedPo.supplier);
                  if (supp && supp.bankAccount) {
                    return (
                      <>
                        <div className="font-semibold text-slate-800">{supp.bankName} - {supp.bankAccount}</div>
                        <div className="text-xs text-slate-500 mt-0.5">a.n. {selectedPo.supplier} {supp.bankBranch ? `(${supp.bankBranch})` : ''}</div>
                      </>
                    );
                  }
                  return <span className="font-semibold text-slate-800">(Terdaftar di Vendor Master)</span>;
                })()}
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Termin Pembayaran</span>
              <span className="font-semibold text-slate-800">{selectedPo.paymentTerms}</span>
            </div>
            <div className="flex justify-between items-center bg-white p-3 rounded-md border border-red-100 shadow-sm mt-2">
                <span className="text-sm font-bold text-slate-700">Total Tagihan</span>
              <span className="text-lg font-black text-[#C8102E] flex items-center gap-1">
                {formatIDR(calcTotal(selectedPo.items))}
              </span>
            </div>
          </div>

          {/* Finance Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Metode Pembayaran <span className="text-red-500">*</span></label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value as POCategory)}
                className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] bg-white shadow-sm"
              >
                <option value="" disabled>-- Pilih Akun Bank --</option>
                <option value="BCA">BCA 8820748299 a/n PT. PRATAMA JAYA TEKINDO</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Upload Bukti Transfer <span className="text-red-500">*</span></label>
              <div className="border-2 border-dashed border-slate-300 rounded-md p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <UploadCloud size={24} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Tarik & lepas file atau klik untuk browse</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" id="proof-upload" onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setProofFile(e.target.files[0]);
                  }
                }} />
                <button onClick={() => document.getElementById('proof-upload')?.click()} className="mt-3 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors">
                  Pilih File
                </button>
                {proofFile && <p className="mt-2 text-xs text-green-600 font-medium">✓ File terpilih: {proofFile.name}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan Pembayaran (Opsional)</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Tambahkan catatan (mis: dibayar separuh, dll)"
                className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] bg-white shadow-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={() => setSelectedPo(null)} className="px-4 py-2 rounded-md text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">
            Batal
          </button>
          <button 
            onClick={handlePay}
            disabled={!category || !proofFile}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-[#C8102E] hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <DollarSign size={16} /> Simpan & Tandai Lunas
          </button>
        </div>
      </div>
    </div>
  );
}
