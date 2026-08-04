import React from "react";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { usePurchaseRequestDetail } from "./hooks/usePurchaseRequestDetail";
import { PRDetailHeader } from "./components/pr-detail/PRDetailHeader";
import { PRDetailItemsTable } from "./components/pr-detail/PRDetailItemsTable";
import { PRApprovalSection } from "./components/pr-detail/PRApprovalSection";

export function PurchaseRequestDetailPage() {
  const board = usePurchaseRequestDetail();

  if (board.isLoading) {
    return <div className="p-10 text-center text-slate-500">Memuat data PR...</div>;
  }

  if (!board.detail) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Purchase Request tidak ditemukan</h2>
        <button onClick={() => board.navigate("/erp/purchasing/requests")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Kembali ke Daftar PR
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.length > 2 ? board.navigate(-1) : board.navigate("/erp/purchasing/requests")} className="rounded p-2 hover:bg-slate-200 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Purchase Request</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <PRDetailHeader board={board} />
        <PRDetailItemsTable board={board} />

        <div className="px-6 py-6 space-y-6">
          <PRApprovalSection board={board} />
        </div>
      </div>

      <Dialog open={board.showSuccessDialog} onOpenChange={board.setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={24} />
              Berhasil Disimpan
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              Harga dan detail supplier berhasil disimpan. Dokumen ini kini dikirim ke tim Finance untuk mendapatkan approval anggaran.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                board.setShowSuccessDialog(false);
                board.navigate("/erp/purchasing/requests");
              }}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Tutup & Kembali
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {board.dialogMsg && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{board.dialogMsg.title}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{board.dialogMsg.message}</p>
            <button
              type="button"
              onClick={() => board.setDialogMsg(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseRequestDetailPage;
