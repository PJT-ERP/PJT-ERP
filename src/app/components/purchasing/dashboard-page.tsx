import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ClipboardList,
  Truck,
  CheckCircle2,
  RefreshCcw,
  ArrowRight,
  PackagePlus,
  Clock,
  CheckSquare,
  AlertTriangle,
  Search,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { usePurchasingData } from "./usePurchasingData";
import { PurchaseRequestDto } from "../../services/purchasingApi";

export function DashboardPage() {
  const { purchaseRequests, isLoading, refresh } = usePurchasingData();
  const navigate = useNavigate();

  const calculateIsReadyForPo = (pr: PurchaseRequestDto) => {
    const activeItems = pr.items.filter(i => i.purchaseStatus !== 'Rejected');
    return activeItems.length > 0 && activeItems.every(item => !!item.supplierName && (item.totalPrice || item.estimatedPrice || 0) > 0);
  };

  // Metrics
  const taskNeedSourcing = useMemo(() => {
    return purchaseRequests.filter(pr => pr.status === "SupervisorApproved" && !calculateIsReadyForPo(pr));
  }, [purchaseRequests]);

  const taskReadyForPo = useMemo(() => {
    return purchaseRequests.filter(pr => (pr.status === "SupervisorApproved" && calculateIsReadyForPo(pr)) || pr.status === "FinanceApproved");
  }, [purchaseRequests]);

  const taskInTransit = useMemo(() => {
    return purchaseRequests.filter(pr => pr.status === "Processing" || pr.items.some(i => i.purchaseStatus === "Ordered" || i.purchaseStatus === "In Transit"));
  }, [purchaseRequests]);

  const taskCompleted = useMemo(() => {
    return purchaseRequests.filter(pr => pr.status === "Completed" || pr.items.every(i => i.purchaseStatus === "Received"));
  }, [purchaseRequests]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Dashboard Purchasing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ringkasan & Tugas Pembelian PT Pratama Jaya Tekindo · {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/erp/purchasing/create")}
            className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
          >
            <PackagePlus size={14} />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => navigate("/erp/purchasing/requests")}
          className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Butuh Sourcing Harga</p>
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardList size={17} className="text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-semibold text-slate-900 truncate">{taskNeedSourcing.length}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Total dokumen menunggu</p>
            <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
              <TrendingUp size={12} /> Perlu Aksi
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => navigate("/erp/purchasing/requests")}
          className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Siap Buat PO</p>
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckSquare size={17} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-semibold text-slate-900 truncate">{taskReadyForPo.length}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Dokumen siap diproses</p>
            <span className="flex items-center gap-0.5 text-xs font-medium text-blue-600">
              <TrendingUp size={12} /> Prioritas
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => navigate("/erp/purchasing/orders")}
          className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Pesanan Diproses / Dikirim</p>
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Truck size={17} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-xl font-semibold text-slate-900 truncate">{taskInTransit.length}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Menunggu penerimaan</p>
            <span className="flex items-center gap-0.5 text-xs font-medium text-indigo-500">
              <TrendingUp size={12} /> Aktif
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl border border-green-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Permintaan Selesai</p>
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={17} className="text-green-600" />
            </div>
          </div>
          <p className="text-xl font-semibold text-slate-900 truncate">{taskCompleted.length}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Total pesanan bulan ini</p>
            <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
              <TrendingUp size={12} /> Selesai
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Action List */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 text-sm font-semibold">Menunggu Tindakan Purchasing</h3>
            <button 
              onClick={() => navigate("/erp/purchasing/requests")}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Lihat Semua <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {[...taskNeedSourcing, ...taskReadyForPo].slice(0, 5).map(pr => {
              const isReady = calculateIsReadyForPo(pr);
              return (
                <div key={pr.id} className="p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate(`/erp/purchasing/requests/${pr.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isReady ? 'bg-blue-100' : 'bg-amber-100'}`}>
                      {isReady ? <CheckSquare size={17} className="text-blue-600" /> : <Search size={17} className="text-amber-600" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 text-sm">{pr.prNumber}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{pr.projectName || "Kebutuhan Material"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <span 
                      className="text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide"
                      style={{ 
                        backgroundColor: isReady ? '#2563EB' : '#F59E0B', 
                        color: '#FFFFFF' 
                      }}
                    >
                      {isReady ? 'SIAP PO' : 'ISI HARGA'}
                    </span>
                    <ArrowRight size={16} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
            {[...taskNeedSourcing, ...taskReadyForPo].length === 0 && (
              <div className="p-10 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-slate-800 font-semibold mb-1 text-sm">Tidak ada tugas tertunda</h3>
                <p className="text-xs text-slate-500">Semua material request sudah diproses.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
