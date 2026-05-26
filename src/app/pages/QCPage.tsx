import { useState } from "react";
import { Shield, CheckCircle, XCircle, ImageIcon, AlertTriangle, Search } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { StatusBadge } from "../components/shared/StatusBadge";
import { SalesOrder } from "../components/data/mockData";

function QCDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const durationHours = so.startTime && so.endTime
    ? Math.round((new Date(so.endTime).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">Detail QC — {so.id}</h2>
            <p className="text-xs text-gray-500">{so.partNumber} · {customer?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Result Banner */}
          {so.status === 'QC' ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={28} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Menunggu Inspeksi QC</p>
                <p className="text-sm text-amber-600 mt-0.5">Order ini sedang dalam antrian pemeriksaan QC oleh Engineering</p>
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${so.qcStatus === 'Pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {so.qcStatus === 'Pass'
                ? <CheckCircle size={28} className="text-green-500 shrink-0" />
                : <XCircle size={28} className="text-red-500 shrink-0" />
              }
              <div>
                <p className={`font-medium ${so.qcStatus === 'Pass' ? 'text-green-800' : 'text-red-800'}`}>
                  QC {so.qcStatus === 'Pass' ? 'LULUS' : 'TIDAK LULUS'}
                </p>
                {so.qcNotes && <p className="text-sm text-gray-600 mt-0.5">{so.qcNotes}</p>}
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Deskripsi</p>
              <p className="text-gray-900">{so.description}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Qty</p>
              <p className="text-gray-900">{so.quantity} {so.unit}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Deadline</p>
              <p className="text-gray-900">{so.deadline}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Tgl Selesai</p>
              <p className="text-gray-900">{so.completedAt ?? '—'}</p>
            </div>
            {durationHours !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Durasi Produksi</p>
                <p className="text-gray-900">{durationHours} jam</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Foto QC</p>
              <p className="text-gray-900 flex items-center gap-1">
                <ImageIcon size={13} className="text-gray-400" />
                {(so.qcPhotos?.length ?? 0) > 0 ? `${so.qcPhotos!.length} foto` : 'Tidak ada'}
              </p>
            </div>
          </div>

          {/* Late Reason */}
          {so.lateReason && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-700 font-medium">Produksi Terlambat</p>
                <p className="text-xs text-amber-600">{so.lateReason}</p>
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function QCPage() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [filterResult, setFilterResult] = useState<'all' | 'Pass' | 'Fail' | 'Menunggu'>('all');
  const [qcSearch, setQcSearch] = useState('');

  const completed = salesOrders.filter(so => so.status === 'Completed');
  const pendingQC = salesOrders.filter(so => so.status === 'QC');
  const allQC = [...pendingQC, ...completed];

  const passCount = completed.filter(s => s.qcStatus === 'Pass').length;
  const failCount = completed.filter(s => s.qcStatus === 'Fail').length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;
  const lateCount = completed.filter(s => s.lateReason).length;

  const filtered = allQC.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    const matchSearch = !qcSearch ||
      so.id.toLowerCase().includes(qcSearch.toLowerCase()) ||
      so.description.toLowerCase().includes(qcSearch.toLowerCase()) ||
      cust?.name.toLowerCase().includes(qcSearch.toLowerCase());
    const matchFilter =
      filterResult === 'all' ||
      (filterResult === 'Menunggu' && so.status === 'QC') ||
      (filterResult !== 'Menunggu' && so.qcStatus === filterResult);
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Laporan Quality Control</h1>
        <p className="text-sm text-gray-500">Ringkasan hasil inspeksi QC seluruh order produksi</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-2xl text-gray-900">{completed.length}</p>
          <p className="text-xs text-gray-500">Total Selesai</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-green-500 shadow-sm">
          <p className="text-2xl text-green-600">{passCount}</p>
          <p className="text-xs text-gray-500">Lulus QC</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-red-500 shadow-sm">
          <p className="text-2xl text-red-600">{failCount}</p>
          <p className="text-xs text-gray-500">Tidak Lulus</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-2xl text-purple-600">{passRate}%</p>
          <p className="text-xs text-gray-500">Pass Rate</p>
        </div>
      </div>

      {/* Pass Rate Bar */}
      {completed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-700">Pass Rate Keseluruhan</span>
            <span className={passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-amber-600' : 'text-red-600'}>
              {passRate}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${passRate >= 80 ? 'bg-green-500' : passRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${passRate}%` }}
            />
          </div>
          {lateCount > 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} /> {lateCount} order selesai terlambat dari deadline
            </p>
          )}
        </div>
      )}

      {/* Search + Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={qcSearch}
              onChange={e => setQcSearch(e.target.value)}
              placeholder="Cari SO, Deskripsi, Customer..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/20"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'Menunggu', 'Pass', 'Fail'] as const).map(f => (
              <button key={f} onClick={() => setFilterResult(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filterResult === f ? 'bg-[#C9191E] text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                {f === 'all' ? 'Semua' : f}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} item</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Shield size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Belum ada data QC</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">SO</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deadline</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Keterlambatan</th>
                  {!isAdmin && <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Foto</th>}
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Hasil QC</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(so => {
                  const customer = customers.find(c => c.code === so.customerId);
                  const isLate = !!so.lateReason;
                  return (
                    <tr key={so.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedSO(so)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{so.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{customer?.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{so.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{so.deadline}</td>
                      <td className="px-4 py-3">
                        {isLate ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle size={11} /> Terlambat
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Tepat waktu</span>
                        )}
                      </td>
                      {!isAdmin && (
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <ImageIcon size={11} />
                            {(so.qcPhotos?.length ?? 0) > 0 ? `${so.qcPhotos!.length}` : '—'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {so.status === 'QC' ? (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Menunggu QC</span>
                        ) : so.qcStatus ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${so.qcStatus === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                            {so.qcStatus === 'Pass' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                            {so.qcStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSO && <QCDetailModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
