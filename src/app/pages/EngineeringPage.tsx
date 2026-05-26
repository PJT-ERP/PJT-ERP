import { useState } from "react";
import { Pencil, Send, Clock, CheckCircle, ExternalLink, RotateCcw, AlertTriangle } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder } from "../components/data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";

function DesignModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const [designLink, setDesignLink] = useState(so.designLink ?? '');
  const [step, setStep] = useState<'upload' | 'confirm' | 'done'>('upload');
  const customer = customers.find(c => c.code === so.customerId);

  const handleForward = () => {
    updateSalesOrder(so.id, {
      designLink,
      status: 'Waiting Approval',
      submittedAt: new Date().toISOString(),
    });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">{so.id}</h2>
            <p className="text-xs text-gray-500">{so.partNumber} — {so.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5">
          {step === 'done' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-gray-900 mb-1">Desain Diteruskan ke Owner</h3>
              <p className="text-sm text-gray-500 mb-4">Status SO diubah menjadi "Waiting Approval"</p>
              <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm rounded-lg">Tutup</button>
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">Konfirmasi meneruskan desain ke Owner untuk approval?</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="text-gray-900">{customer?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Qty</span><span className="text-gray-900">{so.quantity} {so.unit}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1">Lihat <ExternalLink size={11} /></a>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Kembali</button>
                <button onClick={handleForward} className="flex-1 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2">
                  <Send size={15} /> Forward ke Owner
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500">Customer</p><p className="text-gray-900">{customer?.name}</p></div>
                <div><p className="text-xs text-gray-500">Qty</p><p className="text-gray-900">{so.quantity} {so.unit}</p></div>
                <div><p className="text-xs text-gray-500">Deadline</p><p className="text-gray-900">{so.deadline}</p></div>
                <div><p className="text-xs text-gray-500">Input SO</p><p className="text-gray-900">{so.createdAt}</p></div>
              </div>
              {so.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-xs text-rose-700"><strong>Catatan Revisi dari Owner:</strong> {so.rejectionReason}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Link Desain / Drawing <span className="text-red-500">*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900" />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Batal</button>
                <button onClick={() => setStep('confirm')} disabled={!designLink.trim()}
                  className="flex-1 py-2.5 bg-slate-900 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={15} /> Submit & Forward
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_ORDER = ['Revision Required', 'Pending Design', 'Waiting Approval'];

const CARD_STYLE: Record<string, { border: string; icon: string; iconBg: string }> = {
  'Revision Required': { border: 'border-l-rose-500',  icon: 'text-rose-500',  iconBg: 'bg-rose-100' },
  'Pending Design':    { border: 'border-l-gray-400',  icon: 'text-gray-500',  iconBg: 'bg-gray-100' },
  'Waiting Approval':  { border: 'border-l-amber-400', icon: 'text-amber-500', iconBg: 'bg-amber-100' },
};

export function EngineeringPage() {
  const { salesOrders, customers } = useApp();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  const pendingDesign   = salesOrders.filter(so => so.status === 'Pending Design').length;
  const revisionRequired = salesOrders.filter(so => so.status === 'Revision Required').length;
  const waitingApproval = salesOrders.filter(so => so.status === 'Waiting Approval').length;

  const queue = salesOrders
    .filter(so => ['Revision Required', 'Pending Design', 'Waiting Approval'].includes(so.status))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Antrian Desain</h1>
        <p className="text-sm text-gray-500">Buat dan kirim desain ke Owner untuk mendapatkan approval</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-gray-400 shadow-sm">
          <p className="text-2xl text-gray-900">{pendingDesign}</p>
          <p className="text-xs text-gray-500">Menunggu Desain</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-2xl text-rose-600">{revisionRequired}</p>
          <p className="text-xs text-gray-500">Perlu Revisi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-amber-400 shadow-sm">
          <p className="text-2xl text-amber-600">{waitingApproval}</p>
          <p className="text-xs text-gray-500">Menunggu Approval</p>
        </div>
      </div>

      {/* Unified Queue */}
      {queue.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <CheckCircle size={40} className="text-green-300 mx-auto mb-3" />
          <p className="text-gray-700">Semua pesanan sudah didesain</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(so => {
            const customer = customers.find(c => c.code === so.customerId);
            const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysDiff < 0;
            const style = CARD_STYLE[so.status];
            const isWaiting = so.status === 'Waiting Approval';
            const isRevision = so.status === 'Revision Required';

            return (
              <div key={so.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${style.border} p-4 flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
                  {isRevision
                    ? <RotateCcw size={18} className={style.icon} />
                    : isWaiting
                    ? <Clock size={18} className={style.icon} />
                    : <Pencil size={18} className={style.icon} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-sm text-gray-900">{so.id}</span>
                    <StatusBadge status={so.status} />
                    {isOverdue && !isWaiting && (
                      <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        <AlertTriangle size={10} /> {Math.abs(daysDiff)}h terlambat
                      </span>
                    )}
                    {!isOverdue && daysDiff <= 7 && !isWaiting && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{daysDiff}h lagi</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 truncate">{so.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{customer?.name}</span>
                    <span>·</span>
                    <span>{so.quantity} {so.unit}</span>
                    <span>·</span>
                    <span>Deadline: {so.deadline}</span>
                  </div>
                </div>
                {!isWaiting && (
                  <button onClick={() => setSelectedSO(so)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg transition-colors shrink-0">
                    <Pencil size={13} />
                    {isRevision ? 'Revisi Desain' : 'Input Desain'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedSO && <DesignModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
