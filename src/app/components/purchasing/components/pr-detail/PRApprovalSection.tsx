import React from "react";
import { CheckCircle2, Clock, Plus, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../ui/dialog";
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
          <div className={`flex items-start gap-3 rounded p-4 border ${detail.backendStatus === "FinanceRejected" ? "bg-red-50 border-red-200" : detail.backendStatus === "SupervisorRejected" ? "bg-amber-50 border-amber-200" : "bg-amber-50 border-amber-200"}`}>
            <AlertTriangle size={18} className={`${detail.backendStatus === "FinanceRejected" ? "text-red-600" : "text-amber-600"} shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-bold ${detail.backendStatus === "FinanceRejected" ? "text-red-800" : "text-amber-800"}`}>
                {detail.backendStatus === "FinanceRejected" ? "Revisi Anggaran & Toko (Ditolak Finance)" : detail.backendStatus === "SupervisorRejected" ? "Revisi Spesifikasi (Ditolak Supervisor)" : "Tugas: Pengecekan Harga & Toko"}
              </p>
              <p className={`text-sm ${detail.backendStatus === "FinanceRejected" ? "text-red-700" : "text-amber-700"} mt-1`}>
                {detail.backendStatus === "FinanceRejected" 
                  ? "Silakan perbaiki pilihan supplier dan estimasi harga yang ditolak di tabel atas, lalu klik tombol di bawah untuk mengajukan ulang ke Finance."
                  : detail.backendStatus === "SupervisorRejected"
                  ? "Supervisor menolak revisi spesifikasi sebelumnya. Silakan perbaiki supplier/harga sesuai spesifikasi awal atau ajukan revisi spesifikasi kembali."
                  : "Isi tabel harga dan toko di atas, lalu klik Simpan Harga. Setelah itu, dokumen ini akan dikirim ke Finance untuk approval budget sebelum Anda bisa membuat PO."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded py-3 text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 600 }}
              onClick={board.handleOpenRevision}
              disabled={isSavingPricing}
            >
              <AlertTriangle size={16} /> Ajukan Revisi ke SPV
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 600, background: detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "#2563eb" : "#16a34a" }}
              onClick={handleSavePricing}
              disabled={isSavingPricing}
            >
              <CheckCircle2 size={16} /> {isSavingPricing ? "Menyimpan..." : (detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "Simpan Revisi & Ajukan Ulang" : "Simpan Harga & Minta Approval")}
            </button>
          </div>
        </div>
      )}

      {/* dialogs... */}
      <Dialog open={board.showRevisionDialog} onOpenChange={board.setShowRevisionDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajukan Revisi Spesifikasi ke Supervisor</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Alasan Revisi (Wajib)</label>
              <textarea 
                className="w-full p-2 border border-slate-300 rounded text-sm min-h-[80px]" 
                placeholder="Contoh: Barang dengan spesifikasi tersebut sedang kosong di semua supplier, yang ada ukuran 2.1mm"
                value={board.revisionNote}
                onChange={e => board.setRevisionNote(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 block mb-2">Penyesuaian Spesifikasi Item</p>
              <div className="space-y-3">
                // eslint-disable-next-line unused-imports/no-unused-vars
                {detail.items.map((item, idx) => {
                  const revItem = board.revisionItems.find(r => r.itemId === item.itemId);
                  return (
                    <div key={item.itemId} className="p-3 border border-slate-200 rounded bg-slate-50">
                      <p className="text-xs font-bold text-slate-800 mb-1">{item.name}</p>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded text-sm"
                        placeholder="Ubah spesifikasi/ukuran di sini jika perlu..."
                        value={revItem?.size || ""}
                        onChange={e => {
                          const newItems = [...board.revisionItems];
                          const idx = newItems.findIndex(r => r.itemId === item.itemId);
                          if (idx > -1) newItems[idx].size = e.target.value;
                          board.setRevisionItems(newItems);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => board.setShowRevisionDialog(false)} className="px-4 py-2 rounded text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200">
              Batal
            </button>
            <button 
              onClick={board.handleSubmitRevision}
              disabled={!board.revisionNote.trim() || board.isRequestingRevision}
              className="px-4 py-2 rounded text-white font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {board.isRequestingRevision ? "Mengirim..." : "Kirim Revisi"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
