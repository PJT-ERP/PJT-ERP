import { useEffect, useState } from 'react';
import { Search, CheckSquare, X, DollarSign, PackageOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatIDR, formatDate } from './mockData';
import { purchasingApi } from '../../services/purchasingApi';
import { PO, mapPurchaseRequestsToPos, calcTotal, calcReceived } from '../purchasing/purchase-orders-page';

type POCategory = 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | '';

export function FinancePurchasingApproval() {
  const [pos, setPos] = useState<PO[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPo, setSelectedPo] = useState<PO | null>(null);
  
  // Modal states
  const [category, setCategory] = useState<POCategory>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        const requests = await purchasingApi.listPurchaseRequests();
        const allPos = mapPurchaseRequestsToPos(requests);
        
        // Tampilkan semua PO yang butuh pembayaran
        const paymentPos = allPos.filter(po => {
          const totalVal = calcTotal(po.items);
          return po.items.length > 0 && totalVal > 0;
        });

        // Urutkan yang Unpaid di atas
        paymentPos.sort((a, b) => {
          if (a.paymentStatus === "Unpaid" && b.paymentStatus !== "Unpaid") return -1;
          if (a.paymentStatus !== "Unpaid" && b.paymentStatus === "Unpaid") return 1;
          return 0;
        });

        setPos(paymentPos);
      } catch (error) {
        console.warn('Purchasing API unavailable; finance approval seed data was not loaded.', error);
        setPos([]);
      }
    };

    void loadApprovals();
  }, []);

  const filtered = pos.filter(po => 
    po.id.toLowerCase().includes(search.toLowerCase()) || 
    po.supplier.toLowerCase().includes(search.toLowerCase()) ||
    po.requestRefs.some(ref => ref.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = pos.filter(p => p.paymentStatus !== 'Paid').length;

  const handlePay = () => {
    if (!selectedPo) return;
    
    // As a mock, we use the financeReview endpoint to represent payment processing
    // since the PO is just mapped from the underlying PR
    const prId = selectedPo.items[0].purchaseRequestId;

    void purchasingApi.financeReviewPurchaseRequest(prId, {
      reviewedByUserId: '90000000-0000-4000-8000-000000000005',
      decision: 'Accept',
      rejectionReason: notes ? `Pembayaran Lunas: ${notes}` : 'Pembayaran Lunas',
    }).then(() => {
      setPos(prev => prev.map(p => p.id === selectedPo.id ? { ...p, paymentStatus: 'Paid' } : p));
      setSelectedPo(null);
      setCategory('');
      setNotes('');
    }).catch(error => {
      console.warn('Failed to process payment in backend.', error);
      window.alert('Gagal memproses pembayaran. Cek koneksi API.');
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tagihan Supplier & Pembayaran (AP)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daftar tagihan supplier dari Purchase Order yang barangnya telah diterima, lengkap dengan termin dan jatuh tempo.</p>
        </div>
        <div className="bg-amber-500 text-white border-transparent shadow-sm px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold border border-amber-200">
          <AlertCircle size={16} />
          {pendingCount} Tagihan Menunggu Pembayaran
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
              placeholder="Cari No. PO, Supplier, atau PR..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tgl PO</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. PO</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Supplier</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. MR/PR</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total Tagihan</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status Pembayaran</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(po => {
                const totalAmount = calcTotal(po.items);
                
                return (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-slate-600">{po.orderDate}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{po.id}</td>
                    <td className="px-5 py-4 text-slate-600">{po.supplier}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                        {po.requestRefs.join(', ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {formatIDR(totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {po.paymentStatus !== 'Paid' ? (
                        <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">UNPAID</span>
                      ) : (
                        <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">LUNAS</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {po.paymentStatus !== 'Paid' ? (
                        <button 
                          onClick={() => setSelectedPo(po)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto"
                        >
                          <DollarSign size={14} /> Bayar
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 size={14} /> Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada tagihan PO yang menunggu pembayaran.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPo(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  Proses Pembayaran Tagihan
                </h3>
                <p className="text-xs text-slate-500 mt-1">{selectedPo.id} - {selectedPo.supplier}</p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">No. Rekening Tujuan</span>
                  <span className="font-semibold text-slate-800">(Terdaftar di Vendor Master)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Termin Pembayaran</span>
                  <span className="font-semibold text-slate-800">{selectedPo.paymentTerms}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm mt-2">
                    <span className="text-sm font-bold text-slate-700">Total Tagihan</span>
                  <span className="text-lg font-black text-blue-700 flex items-center gap-1">
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
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
                  >
                    <option value="" disabled>-- Pilih Akun Bank --</option>
                    <option value="BCA">Bank BCA - Operasional</option>
                    <option value="Mandiri">Bank Mandiri - Proyek</option>
                    <option value="Cash">Kas Kecil (Petty Cash)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Referensi Bukti Transfer / Catatan</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: TRF-BCA-12345..."
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setSelectedPo(null)}
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                Batal
              </button>
              <button 
                onClick={handlePay}
                disabled={!category}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 size={16} /> Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
