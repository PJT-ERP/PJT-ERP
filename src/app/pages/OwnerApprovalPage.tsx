import { useState } from "react";
import { CheckCircle, XCircle, ExternalLink, Clock, RotateCcw, Search, FileText } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder } from "../components/data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";

type RejectType = 'revision' | 'permanent';

function ApprovalModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers, currentUser } = useApp();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectType, setRejectType] = useState<RejectType>('revision');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  const customer = customers.find(c => c.code === so.customerId);

  const handleApprove = () => {
    updateSalesOrder(so.id, {
      status: 'Ready for Production',
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser?.id,
    });
    setAction('approve');
    setDone(true);
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    updateSalesOrder(so.id, {
      status: rejectType === 'revision' ? 'Revision Required' : 'Rejected',
      rejectionReason: reason,
    });
    setDone(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">Review Desain — {so.id}</h2>
            <p className="text-xs text-gray-500">{so.partNumber} · {so.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5">
          {done ? (
            <div className="text-center py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${action === 'approve' ? 'bg-green-100' : rejectType === 'revision' ? 'bg-rose-100' : 'bg-red-100'}`}>
                {action === 'approve'
                  ? <CheckCircle size={32} className="text-green-500" />
                  : rejectType === 'revision'
                    ? <RotateCcw size={32} className="text-rose-500" />
                    : <XCircle size={32} className="text-red-500" />
                }
              </div>
              <h3 className="text-gray-900 mb-1">
                {action === 'approve' ? 'Desain Berhasil Disetujui!' : rejectType === 'revision' ? 'Revisi Diperlukan' : 'Desain Ditolak Permanen'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {action === 'approve'
                  ? 'Status SO diubah ke "Ready for Production". Tim produksi bisa mulai bekerja.'
                  : rejectType === 'revision'
                    ? 'SO dikembalikan ke Engineering untuk direvisi sesuai catatan.'
                    : 'SO ditolak secara permanen dan tidak akan diproses lebih lanjut.'
                }
              </p>
              <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm rounded-lg">Tutup</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* SO Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-gray-900">{customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Qty</span>
                  <span className="text-gray-900">{so.quantity} {so.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deadline</span>
                  <span className="text-gray-900">{so.deadline}</span>
                </div>
                {so.designLink && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Link Desain</span>
                    <a href={so.designLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                      Buka Desain <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {so.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Diterima</span>
                    <span className="text-gray-900">{new Date(so.submittedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!action && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setAction('reject')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-red-300 text-red-600 text-sm rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={18} /> Tidak Setuju
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl transition-colors"
                  >
                    <CheckCircle size={18} /> Setujui
                  </button>
                </div>
              )}

              {action === 'reject' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Jenis penolakan</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejectType('revision')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border-2 transition-colors ${rejectType === 'revision' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <RotateCcw size={15} /> Minta Revisi
                      </button>
                      <button
                        onClick={() => setRejectType('permanent')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border-2 transition-colors ${rejectType === 'permanent' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <XCircle size={15} /> Tolak Permanen
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {rejectType === 'revision'
                        ? 'Engineering akan merevisi desain dan submit ulang.'
                        : 'SO tidak akan diproses lebih lanjut.'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {rejectType === 'revision' ? 'Catatan Revisi' : 'Alasan Penolakan'} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={rejectType === 'revision' ? 'Jelaskan apa yang perlu direvisi...' : 'Jelaskan alasan penolakan permanen...'}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAction(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                      Batal
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={!reason.trim()}
                      className={`flex-1 py-2.5 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${rejectType === 'revision' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                      {rejectType === 'revision' ? <><RotateCcw size={15} /> Kirim untuk Revisi</> : <><XCircle size={15} /> Konfirmasi Tolak</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OwnerApprovalPage() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'approved' | 'rejected' | 'revision'>('all');

  const waitingApproval = salesOrders.filter(so => so.status === 'Waiting Approval');

  const logSOs = salesOrders
    .filter(so => ['Ready for Production', 'Rejected', 'Revision Required'].includes(so.status))
    .filter(so => {
      const q = logSearch.toLowerCase();
      const customer = customers.find(c => c.code === so.customerId);
      const matchSearch = !logSearch || so.id.toLowerCase().includes(q) || so.description.toLowerCase().includes(q) || (customer?.name || '').toLowerCase().includes(q);
      const matchFilter =
        logFilter === 'all' ||
        (logFilter === 'approved' && so.status === 'Ready for Production') ||
        (logFilter === 'rejected' && so.status === 'Rejected') ||
        (logFilter === 'revision' && so.status === 'Revision Required');
      return matchSearch && matchFilter;
    });

  const logCounts = {
    approved: salesOrders.filter(so => so.status === 'Ready for Production').length,
    rejected: salesOrders.filter(so => so.status === 'Rejected').length,
    revision: salesOrders.filter(so => so.status === 'Revision Required').length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Approval Desain</h1>
        <p className="text-sm text-gray-500">Review dan setujui desain dari Engineering sebelum produksi dimulai</p>
      </div>

      {/* Pending Approvals */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-gray-800">Menunggu Review</h2>
          {waitingApproval.length > 0 && (
            <span className="w-6 h-6 bg-slate-900 text-white text-xs rounded-full flex items-center justify-center">
              {waitingApproval.length}
            </span>
          )}
        </div>

        {waitingApproval.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
            <CheckCircle size={36} className="text-green-400 mx-auto mb-2" />
            <p className="text-gray-700">Tidak ada desain yang perlu direview</p>
            <p className="text-sm text-gray-400">Semua desain sudah diproses</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingApproval.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={so.id} className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-400 p-5 flex items-center gap-4">
                  <Clock size={24} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {daysDiff <= 7 && daysDiff >= 0 && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{daysDiff} hari lagi</span>
                      )}
                      {daysDiff < 0 && (
                        <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{Math.abs(daysDiff)}h terlambat</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{so.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      <span>{so.quantity} {so.unit}</span>
                      <span>·</span>
                      <span>Deadline: {so.deadline}</span>
                    </div>
                    {so.submittedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Dikirim Engineering: {new Date(so.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={() => setSelectedSO(so)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg transition-colors shrink-0"
                    >
                      Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Desain */}
      <div>
        <h2 className="text-gray-800 mb-3">Log Desain</h2>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              placeholder="Cari SO, deskripsi, customer..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
            />
          </div>
          <div className="flex gap-1">
            {([
              { value: 'all', label: 'Semua' },
              { value: 'approved', label: `Disetujui (${logCounts.approved})` },
              { value: 'revision', label: `Revisi (${logCounts.revision})` },
              { value: 'rejected', label: `Ditolak (${logCounts.rejected})` },
            ] as const).map(f => (
              <button key={f.value} onClick={() => setLogFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${logFilter === f.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          {logSOs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Belum ada log desain</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">SO</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logSOs.map(so => {
                  const customer = customers.find(c => c.code === so.customerId);
                  return (
                    <tr key={so.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{so.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{customer?.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{so.description}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={so.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                        {so.rejectionReason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedSO && <ApprovalModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
