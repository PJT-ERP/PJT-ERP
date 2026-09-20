import { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { purchasingApi } from '../../services/purchasingApi';
import { financeApi } from '../../services/financeApi';
import { PO, mapPurchaseRequestsToPos, calcTotal } from '../purchasing/purchase-orders-page';
import { usePurchasingData } from '../purchasing/usePurchasingData';
import { MR, mapPurchaseRequestToMr } from '../purchasing/material-requests-page';
import { useApp } from '../context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Sub-components
import { PrBudgetTab } from './components/PurchasingApproval/PrBudgetTab';
import { ApPaymentTab } from './components/PurchasingApproval/ApPaymentTab';
import { ApHistoryTab } from './components/PurchasingApproval/ApHistoryTab';
import { PrReviewModal } from './components/PurchasingApproval/PrReviewModal';
import { ApPaymentModal } from './components/PurchasingApproval/ApPaymentModal';

export type POCategory = 'Asset' | 'Consumable' | 'Tools' | 'Project' | 'Maintenance' | '';

export function FinancePurchasingApproval() {
  const { purchaseRequests, suppliers, supplierPayments, refresh } = usePurchasingData();
  const { currentUser } = useApp();
  const [pos, setPos] = useState<PO[]>([]);
  const [mrs, setMrs] = useState<MR[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('finance_approval_tab') || "budget");

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    sessionStorage.setItem('finance_approval_tab', val);
  };
  
  // Payment states
  const [selectedPo, setSelectedPo] = useState<PO | null>(null);
  const [category, setCategory] = useState<POCategory>('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Pagination for history
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // PR Review states
  const [selectedMr, setSelectedMr] = useState<MR | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [dialogMsg, setDialogMsg] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!purchaseRequests || purchaseRequests.length === 0) return;
    
    try {
      const allPos = mapPurchaseRequestsToPos(purchaseRequests, supplierPayments, suppliers);
      const paymentPos = allPos.filter(po => po.items.length > 0 && calcTotal(po.items) > 0);
      paymentPos.sort((a, b) => {
        if (a.paymentStatus === "Unpaid" && b.paymentStatus !== "Unpaid") return -1;
        if (a.paymentStatus !== "Unpaid" && b.paymentStatus === "Unpaid") return 1;
        return 0;
      });
      setPos(paymentPos);

      const allMrs = purchaseRequests.map(mapPurchaseRequestToMr);
      const pendingMrs = allMrs.filter(mr => {
        if (mr.backendStatus === "Completed" || mr.status === "Completed") return false;
        
        // Hanya tampilkan di Finance jika Purchasing sudah submit harga (isReadyForFinance)
        // ATAU statusnya memang sedang/sudah diproses oleh Finance
        return mr.isReadyForFinance === true || 
               mr.backendStatus === "FinanceApproved" || 
               mr.backendStatus === "FinanceRejected" ||
               (mr.status as string) === "Waiting for Finance Approval" ||
               (mr.status as string) === "Revision Needed";
      });
      
      pendingMrs.sort((a, b) => {
        const aReady = a.isReadyForFinance ? 1 : 0;
        const bReady = b.isReadyForFinance ? 1 : 0;
        if (aReady !== bReady) return bReady - aReady;
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

  const pendingPosList = filteredPos.filter(po => po.paymentStatus !== 'Paid');
  const historyPosList = filteredPos.filter(po => po.paymentStatus === 'Paid');
  const paginatedHistory = historyPosList.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

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
      setDialogMsg({ title: "Gagal Menyimpan", message: "Gagal menyimpan pembayaran. Cek koneksi API." });
    }
  };

  const handleReviewPr = async (decision: 'Accept' | 'Reject', reason?: string) => {
    if (!selectedMr || !currentUser) return;
    if (decision === 'Reject' && (!reason || !reason.trim())) {
      setDialogMsg({ title: "Peringatan", message: "Alasan penolakan anggaran wajib diisi agar tim Purchasing tahu apa yang harus direvisi!" });
      return;
    }
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(selectedMr.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: 'Finance',
        rejectionReason: decision === 'Reject' ? reason : undefined
      });
      setShowRejectModal(false);
      setRejectReasonInput("");
      await refresh();
      setSelectedMr(null);
    } catch (error) {
      console.warn('Failed to review PR.', error);
      setDialogMsg({ title: "Gagal Memproses", message: "Gagal memproses review PR. Cek koneksi API." });
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
            <div className="bg-[#C8102E] text-white border-transparent shadow-sm px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold">
              <FileText size={16} />
              {pendingMrsCount} PR Menunggu
            </div>
          )}
          {pendingPosCount > 0 && (
            <div className="bg-amber-500 text-white border-transparent shadow-sm px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold">
              <AlertCircle size={16} />
              {pendingPosCount} Tagihan AP Menunggu
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4 bg-slate-100 rounded-md p-1">
          <TabsTrigger value="budget" className="flex items-center gap-2 rounded-sm">
            <FileText size={15} /> Persetujuan Anggaran PR
            {pendingMrsCount > 0 && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs ml-1">{pendingMrsCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2 rounded-sm">
            <CheckSquare size={15} /> Tagihan Supplier (AP)
            {pendingPosCount > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs ml-1">{pendingPosCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 rounded-sm" onClick={() => setHistoryPage(1)}>
            <CheckCircle2 size={15} /> Riwayat (AP)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <PrBudgetTab 
            filteredMrs={filteredMrs} 
            search={search} 
            setSearch={setSearch} 
          />
        </TabsContent>

        <TabsContent value="payment">
          <ApPaymentTab 
            pendingPosList={pendingPosList} 
            search={search} 
            setSearch={setSearch} 
          />
        </TabsContent>

        <TabsContent value="history">
          <ApHistoryTab 
            historyPosList={historyPosList} 
            paginatedHistory={paginatedHistory} 
            search={search} 
            setSearch={setSearch} 
            historyPage={historyPage} 
            setHistoryPage={setHistoryPage} 
            ITEMS_PER_PAGE={ITEMS_PER_PAGE} 
          />
        </TabsContent>
      </Tabs>

      {/* PR Review Modal */}
      {selectedMr && (
        <PrReviewModal 
          selectedMr={selectedMr} 
          setSelectedMr={setSelectedMr} 
          isApproving={isApproving} 
          setShowRejectModal={setShowRejectModal} 
          handleReviewPr={handleReviewPr} 
        />
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tolak Persetujuan Anggaran</h3>
            <p className="text-sm text-slate-600 mb-4">
              Silakan berikan alasan penolakan anggaran ini agar tim Purchasing tahu apa yang harus direvisi.
            </p>
            <textarea
              className="w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-red-500 min-h-[100px] mb-4"
              placeholder="Contoh: Harga estimasi melebihi batas standar HPS. Cari alternatif supplier."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectReasonInput(""); }}
                className="px-4 py-2 rounded text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={isApproving}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleReviewPr('Reject', rejectReasonInput)}
                className="px-4 py-2 rounded text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={isApproving || !rejectReasonInput.trim()}
              >
                {isApproving ? "Memproses..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPo && (
        <ApPaymentModal 
          selectedPo={selectedPo} 
          setSelectedPo={setSelectedPo} 
          suppliers={suppliers} 
          category={category} 
          setCategory={setCategory} 
          proofFile={proofFile} 
          setProofFile={setProofFile} 
          notes={notes} 
          setNotes={setNotes} 
          handlePay={handlePay} 
        />
      )}

      {dialogMsg && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{dialogMsg.title}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{dialogMsg.message}</p>
            <button
              type="button"
              onClick={() => setDialogMsg(null)}
              className="w-full py-2.5 rounded-md text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
