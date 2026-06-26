import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, Clock } from "lucide-react";
import { purchasingApi } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import {
  MR,
  statusCfg,
  priorityCfg,
  mapPurchaseRequestToMr,
  Pill
} from "../purchasing/material-requests-page";

const formatRp = (val: string | number) => {
  if (!val) return "";
  const num = typeof val === "number" ? val : parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

export function FinancePrDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshBackendData } = useApp();
  
  const [detail, setDetail] = useState<MR | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const canApproveFinance = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await purchasingApi.listPurchaseRequests();
        const req = data.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
        if (req) {
          setDetail(mapPurchaseRequestToMr(req));
        } else {
          setDetail(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) void loadData();
  }, [id]);

  const handleReviewPr = async (decision: 'Accept' | 'Reject') => {
    if (!detail || !currentUser) return;
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(detail.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: 'Finance',
        rejectionReason: decision === 'Reject' ? window.prompt("Alasan Penolakan Anggaran:") || "Ditolak oleh Finance" : undefined
      });
      await refreshBackendData();
      
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));
    } catch (error) {
      console.warn('Failed to review PR.', error);
      window.alert('Gagal memproses review PR.');
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Memuat data PR...</div>;
  }

  if (!detail) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Purchase Request tidak ditemukan</h2>
        <button onClick={() => navigate("/erp/finance/approval")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Kembali ke Persetujuan Anggaran
        </button>
      </div>
    );
  }

  const sc = statusCfg[detail.status] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  const pc = priorityCfg[detail.priority] || { bg: "#f1f5f9", color: "#64748b" };
  
  const totalAnggaran = detail.items.reduce((sum, item) => sum + ((item.estimatedPrice || 0) * item.qty), 0);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/finance/approval")} className="rounded p-2 hover:bg-slate-200 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Persetujuan Anggaran PR</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Info Header */}
        <div className="px-6 py-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <FileText size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900 m-0">{detail.id}</h2>
              <Pill cfg={sc} label={detail.status} />
              <Pill cfg={pc} label={detail.priority} />
            </div>
            <p className="text-sm text-slate-500 m-0">
              {detail.department} · Diminta oleh: {detail.requestor} · Tanggal: {detail.date}
            </p>
          </div>
          
          <div className="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm text-right min-w-[200px]">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Estimasi Anggaran</p>
             <p className="text-xl font-bold text-blue-700 m-0">Rp {formatRp(totalAnggaran)}</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Referensi SO", val: detail.soRef ?? "Non-project / tidak terkait SO" },
              { label: "Kategori Barang", val: detail.category },
              { label: "Disetujui Supervisor", val: detail.approvedBy ?? "—" },
              { label: "Status Anggaran", val: detail.financeApproval ?? "—" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded p-4 bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm text-slate-900 mt-1 font-medium">{val}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              Daftar Barang & Estimasi Harga
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{detail.items.length} item</span>
            </p>
            <div className="rounded border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Kode</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Material / Barang</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Kuantitas</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Supplier Rekomendasi</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Harga Satuan</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-xs text-slate-600 font-mono">{item.code}</td>
                      <td className="p-3 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="p-3 text-sm font-semibold text-slate-900 text-right">{item.qty} {item.unit}</td>
                      <td className="p-3 text-sm text-slate-600">{item.supplierName || "-"}</td>
                      <td className="p-3 text-sm text-slate-900 text-right font-medium">{item.estimatedPrice ? formatRp(item.estimatedPrice) : "-"}</td>
                      <td className="p-3 text-sm text-slate-900 text-right font-bold">{item.estimatedPrice ? formatRp(item.estimatedPrice * item.qty) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {detail.notes && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan Permintaan</p>
              <p className="rounded p-4 text-sm text-slate-700 bg-amber-50 border border-amber-100">
                {detail.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          {detail.backendStatus === "SupervisorApproved" && detail.isReadyForFinance && canApproveFinance && (
            <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  disabled={isApproving}
                  onClick={() => handleReviewPr('Reject')}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Tolak Anggaran
                </button>
                <button
                  disabled={isApproving}
                  onClick={() => handleReviewPr('Accept')}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 size={18} /> {isApproving ? "Memproses..." : "Setujui Anggaran"}
                </button>
              </div>
            </div>
          )}
          
          {(detail.backendStatus === "FinanceApproved" || detail.financeApproval === "Approved") && (
             <div className="flex items-start gap-3 rounded p-4 bg-emerald-50 border border-emerald-200 mt-4">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Anggaran Telah Disetujui</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Anggaran untuk PR ini telah disetujui. Tim Purchasing dapat melanjutkan proses pembuatan Purchase Order.
                  </p>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
