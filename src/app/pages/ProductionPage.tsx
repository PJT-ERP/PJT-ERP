import { useState } from "react";
import { PlayCircle, CheckSquare, CalendarClock, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder } from "../components/data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";

// ─── Start Production Modal ──────────────────────────────────────────────────

function StartProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const today = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(today);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalesOrder(so.id, {
      status: 'In Production',
      startTime: new Date(startDate).toISOString(),
    });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PlayCircle size={32} className="text-orange-500" />
        </div>
        <h3 className="text-gray-900 mb-1">Produksi Dimulai!</h3>
        <p className="text-sm text-gray-500 mb-1">{so.id}</p>
        <p className="text-xs text-gray-400 mb-4">
          Mulai: {new Date(startDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
        <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800">
          Tutup
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">Mulai Produksi</h2>
            <p className="text-xs text-gray-500">{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* SO Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="text-gray-900">{customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Item</span>
              <span className="text-gray-900 text-right max-w-[55%]">{so.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Qty</span>
              <span className="text-gray-900">{so.quantity} {so.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deadline</span>
              <span className="text-gray-900">{so.deadline}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              Tanggal & Waktu Mulai Produksi <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:border-slate-900"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg flex items-center justify-center gap-2">
              <PlayCircle size={16} /> Konfirmasi Mulai
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complete Production Modal ────────────────────────────────────────────────

function CompleteProductionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);

  const today = new Date().toISOString().slice(0, 16);
  const [endDate, setEndDate] = useState(today);
  const [lateReason, setLateReason] = useState('');
  const [done, setDone] = useState(false);

  // Compare end date with deadline
  const endDateOnly = endDate.split('T')[0];
  const isLate = endDateOnly > so.deadline;

  const durationHours = so.startTime
    ? Math.round((new Date(endDate).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLate && !lateReason.trim()) return;
    updateSalesOrder(so.id, {
      status: 'QC',
      endTime: new Date(endDate).toISOString(),
      lateReason: isLate ? lateReason : undefined,
    });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckSquare size={32} className="text-green-500" />
        </div>
        <h3 className="text-gray-900 mb-1">Produksi Selesai!</h3>
        <p className="text-sm text-gray-500 mb-1">{so.id} — siap untuk Quality Control</p>
        {durationHours !== null && (
          <p className="text-xs text-gray-400 mb-4">Total durasi: {durationHours} jam</p>
        )}
        {isLate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-amber-700">⚠ Selesai terlambat dari deadline ({so.deadline})</p>
          </div>
        )}
        <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800">
          Tutup
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">Selesai Produksi</h2>
            <p className="text-xs text-gray-500">{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* SO Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="text-gray-900">{customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Item</span>
              <span className="text-gray-900 text-right max-w-[55%]">{so.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deadline</span>
              <span className="text-gray-900">{so.deadline}</span>
            </div>
            {so.startTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Waktu Mulai</span>
                <span className="text-gray-900">
                  {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              Tanggal & Waktu Selesai Produksi <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={endDate}
              min={so.startTime ? so.startTime.slice(0, 16) : undefined}
              onChange={e => setEndDate(e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                isLate
                  ? 'border-amber-400 focus:ring-amber-300 bg-amber-50'
                  : 'border-gray-300 focus:ring-slate-900/30 focus:border-slate-900'
              }`}
            />
            {durationHours !== null && endDate && (
              <p className="text-xs text-gray-500 mt-1">
                Durasi: <span className="text-gray-900">{durationHours} jam</span>
              </p>
            )}
          </div>

          {/* Late warning & reason */}
          {isLate && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Tanggal selesai melewati deadline <strong>{so.deadline}</strong>. Wajib isi alasan keterlambatan.
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Alasan Keterlambatan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required={isLate}
                  value={lateReason}
                  onChange={e => setLateReason(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan penyebab keterlambatan (misal: bahan baku terlambat, mesin rusak, revisi desain mendadak, dll.)"
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={isLate && !lateReason.trim()}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <CheckSquare size={16} /> Konfirmasi Selesai
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ProductionPage() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);

  const readyForProduction = salesOrders.filter(s => s.status === 'Ready for Production');
  const inProduction = salesOrders.filter(s => s.status === 'In Production');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Produksi</h1>
        <p className="text-sm text-gray-500">Input waktu mulai dan selesai produksi untuk setiap order</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-2xl text-gray-900">{readyForProduction.length}</p>
          <p className="text-xs text-gray-500">Siap Diproduksi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-orange-500 shadow-sm">
          <p className="text-2xl text-gray-900">{inProduction.length}</p>
          <p className="text-xs text-gray-500">Sedang Diproduksi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-cyan-500 shadow-sm">
          <p className="text-2xl text-gray-900">{salesOrders.filter(s => s.status === 'QC').length}</p>
          <p className="text-xs text-gray-500">Menunggu QC</p>
        </div>
      </div>

      {/* Ready for Production */}
      {readyForProduction.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
            Siap Diproduksi ({readyForProduction.length})
          </h2>
          <div className="space-y-3">
            {readyForProduction.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysDiff < 0;
              return (
                <div key={so.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <CalendarClock size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.isRework && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                          Rework
                        </span>
                      )}
                      {isOverdue && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={11} /> Terlambat
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{so.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      <span>{so.quantity} {so.unit}</span>
                      <span>·</span>
                      <span className={isOverdue ? 'text-red-500' : daysDiff <= 7 ? 'text-amber-500' : 'text-gray-500'}>
                        Deadline: {so.deadline}
                        {isOverdue ? ` (${Math.abs(daysDiff)}h terlambat)` : daysDiff <= 7 ? ` (${daysDiff}h lagi!)` : ''}
                      </span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={() => setStartModal(so)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-white text-sm rounded-lg transition-colors shrink-0 ${
                        so.isRework
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      <PlayCircle size={16} /> {so.isRework ? 'Lanjut Produksi' : 'Mulai Produksi'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* In Production */}
      {inProduction.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></span>
            Sedang Diproduksi ({inProduction.length})
          </h2>
          <div className="space-y-3">
            {inProduction.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const elapsedHours = so.startTime
                ? Math.round((Date.now() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              const isOverDeadline = so.deadline < new Date().toISOString().split('T')[0];
              return (
                <div key={so.id} className="bg-white rounded-xl shadow-sm border-l-4 border-l-orange-400 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                    <Clock size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.isRework && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                          Rework
                        </span>
                      )}
                      {isOverDeadline && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={11} /> Melewati Deadline
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{so.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      {so.startTime && (
                        <span>Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      )}
                      {elapsedHours !== null && (
                        <><span>·</span><span className="text-orange-600">{elapsedHours} jam berjalan</span></>
                      )}
                    </div>
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={() => setCompleteModal(so)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors shrink-0"
                    >
                      <CheckSquare size={16} /> Selesai Produksi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {readyForProduction.length === 0 && inProduction.length === 0 && (
        <div className="bg-white rounded-xl p-14 text-center shadow-sm border border-gray-100">
          <CalendarClock size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-700">Tidak ada order yang perlu diproses saat ini</p>
          <p className="text-sm text-gray-400">Order akan muncul setelah mendapat persetujuan Owner</p>
        </div>
      )}

      {/* Completed today */}
      {salesOrders.filter(s => s.status === 'QC').length > 0 && (
        <div>
          <h2 className="text-gray-800 mb-3">Menunggu QC</h2>
          <div className="space-y-2">
            {salesOrders.filter(s => s.status === 'QC').map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const durationHours = so.startTime && so.endTime
                ? Math.round((new Date(so.endTime).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              return (
                <div key={so.id} className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.lateReason && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={11} /> Terlambat
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {customer?.name} · {so.description}
                      {durationHours !== null && ` · Durasi: ${durationHours} jam`}
                    </p>
                    {so.lateReason && (
                      <p className="text-xs text-amber-700 mt-0.5">Alasan: {so.lateReason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
    </div>
  );
}
