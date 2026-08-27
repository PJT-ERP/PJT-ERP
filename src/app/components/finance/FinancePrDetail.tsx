import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, FileText, AlertCircle } from "lucide-react";
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
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [dialogMsg, setDialogMsg] = useState<{ title: string; message: string } | null>(null);


  const canApproveFinance = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [data, invData] = await Promise.all([
          purchasingApi.listPurchaseRequests(),
          import("../../services/masterDataApi").then(m => m.masterDataApi.listInventory())
        ]);
        setInventoryItems(invData);
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

  const handleReviewPr = async (decision: 'Accept' | 'Reject', reason?: string) => {
    if (!detail || !currentUser) return;
    if (decision === 'Reject' && (!reason || !reason.trim())) {
      setDialogMsg({ title: "Peringatan", message: "Alasan penolakan anggaran wajib diisi agar tim Purchasing tahu apa yang harus direvisi!" });
      return;
    }
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(detail.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: 'Finance',
        rejectionReason: decision === 'Reject' ? reason : undefined
      });
      setShowRejectModal(false);
      setRejectReasonInput("");
      await refreshBackendData();
      
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));
    } catch (error) {
      console.warn('Failed to review PR.', error);
      setDialogMsg({ title: "Gagal Memproses", message: "Gagal memproses review PR. Cek koneksi API." });
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
        <button onClick={() => navigate("/erp/finance/approval")} className="mt-4 px-4 py-2 bg-[#C8102E] text-white rounded">
          Kembali ke Persetujuan Anggaran
        </button>
      </div>
    );
  }

  const sc = statusCfg[detail.status] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  const pc = priorityCfg[detail.priority] || { bg: "#f1f5f9", color: "#64748b" };
  
  const totalAnggaran = detail.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/finance/approval")} className="rounded p-2 hover:bg-slate-200 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Persetujuan Anggaran PR</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {/* Info Header */}
        <div className="px-6 py-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <FileText size={20} className="text-[#C8102E]" />
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
             <p className="text-xl font-bold text-[#C8102E] m-0">Rp {formatRp(totalAnggaran)}</p>
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
                  {detail.items.map((item, i) => {
                    const invItem = inventoryItems.find(inv => inv.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
                    const actualCode = invItem ? invItem.code : item.code;
                    const isSpecActuallyCode = invItem && invItem.code && item.spec && item.spec.toLowerCase().trim() === invItem.code.toLowerCase().trim();
                    
                    return (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-xs text-slate-600 font-mono">{actualCode}</td>
                      <td className="p-3 text-sm font-medium text-slate-900">
                        <div>{item.name}</div>
                        {item.spec && item.spec !== "-" && !isSpecActuallyCode ? (
                          <div className="text-xs text-slate-500 font-normal mt-0.5">Spesifikasi: {item.spec}</div>
                        ) : null}
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-900 text-right">{item.qty} {item.unit}</td>
                      <td className="p-3 text-sm text-slate-600">{item.supplierName || "-"}</td>
                      <td className="p-3 text-sm text-slate-900 text-right font-medium">{item.estimatedPrice ? formatRp(item.estimatedPrice / (item.qty || 1)) : "-"}</td>
                      <td className="p-3 text-sm text-slate-900 text-right font-bold">{item.estimatedPrice ? formatRp(item.estimatedPrice) : "-"}</td>
                    </tr>
                    );
                  })}
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
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 py-3 rounded-md text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Tolak Anggaran
                </button>
                <button
                  disabled={isApproving}
                  onClick={() => handleReviewPr('Accept')}
                  className="flex-1 py-3 rounded-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
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

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tolak Persetujuan Anggaran</h3>
            <p className="text-sm text-slate-600 mb-4">
              Silakan berikan alasan penolakan anggaran ini agar tim Purchasing dapat melakukan revisi harga atau memilih supplier lain.
            </p>
            <textarea
              className="w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-red-500 min-h-[100px] mb-4"
              placeholder="Contoh: Harga dari supplier X terlalu mahal melebihi standar HPS proyek. Mohon cari supplier alternatif."
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
