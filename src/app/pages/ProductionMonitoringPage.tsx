import { useState } from "react";
import { Factory, Clock, Shield, CheckCircle, XCircle, AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { StatusBadge } from "../components/shared/StatusBadge";
import { SalesOrder } from "../components/data/mockData";
import { SODetailModal } from "../components/shared/SODetailModal";

type Section = 'all' | 'ready' | 'in-production' | 'qc' | 'completed';

function PaginationFooter({ currentPage, totalPages, total, pageSize, setPage }: {
  currentPage: number; totalPages: number; total: number; pageSize: number; setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between mt-3">
      <p className="text-xs text-gray-500">
        {`${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} dari ${total} hasil`}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
          <span key={p}>
            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-gray-400 px-1">…</span>}
            <button onClick={() => setPage(p)} className={`w-7 h-7 text-xs rounded-lg ${p === currentPage ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{p}</button>
          </span>
        ))}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function ProductionMonitoringPage() {
  const { salesOrders, customers } = useApp();
  const [section, setSection] = useState<Section>('all');
  const [qcSearch, setQcSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const PAGE_SIZE = 10;

  const readyForProd = salesOrders.filter(s => s.status === 'Ready for Production');
  const inProduction = salesOrders.filter(s => s.status === 'In Production');
  const inQC = salesOrders.filter(s => s.status === 'QC');
  const completed = salesOrders.filter(s => s.status === 'Completed');

  const filteredCompleted = completed.filter(so => {
    if (!qcSearch) return true;
    const q = qcSearch.toLowerCase();
    const customer = customers.find(c => c.code === so.customerId);
    return so.id.toLowerCase().includes(q) || so.description.toLowerCase().includes(q) || (customer?.name || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredCompleted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCompleted = filteredCompleted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const passCount = completed.filter(s => s.qcStatus === 'Pass').length;
  const failCount = completed.filter(s => s.qcStatus === 'Fail').length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;

  const filters: { value: Section; label: string; count: number }[] = [
    { value: 'all', label: 'Semua', count: readyForProd.length + inProduction.length + inQC.length },
    { value: 'ready', label: 'Siap Produksi', count: readyForProd.length },
    { value: 'in-production', label: 'Sedang Produksi', count: inProduction.length },
    { value: 'qc', label: 'Menunggu QC', count: inQC.length },
    { value: 'completed', label: 'Riwayat QC', count: completed.length },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Monitoring Produksi</h1>
        <p className="text-sm text-gray-500">Pantau alur produksi dan hasil Quality Control</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-2xl text-purple-600">{readyForProd.length}</p>
          <p className="text-xs text-gray-500">Siap Produksi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-orange-500 shadow-sm">
          <p className="text-2xl text-orange-600">{inProduction.length}</p>
          <p className="text-xs text-gray-500">Sedang Diproduksi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-cyan-500 shadow-sm">
          <p className="text-2xl text-cyan-600">{inQC.length}</p>
          <p className="text-xs text-gray-500">Menunggu QC</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-green-500 shadow-sm">
          <p className="text-2xl text-green-600">{passCount}</p>
          <p className="text-xs text-gray-500">QC Lulus</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-red-400 shadow-sm">
          <p className="text-2xl text-red-600">{failCount}</p>
          <p className="text-xs text-gray-500">QC Tidak Lulus</p>
        </div>
      </div>

      {/* Pass Rate Bar */}
      {completed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-700">Pass Rate QC Keseluruhan</span>
            <span className={passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-amber-600' : 'text-red-600'}>
              {passRate}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${passRate >= 80 ? 'bg-green-500' : passRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => { setSection(f.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
              section === f.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                section === f.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Siap Produksi */}
      {(section === 'all' || section === 'ready') && readyForProd.length > 0 && (
        <div className="mb-5">
          {section === 'all' && (
            <h2 className="text-gray-700 mb-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-purple-500 rounded-full" /> Siap Produksi
            </h2>
          )}
          <div className="space-y-2">
            {readyForProd.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={so.id} onClick={() => setSelectedSO(so)} className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-400 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <CalendarClock size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p className="text-sm text-gray-600 truncate">{so.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      <span>{so.quantity} {so.unit}</span>
                      <span>·</span>
                      <span className={daysDiff < 0 ? 'text-red-500' : daysDiff <= 7 ? 'text-amber-500' : ''}>
                        Deadline: {so.deadline}
                        {daysDiff < 0 && ` (${Math.abs(daysDiff)}h terlambat)`}
                        {daysDiff >= 0 && daysDiff <= 7 && ` (${daysDiff}h lagi)`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sedang Diproduksi */}
      {(section === 'all' || section === 'in-production') && inProduction.length > 0 && (
        <div className="mb-5">
          {section === 'all' && (
            <h2 className="text-gray-700 mb-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> Sedang Diproduksi
            </h2>
          )}
          <div className="space-y-2">
            {inProduction.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const elapsedHours = so.startTime
                ? Math.round((Date.now() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              const isOverDeadline = so.deadline < new Date().toISOString().split('T')[0];
              return (
                <div key={so.id} onClick={() => setSelectedSO(so)} className="bg-white rounded-xl shadow-sm border-l-4 border-l-orange-400 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {isOverDeadline && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> Melewati Deadline
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{so.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      {so.startTime && <span>Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      {elapsedHours !== null && <><span>·</span><span className="text-orange-600">{elapsedHours} jam berjalan</span></>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menunggu QC */}
      {(section === 'all' || section === 'qc') && inQC.length > 0 && (
        <div className="mb-5">
          {section === 'all' && (
            <h2 className="text-gray-700 mb-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-cyan-500 rounded-full" /> Menunggu QC
            </h2>
          )}
          <div className="space-y-2">
            {inQC.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const durationHours = so.startTime && so.endTime
                ? Math.round((new Date(so.endTime).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              return (
                <div key={so.id} onClick={() => setSelectedSO(so)} className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-400 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                      {so.lateReason && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> Terlambat
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{so.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{customer?.name}</span>
                      <span>·</span>
                      <span>{so.quantity} {so.unit}</span>
                      {durationHours !== null && <><span>·</span><span>Durasi: {durationHours} jam</span></>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Riwayat QC */}
      {(section === 'all' || section === 'completed') && completed.length > 0 && (
        <div>
          {section === 'all' && (
            <h2 className="text-gray-700 mb-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full" /> Riwayat QC
            </h2>
          )}
          {section === 'completed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={qcSearch}
                  onChange={e => { setQcSearch(e.target.value); setPage(1); }}
                  placeholder="Cari SO, deskripsi, atau customer..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                />
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">SO</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deadline</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Keterlambatan</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Hasil QC</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Tgl QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(section === 'completed' ? paginatedCompleted : completed).map(so => {
                  const customer = customers.find(c => c.code === so.customerId);
                  return (
                    <tr key={so.id} onClick={() => setSelectedSO(so)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{so.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{customer?.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{so.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{so.deadline}</td>
                      <td className="px-4 py-3">
                        {so.lateReason
                          ? <span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle size={11} /> Terlambat</span>
                          : <span className="text-xs text-green-600">Tepat waktu</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {so.qcStatus
                          ? <span className={`flex items-center gap-1 text-xs font-medium ${so.qcStatus === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                              {so.qcStatus === 'Pass' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                              {so.qcStatus}
                            </span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {section === 'completed' && filteredCompleted.length > 0 && (
              <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {`${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredCompleted.length)} dari ${filteredCompleted.length} hasil`}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-gray-400 px-1">…</span>}
                      <button onClick={() => setPage(p)} className={`w-7 h-7 text-xs rounded-lg ${p === currentPage ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{p}</button>
                    </span>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(section === 'all') && readyForProd.length === 0 && inProduction.length === 0 && inQC.length === 0 && (
        <div className="bg-white rounded-xl p-14 text-center shadow-sm border border-gray-100">
          <Factory size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Tidak ada order aktif di produksi saat ini</p>
        </div>
      )}
      {section === 'ready' && readyForProd.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Tidak ada order siap produksi</p>
        </div>
      )}
      {section === 'in-production' && inProduction.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Tidak ada order sedang diproduksi</p>
        </div>
      )}
      {section === 'qc' && inQC.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Tidak ada order menunggu QC</p>
        </div>
      )}
      {section === 'completed' && completed.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Belum ada riwayat QC</p>
        </div>
      )}

      {selectedSO && (
        <SODetailModal
          so={selectedSO}
          customer={customers.find(c => c.code === selectedSO.customerId)}
          onClose={() => setSelectedSO(null)}
        />
      )}
    </div>
  );
}
