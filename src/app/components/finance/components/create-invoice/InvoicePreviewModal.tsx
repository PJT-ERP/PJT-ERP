import { Eye } from 'lucide-react';
import { formatIDR } from '../../mockData';

export function InvoicePreviewModal({
  showPreview,
  setShowPreview,
  displayCustomerName,
  invoiceNumber,
  isDP,
  dpDeadline,
  dueDate,
  subtotal,
  ppnEnabled,
  ppn,
  grandTotal,
  pct,
  invoiceTotal,
}: {
  showPreview: boolean;
  setShowPreview: (val: boolean) => void;
  displayCustomerName: string;
  invoiceNumber: string;
  isDP: boolean;
  dpDeadline: string;
  dueDate: string;
  subtotal: number;
  ppnEnabled: boolean;
  ppn: number;
  grandTotal: number;
  pct: number;
  invoiceTotal: number;
}) {
  if (!showPreview) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Eye size={18} className="text-red-600"/> Preview Tagihan Draft</h2>
          <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Ditagihkan Kepada</p>
            <p className="text-xl font-bold text-slate-900">{displayCustomerName || 'Belum dipilih'}</p>
            <p className="text-sm text-slate-500 mt-1">{invoiceNumber} • Jatuh Tempo: {isDP && dpDeadline ? dpDeadline : dueDate || '-'}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-6">
            <div className="flex justify-between items-center mb-3 text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">{formatIDR(subtotal)}</span>
            </div>
            {ppnEnabled && (
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-slate-600">PPN (11%)</span>
                <span className="font-semibold text-slate-800">{formatIDR(ppn)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="font-bold text-slate-900">{formatIDR(grandTotal)}</span>
            </div>
          </div>

          <div className={`p-5 rounded-lg border ${isDP ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-bold ${isDP ? 'text-red-900' : 'text-slate-800'}`}>
                {isDP ? `Total Ditagihkan (DP ${pct}%)` : 'Total Ditagihkan'}
              </span>
              <span className={`text-2xl font-black ${isDP ? 'text-red-700' : 'text-slate-900'}`}>
                {formatIDR(invoiceTotal)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button onClick={() => setShowPreview(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}
