import { FileText, X, CheckCircle2 } from 'lucide-react';
import { MR } from '../../../purchasing/material-requests-page';
import { formatIDR } from '../../mockData';

interface PrReviewModalProps {
  selectedMr: MR;
  setSelectedMr: (mr: MR | null) => void;
  isApproving: boolean;
  setShowRejectModal: (show: boolean) => void;
  handleReviewPr: (decision: 'Accept' | 'Reject', reason?: string) => Promise<void>;
}

export function PrReviewModal({
  selectedMr,
  setSelectedMr,
  isApproving,
  setShowRejectModal,
  handleReviewPr
}: PrReviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedMr(null)} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-[#C8102E]" />
              Review Anggaran Purchase Request
            </h3>
            <p className="text-xs text-slate-500 mt-1">{selectedMr.id} - {selectedMr.department}</p>
          </div>
          <button onClick={() => setSelectedMr(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="bg-red-50/50 border border-red-100 rounded-md p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Requestor</span>
              <span className="font-semibold text-slate-800">{selectedMr.requestor}</span>
            </div>
            <div className="flex justify-between items-center bg-white p-3 rounded-md border border-red-100 shadow-sm mt-2">
              <span className="text-sm font-bold text-slate-700">Estimasi Total Anggaran</span>
              <span className="text-lg font-black text-[#C8102E] flex items-center gap-1">
                {formatIDR(selectedMr.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0))}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-slate-600">Material</th>
                  <th className="px-4 py-2 font-semibold text-slate-600">Qty</th>
                  <th className="px-4 py-2 font-semibold text-slate-600">Supplier Tujuan</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 text-right">Est. Harga Satuan</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedMr.items.map(item => (
                  <tr key={item.itemId}>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.qty} {item.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{item.supplierName || '-'}</td>
                    <td className="px-4 py-3 text-right">{formatIDR((item.estimatedPrice || 0) / (item.qty || 1))}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatIDR(item.estimatedPrice || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button disabled={isApproving} onClick={() => setShowRejectModal(true)} className="px-4 py-2 rounded-md text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
            Tolak Anggaran
          </button>
          <button disabled={isApproving} onClick={() => handleReviewPr('Accept')} className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2">
            <CheckCircle2 size={16} /> {isApproving ? "Menyimpan..." : "Setujui Anggaran"}
          </button>
        </div>
      </div>
    </div>
  );
}
