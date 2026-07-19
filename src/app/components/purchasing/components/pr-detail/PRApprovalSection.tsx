import React from "react";
import { CheckCircle2, Clock, Plus, AlertTriangle } from "lucide-react";
import { usePurchaseRequestDetail } from "../../hooks/usePurchaseRequestDetail";

interface PRApprovalSectionProps {
  board: ReturnType<typeof usePurchaseRequestDetail>;
}

export function PRApprovalSection({ board }: PRApprovalSectionProps) {
  const { 
    detail, 
    actionError, 
    canEditPricing, 
    isSavingPricing, 
    handleSavePricing, 
    canApproveFinance, 
    isApproving, 
    handleReviewPr, 
    canCreatePo, 
    navigate 
  } = board;

  if (!detail) return null;

  return (
    <>
      {/* Notes */}
      {detail.notes && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</p>
          <p className="rounded p-4 text-sm text-slate-600 bg-slate-50 border border-slate-200">
            {detail.notes}
          </p>
        </div>
      )}

      {detail.rejectionReason && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Alasan Penolakan</p>
          <p className="m-0 text-sm text-red-800">{detail.rejectionReason}</p>
        </div>
      )}

      {actionError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Actions */}
      {canEditPricing && (
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
          <div className={`flex items-start gap-3 rounded p-4 border ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
            <AlertTriangle size={18} className={`${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-600" : "text-amber-600"} shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-bold ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-800" : "text-amber-800"}`}>
                {detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "Revisi Anggaran & Toko (Ditolak Finance)" : "Tugas: Pengecekan Harga & Toko"}
              </p>
              <p className={`text-sm ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-700" : "text-amber-700"} mt-1`}>
                {detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" 
                  ? "Silakan perbaiki pilihan supplier dan estimasi harga yang ditolak di tabel atas, lalu klik tombol di bawah untuk mengajukan ulang ke Finance."
                  : "Isi tabel harga dan toko di atas, lalu klik Simpan Harga. Setelah itu, dokumen ini akan dikirim ke Finance untuk approval budget sebelum Anda bisa membuat PO."}
              </p>
            </div>
          </div>
          <button
            className="w-full flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: 14, fontWeight: 600, background: detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "#2563eb" : "#16a34a" }}
            onClick={handleSavePricing}
            disabled={isSavingPricing}
          >
            <CheckCircle2 size={16} /> {isSavingPricing ? "Menyimpan..." : (detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "Simpan Revisi & Ajukan Ulang ke Finance" : "Simpan Harga & Minta Approval Finance")}
          </button>
        </div>
      )}

      {detail.items.some(i => !!i.poNumber) || detail.backendStatus === "Processing" || detail.backendStatus === "Completed" ? (
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-start gap-3 rounded p-4 bg-blue-50 border border-blue-200">
            <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-800">Purchase Order Telah Dibuat</p>
              <p className="text-sm text-blue-700 mt-1">
                PR ini sudah diproses dan diterbitkan Purchase Order-nya.
              </p>
            </div>
          </div>
        </div>
      ) : detail.backendStatus === "SupervisorApproved" && detail.isReadyForFinance ? (
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-start gap-3 rounded p-4 bg-blue-50 border border-blue-200">
            <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-800">Menunggu Approval Finance</p>
              <p className="text-sm text-blue-700 mt-1">
                Harga dan Toko sudah terisi. Dokumen ini sedang menunggu tim Finance menyetujui anggaran sebelum PO bisa diterbitkan.
              </p>
            </div>
          </div>
          {canApproveFinance && (
            <div className="flex items-center gap-3 mt-2">
              <button
                disabled={isApproving}
                onClick={() => handleReviewPr('Reject')}
                className="flex-1 py-3 rounded text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Tolak Anggaran
              </button>
              <button
                disabled={isApproving}
                onClick={() => handleReviewPr('Accept')}
                className="flex-1 py-3 rounded text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> {isApproving ? "Menyimpan..." : "Setujui Anggaran"}
              </button>
            </div>
          )}
        </div>
      ) : (detail.backendStatus === "FinanceApproved" || detail.financeApproval === "Approved" || detail.backendStatus === "Processing") && detail.hasUnorderedItems ? (
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-start gap-3 rounded p-4 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Siap Dibuatkan PO</p>
              <p className="text-sm text-emerald-700 mt-1">
                Anggaran telah disetujui Finance. {canCreatePo ? "Anda bisa langsung lanjut membuat Purchase Order." : "Dokumen ini menunggu tim Purchasing membuat Purchase Order."}
              </p>
            </div>
          </div>
          {canCreatePo && (
            <button
              className="w-full flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90"
              style={{ fontSize: 14, fontWeight: 600, background: "#2563eb" }}
              onClick={() => navigate(`/erp/purchasing/create?reqId=${detail.id}`)}
            >
              <Plus size={16} /> Buat PO Sekarang
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
