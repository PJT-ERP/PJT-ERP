import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, CheckSquare, X, DollarSign, PackageOpen, CheckCircle2, AlertCircle, UploadCloud, Eye, FileText } from 'lucide-react';
import { formatIDR, formatDate } from './mockData';
import { purchasingApi } from '../../services/purchasingApi';
import { financeApi } from '../../services/financeApi';
import { PO, mapPurchaseRequestsToPos, calcTotal, calcReceived } from '../purchasing/purchase-orders-page';
import { usePurchasingData } from '../purchasing/usePurchasingData';
import { MR, mapPurchaseRequestToMr, statusCfg, Pill } from '../purchasing/material-requests-page';
import { useApp } from '../context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type POCategory = 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | '';

export function FinancePurchasingApproval() {
  const { purchaseRequests, suppliers, supplierPayments, refresh } = usePurchasingData();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [pos, setPos] = useState<PO[]>([]);
  const [mrs, setMrs] = useState<MR[]>([]);
  const [search, setSearch] = useState('');
  
  // Payment states
  const [selectedPo, setSelectedPo] = useState<PO | null>(null);
  const [category, setCategory] = useState<POCategory>('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // PR Review states
  const [selectedMr, setSelectedMr] = useState<MR | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!purchaseRequests || purchaseRequests.length === 0) return;
    
    try {
      const allPos = mapPurchaseRequestsToPos(purchaseRequests, supplierPayments);
      const paymentPos = allPos.filter(po => po.items.length > 0 && calcTotal(po.items) > 0);
      paymentPos.sort((a, b) => {
        if (a.paymentStatus === "Unpaid" && b.paymentStatus !== "Unpaid") return -1;
        if (a.paymentStatus !== "Unpaid" && b.paymentStatus === "Unpaid") return 1;
        return 0;
      });
      setPos(paymentPos);

      const allMrs = purchaseRequests.map(mapPurchaseRequestToMr);
      const pendingMrs = allMrs.filter(mr => mr.backendStatus === "SupervisorApproved" || mr.backendStatus === "FinanceApproved" || mr.backendStatus === "FinanceRejected");
      
      pendingMrs.sort((a, b) => {
        if (a.backendStatus === "SupervisorApproved" && b.backendStatus !== "SupervisorApproved") return -1;
        if (a.backendStatus !== "SupervisorApproved" && b.backendStatus === "SupervisorApproved") return 1;
        return 0;
      });
      
      setMrs(pendingMrs);
    } catch (error) {
      console.warn('Error processing purchase requests for finance approval.', error);
    }
  }, [purchaseRequests, supplierPayments]);

  const filteredPos = pos.filter(po => 
    po.id.toLowerCase().includes(search.toLowerCase()) || 
    po.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMrs = mrs.filter(mr => 
    mr.id.toLowerCase().includes(search.toLowerCase()) || 
    mr.department.toLowerCase().includes(search.toLowerCase()) ||
    mr.requestor.toLowerCase().includes(search.toLowerCase())
  );

  const pendingPosCount = pos.filter(p => p.paymentStatus !== 'Paid').length;
  const pendingMrsCount = mrs.filter(m => m.backendStatus === 'SupervisorApproved').length;

  const handlePay = async () => {
    if (!selectedPo) return;
    try {
      await financeApi.submitSupplierPayment({
        poNumber: selectedPo.id,
        supplierName: selectedPo.supplier,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: calcTotal(selectedPo.items),
        bankName: selectedPo.supplier,
        notes: notes,
        proofFile: proofFile ?? undefined
      });
      await refresh();
      setSelectedPo(null);
      setCategory('');
      setNotes('');
      setProofFile(null);
    } catch (error) {
      console.warn('Failed to process supplier payment.', error);
      window.alert('Gagal menyimpan pembayaran. Cek koneksi API.');
    }
  };

  const handleReviewPr = async (decision: 'Accept' | 'Reject') => {
    if (!selectedMr || !currentUser) return;
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(selectedMr.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: 'Finance',
        rejectionReason: decision === 'Reject' ? prompt("Alasan Penolakan:") || "Ditolak oleh Finance" : undefined
      });
      await refresh();
      setSelectedMr(null);
    } catch (error) {
      console.warn('Failed to review PR.', error);
      window.alert('Gagal memproses review PR.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tagihan Supplier & Persetujuan Anggaran</h1>
          <p className="text-sm text-slate-500 mt-0.5">Persetujuan anggaran (PR) dan pembayaran Tagihan Supplier (AP).</p>
        </div>
        <div className="flex gap-2">
          {pendingMrsCount > 0 && (
            <div className="bg-blue-500 text-white border-transparent shadow-sm px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <FileText size={16} />
              {pendingMrsCount} PR Menunggu
            </div>
          )}
          {pendingPosCount > 0 && (
            <div className="bg-amber-500 text-white border-transparent shadow-sm px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <AlertCircle size={16} />
              {pendingPosCount} Tagihan AP Menunggu
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <FileText size={15} /> Persetujuan Anggaran PR
            {pendingMrsCount > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs ml-1">{pendingMrsCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CheckSquare size={15} /> Tagihan Supplier (AP)
            {pendingPosCount > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs ml-1">{pendingPosCount}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari No. PR, Departemen..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tgl PR</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. PR</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Departemen</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Est. Anggaran</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMrs.map(mr => {
                    const totalEst = mr.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
                    return (
                      <tr key={mr.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/erp/finance/pr/${mr.id}`)}>
                        <td className="px-5 py-4 text-slate-600">{mr.date}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{mr.id}</td>
                        <td className="px-5 py-4 text-slate-600">{mr.department}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatIDR(totalEst)}</td>
                        <td className="px-5 py-4 text-center">
                          {mr.backendStatus === "SupervisorApproved" ? (
                            <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-200">WAITING</span>
                          ) : mr.backendStatus === "FinanceApproved" ? (
                            <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">APPROVED</span>
                          ) : (
                            <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200">REJECTED</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {mr.backendStatus === "SupervisorApproved" ? (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/finance/pr/${mr.id}`); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto">
                              <CheckCircle2 size={14} /> Review
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs flex items-center justify-center gap-1">
                              <Eye size={14} /> Detail
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMrs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada PR yang menunggu persetujuan anggaran.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari No. PO, Supplier..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total Tagihan</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status Pembayaran</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPos.map(po => {
                    const totalAmount = calcTotal(po.items);
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/erp/finance/po/${po.id}`)}>
                        <td className="px-5 py-4 text-slate-600">{po.orderDate}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{po.id}</td>
                        <td className="px-5 py-4 text-slate-600">{po.supplier}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatIDR(totalAmount)}</td>
                        <td className="px-5 py-4 text-center">
                          {po.paymentStatus !== 'Paid' ? (
                            <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">UNPAID</span>
                          ) : (
                            <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">LUNAS</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {po.paymentStatus !== 'Paid' ? (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/finance/po/${po.id}`); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto">
                              <DollarSign size={14} /> Bayar Tagihan
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs flex items-center justify-center gap-1"><CheckCircle2 size={14} /> Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPos.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada tagihan PO yang menunggu pembayaran.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* PR Review Modal */}
      {selectedMr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedMr(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Review Anggaran Purchase Request
                </h3>
                <p className="text-xs text-slate-500 mt-1">{selectedMr.id} - {selectedMr.department}</p>
              </div>
              <button onClick={() => setSelectedMr(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Requestor</span>
                  <span className="font-semibold text-slate-800">{selectedMr.requestor}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm mt-2">
                  <span className="text-sm font-bold text-slate-700">Estimasi Total Anggaran</span>
                  <span className="text-lg font-black text-blue-700 flex items-center gap-1">
                    {formatIDR(selectedMr.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
              <button disabled={isApproving} onClick={() => handleReviewPr('Reject')} className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                Tolak Anggaran
              </button>
              <button disabled={isApproving} onClick={() => handleReviewPr('Accept')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2">
                <CheckCircle2 size={16} /> {isApproving ? "Menyimpan..." : "Setujui Anggaran"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start text-sm">
                  <span className="text-slate-500">No. Rekening Tujuan</span>
                  <div className="text-right">
                    {(() => {
                      const supp = suppliers.find(s => s.name === selectedPo.supplier);
                      if (supp && supp.bankAccount) {
                        return (
                          <>
                            <div className="font-semibold text-slate-800">{supp.bankName} - {supp.bankAccount}</div>
                            <div className="text-xs text-slate-500 mt-0.5">a.n. {selectedPo.supplier} {supp.bankBranch ? `(${supp.bankBranch})` : ''}</div>
                          </>
                        );
                      }
                      return <span className="font-semibold text-slate-800">(Terdaftar di Vendor Master)</span>;
                    })()}
                  </div>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <UploadCloud size={24} className="text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 font-medium">Tarik & lepas file atau klik untuk browse</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" id="proof-upload" onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setProofFile(e.target.files[0]);
                      }
                    }} />
                    <button onClick={() => document.getElementById('proof-upload')?.click()} className="mt-3 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors">
                      Pilih File
                    </button>
                    {proofFile && <p className="mt-2 text-xs text-green-600 font-medium">✓ File terpilih: {proofFile.name}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan Pembayaran (Opsional)</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Tambahkan catatan (mis: dibayar separuh, dll)"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setSelectedPo(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">
                Batal
              </button>
              <button 
                onClick={handlePay}
                disabled={!category || !proofFile}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <DollarSign size={16} /> Simpan & Tandai Lunas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
