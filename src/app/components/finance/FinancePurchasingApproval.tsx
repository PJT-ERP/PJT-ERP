import { useEffect, useState } from 'react';
import { Search, CheckSquare, X, DollarSign, PackageOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatIDR, formatDate } from './mockData';
import { purchasingApi, PurchaseRequestDto } from '../../services/purchasingApi';

type POCategory = 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | '';

interface PendingPO {
  id: string;
  backendId?: string;
  poNumber: string;
  department: string;
  requestor: string;
  items: string;
  totalAmount: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

function mapPurchaseRequestToApproval(request: PurchaseRequestDto): PendingPO | null {
  if (!['SupervisorApproved', 'FinanceApproved', 'FinanceRejected'].includes(request.status)) {
    return null;
  }

  return {
    id: request.id,
    poNumber: request.prNumber,
    department: request.projectName?.split(' - ')[0] || 'Engineering',
    requestor: request.requesterName,
    items: request.items.map(item => item.itemName).join(', '),
    totalAmount: request.items.reduce((sum, item) => sum + (item.totalPrice || item.estimatedPrice || 0), 0),
    date: request.updatedAtUtc || request.requestDate,
    status: request.status === 'FinanceApproved'
      ? 'APPROVED'
      : request.status === 'FinanceRejected'
        ? 'REJECTED'
        : 'PENDING',
  };
}

export function FinancePurchasingApproval() {
  const [pos, setPos] = useState<PendingPO[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPo, setSelectedPo] = useState<PendingPO | null>(null);
  
  // Modal states
  const [category, setCategory] = useState<POCategory>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        const requests = await purchasingApi.listPurchaseRequests();
        setPos(requests.map(mapPurchaseRequestToApproval).filter(Boolean) as PendingPO[]);
      } catch (error) {
        console.warn('Purchasing API unavailable; finance approval seed data was not loaded.', error);
        setPos([]);
      }
    };

    void loadApprovals();
  }, []);

  const filtered = pos.filter(po => 
    po.poNumber.toLowerCase().includes(search.toLowerCase()) || 
    po.department.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = pos.filter(p => p.status === 'PENDING').length;

  const handleApprove = () => {
    if (!selectedPo) return;

    void purchasingApi.financeReviewPurchaseRequest(selectedPo.id, {
      reviewedByUserId: '90000000-0000-4000-8000-000000000005',
      decision: 'Accept',
      rejectionReason: notes || null,
    }).then(() => {
      setPos(prev => prev.map(p => p.id === selectedPo.id ? { ...p, status: 'APPROVED' } : p));
      setSelectedPo(null);
      setCategory('');
      setNotes('');
    }).catch(error => {
      console.warn('Failed to approve purchasing request in backend.', error);
      window.alert('Gagal approve Finance. Cek koneksi API atau status MR.');
    });
  };

  const handleReject = () => {
    if (!selectedPo) return;

    void purchasingApi.financeReviewPurchaseRequest(selectedPo.id, {
      reviewedByUserId: '90000000-0000-4000-8000-000000000005',
      decision: 'Reject',
      rejectionReason: notes || 'Ditolak Finance.',
    }).then(() => {
      setPos(prev => prev.map(p => p.id === selectedPo.id ? { ...p, status: 'REJECTED' } : p));
      setSelectedPo(null);
      setCategory('');
      setNotes('');
    }).catch(error => {
      console.warn('Failed to reject purchasing request in backend.', error);
      window.alert('Gagal reject Finance. Cek koneksi API atau status MR.');
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Approval Purchasing (MR)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Approval Finance untuk MR yang sudah disetujui Engineering Supervisor sebelum Purchasing PO.</p>
        </div>
        <div className="bg-amber-500 text-white border-transparent shadow-sm px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold border border-amber-200">
          <AlertCircle size={16} />
          {pendingCount} MR Menunggu Finance Approval
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari No. MR atau Departemen..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tanggal</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. MR</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Departemen</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Estimasi Dana</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-slate-600">{formatDate(po.date)}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{po.poNumber}</td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                      {po.department}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 truncate max-w-[200px]" title={po.items}>{po.items}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">
                    {po.totalAmount > 0 ? formatIDR(po.totalAmount) : <span className="text-slate-400">Belum diinput</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {po.status === 'PENDING' && <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">PENDING</span>}
                    {po.status === 'APPROVED' && <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">APPROVED</span>}
                    {po.status === 'REJECTED' && <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200">REJECTED</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {po.status === 'PENDING' ? (
                      <button 
                        onClick={() => setSelectedPo(po)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto"
                      >
                        <CheckSquare size={14} /> Review
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada MR menunggu Finance approval saat ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPo(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <PackageOpen size={18} className="text-red-600" />
                  Review Finance MR
                </h3>
                <p className="text-xs text-slate-500 mt-1">{selectedPo.poNumber}</p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Box */}
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Departemen Pengaju</span>
                  <span className="font-semibold text-slate-800">{selectedPo.department}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Requestor</span>
                  <span className="font-semibold text-slate-800">{selectedPo.requestor}</span>
                </div>
                <div className="border-t border-red-100 pt-3">
                  <span className="block text-xs text-slate-500 mb-1">Item yang dibeli:</span>
                  <p className="text-sm font-medium text-slate-700">{selectedPo.items}</p>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-red-100 shadow-sm mt-2">
                    <span className="text-sm font-bold text-slate-700">Estimasi Dana</span>
                  <span className="text-lg font-black text-red-700 flex items-center gap-1">
                    {selectedPo.totalAmount > 0 ? formatIDR(selectedPo.totalAmount) : 'Belum diinput'}
                  </span>
                </div>
                {selectedPo.totalAmount <= 0 && (
                  <p className="text-xs text-slate-500">
                    Harga belum diinput pada MR. Purchasing akan mengisi total harga saat proses PO.
                  </p>
                )}
              </div>

              {/* Finance Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Kategorisasi Aset Perusahaan <span className="text-red-500">*</span></label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value as POCategory)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-500 bg-white shadow-sm"
                  >
                    <option value="" disabled>-- Pilih Kategori Pembukuan --</option>
                    <option value="Asset">Asset (Inventaris Jangka Panjang)</option>
                    <option value="Consumable">Consumable (Barang Habis Pakai)</option>
                    <option value="Tools">Tools (Alat Kerja)</option>
                    <option value="Project">Project (Beban Proyek Spesifik)</option>
                    <option value="Maintenance">Maintenance (Biaya Perawatan)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan Keuangan</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Catatan persetujuan atau alasan penolakan..."
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-500 resize-none bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={handleReject}
                className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-md"
              >
                Tolak Pengajuan
              </button>
              <button 
                onClick={handleApprove}
                disabled={!category}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <DollarSign size={16} /> Approve Finance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
