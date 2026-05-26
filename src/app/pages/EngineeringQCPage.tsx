import { useState, useRef } from "react";
import { Shield, Upload, X, CheckCircle, Trash2, ImageIcon } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder } from "../components/data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";

function QCHistoryModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <p className="font-mono text-sm text-gray-500">{so.id}</p>
            <h2 className="text-gray-900">Detail Hasil QC</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Result badge */}
          <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${so.qcStatus === 'Pass' ? 'bg-green-50' : 'bg-red-50'}`}>
            {so.qcStatus === 'Pass'
              ? <CheckCircle size={20} className="text-green-500" />
              : <X size={20} className="text-red-500" />
            }
            <span className={`text-sm ${so.qcStatus === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>
              {so.qcStatus === 'Pass' ? 'Lulus QC' : 'Tidak Lulus QC'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm text-gray-900">{customer?.name ?? so.customerId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Part Number</p>
              <p className="text-sm text-gray-900 font-mono">{so.partNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Qty</p>
              <p className="text-sm text-gray-900">{so.quantity} {so.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tanggal Inspeksi</p>
              <p className="text-sm text-gray-900">{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Foto</p>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                <ImageIcon size={13} className="text-blue-500" />
                {(so.qcPhotos?.length ?? 0) > 0 ? `${so.qcPhotos!.length} foto` : 'Tidak ada'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Selesai Produksi</p>
              <p className="text-sm text-gray-900">{so.completedAt ?? '—'}</p>
            </div>
          </div>

          {so.qcNotes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Catatan Inspeksi</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">{so.qcNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QCInspectionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customer = customers.find(c => c.code === so.customerId);

  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'Pass' | 'Fail' | ''>('');
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { name: file.name, url }]);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = () => {
    if (result === 'Pass') {
      updateSalesOrder(so.id, {
        status: 'Completed',
        qcStatus: 'Pass',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        completedAt: new Date().toISOString().split('T')[0],
        qcPhotos: photos.map(p => p.name),
      });
    } else {
      updateSalesOrder(so.id, {
        status: 'Ready for Production',
        qcStatus: 'Fail',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        qcPhotos: photos.map(p => p.name),
        isRework: true,
      });
    }
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result === 'Pass' ? 'bg-green-100' : 'bg-red-100'}`}>
          {result === 'Pass' ? <CheckCircle size={32} className="text-green-500" /> : <X size={32} className="text-red-500" />}
        </div>
        <h3 className="text-gray-900 mb-1">QC {result === 'Pass' ? 'LULUS' : 'TIDAK LULUS'}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {so.id} — {result === 'Pass' ? 'Status: Completed' : 'Dikembalikan ke produksi untuk rework'}
        </p>
        <button onClick={onClose} className="px-6 py-2 bg-[#C9191E] text-white text-sm rounded-lg">Selesai</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900">Inspeksi QC — {so.id}</h2>
            <p className="text-xs text-gray-500">{so.partNumber} · {customer?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Photo Upload */}
          <div>
            <p className="text-sm text-gray-700 mb-2">Foto Hasil Produksi</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#C9191E]/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <Upload size={24} className="text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Klik untuk upload foto</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP — bisa multiple</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => removePhoto(idx)} className="p-1.5 bg-red-500 rounded-full text-white">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Catatan Hasil Inspeksi</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Temuan defect, kondisi produk, rekomendasi, dll."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 resize-none" />
          </div>

          {/* Pass / Fail */}
          <div>
            <p className="text-sm text-gray-700 mb-2">Hasil QC</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setResult('Pass')}
                className={`py-3 rounded-xl border-2 text-sm transition-colors ${
                  result === 'Pass'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600'
                }`}>
                ✓ Lulus
              </button>
              <button type="button" onClick={() => setResult('Fail')}
                className={`py-3 rounded-xl border-2 text-sm transition-colors ${
                  result === 'Fail'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600'
                }`}>
                ✗ Tidak Lulus
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Batal</button>
            <button onClick={handleSubmit} disabled={!result}
              className="flex-1 py-2.5 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419] disabled:opacity-50 transition-colors">
              Submit Hasil QC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EngineeringQCPage() {
  const { salesOrders, customers } = useApp();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);

  const qcQueue = salesOrders.filter(so => so.status === 'QC');
  const recentCompleted = salesOrders.filter(so => so.status === 'Completed').slice(0, 8);
  const passCount = recentCompleted.filter(s => s.qcStatus === 'Pass').length;
  const failCount = recentCompleted.filter(s => s.qcStatus === 'Fail').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Quality Control</h1>
        <p className="text-sm text-gray-500">Inspeksi kualitas hasil produksi sebelum pengiriman</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-cyan-500 shadow-sm">
          <p className="text-2xl text-gray-900">{qcQueue.length}</p>
          <p className="text-xs text-gray-500">Menunggu Inspeksi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-green-500 shadow-sm">
          <p className="text-2xl text-gray-900">{passCount}</p>
          <p className="text-xs text-gray-500">Lulus QC</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-red-500 shadow-sm">
          <p className="text-2xl text-gray-900">{failCount}</p>
          <p className="text-xs text-gray-500">Tidak Lulus</p>
        </div>
      </div>

      {/* Queue */}
      <div className="mb-6">
        <h2 className="text-gray-800 mb-3">Antrian Inspeksi QC</h2>
        {qcQueue.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
            <Shield size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700">Tidak ada item yang perlu diinspeksi</p>
            <p className="text-sm text-gray-400">Item akan muncul setelah produksi selesai</p>
          </div>
        ) : (
          <div className="space-y-3">
            {qcQueue.map(so => {
              const customer = customers.find(c => c.code === so.customerId);
              const durationHours = so.startTime && so.endTime
                ? Math.round((new Date(so.endTime).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              return (
                <div key={so.id} className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-500 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                    <Shield size={20} className="text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm text-gray-900">{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p className="text-sm text-gray-700">{so.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{customer?.name}</span><span>·</span><span>{so.quantity} {so.unit}</span>
                      {durationHours !== null && <><span>·</span><span>Durasi: {durationHours} jam</span></>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedSO(so)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded-lg transition-colors shrink-0">
                    Mulai Inspeksi
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {recentCompleted.length > 0 && (
        <div>
          <h2 className="text-gray-800 mb-3">Riwayat QC</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">SO</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Foto</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Hasil</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Catatan</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentCompleted.map(so => (
                  <tr key={so.id} onClick={() => setHistoryDetail(so)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs">{so.id}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[160px] truncate">{so.description}</td>
                    <td className="px-4 py-3">
                      {(so.qcPhotos?.length ?? 0) > 0
                        ? <span className="flex items-center gap-1 text-xs text-blue-600"><ImageIcon size={12} /> {so.qcPhotos!.length} foto</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {so.qcStatus
                        ? <span className={`text-xs font-medium ${so.qcStatus === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{so.qcStatus}</span>
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{so.qcNotes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedSO && <QCInspectionModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
      {historyDetail && <QCHistoryModal so={historyDetail} onClose={() => setHistoryDetail(null)} />}
    </div>
  );
}
