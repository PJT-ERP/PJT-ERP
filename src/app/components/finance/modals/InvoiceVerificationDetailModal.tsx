import { useState } from 'react';
import { CheckCircle2, XCircle, X, Banknote } from 'lucide-react';
import { formatIDR, formatDate, type Invoice } from '../mockData';
import { financeApi } from '../../../services/financeApi';
import { todayInputValue, getRemainingAmount, getNextSchedule } from '../paymentUtils';

export function InvoiceVerificationDetailModal({ invoice, onClose, onVerify, onReject }: {
  invoice: Invoice;
  onClose: () => void;
  onVerify: () => Promise<void>;
  onReject: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const remainingAmount = getRemainingAmount(invoice);
  const nextSchedule = getNextSchedule(invoice);

  const handleVerify = async () => {
    try {
      setIsSaving(true);
      const verifyAmount = nextSchedule ? Math.min(nextSchedule.amount, remainingAmount) : remainingAmount;
      await financeApi.recordPayment(invoice.id, {
        paymentDate: todayInputValue(),
        amount: verifyAmount,
        notes: "Diverifikasi otomatis",
      });
      await onVerify();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal verifikasi pembayaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-md">
          <div>
            <h2 className="text-slate-900 text-base font-semibold">Detail Pembayaran</h2>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber} - {invoice.soNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-amber-500 text-white border-transparent shadow-sm">
              Menunggu Verifikasi
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pelanggan</p>
              <p className="text-sm font-semibold text-slate-800">{invoice.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Jatuh Tempo</p>
              <p className="text-sm text-slate-700">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Invoice</p>
              <p className="text-sm font-bold text-slate-900">{formatIDR(invoice.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Sisa Tagihan</p>
              <p className="text-sm font-bold text-red-700">{formatIDR(remainingAmount)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Bukti Pembayaran</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex flex-col items-center gap-2 border-b border-slate-100">
                <div className="w-16 h-20 bg-white rounded-lg shadow-md flex flex-col items-center justify-center gap-2 border border-slate-200">
                  <Banknote size={24} className="text-red-500" />
                  <div className="space-y-1 w-8">
                    <div className="h-0.5 bg-slate-200 rounded" />
                    <div className="h-0.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-0.5 bg-slate-200 rounded" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Bukti pembayaran belum dikirim</p>
              </div>
            </div>
          </div>

          {nextSchedule && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Jadwal Berikutnya</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{nextSchedule.label}</p>
                  <p className="text-xs text-slate-400">Jatuh tempo {formatDate(nextSchedule.dueDate)}</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{formatIDR(nextSchedule.amount)}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={isSaving} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium transition-colors">
              Tutup
            </button>
            <button
              onClick={handleReject}
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <XCircle size={15} />
              Tolak
            </button>
            <button
              onClick={handleVerify}
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-sm"
            >
              <CheckCircle2 size={15} />
              {isSaving ? "Memproses..." : "Verifikasi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
