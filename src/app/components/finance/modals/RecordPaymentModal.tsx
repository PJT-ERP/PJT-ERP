import { useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { formatIDR, type Invoice } from '../mockData';
import { financeApi } from '../../../services/financeApi';
import {
  todayInputValue, getRemainingAmount, getNextSchedule, getDefaultPaymentAmount
} from '../paymentUtils';

export function RecordPaymentModal({ invoice, onClose, onRecorded }: {
  invoice: Invoice;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const remainingAmount = getRemainingAmount(invoice);
  const nextSchedule = getNextSchedule(invoice);
  const [amount, setAmount] = useState(String(getDefaultPaymentAmount(invoice)));
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [notes, setNotes] = useState(nextSchedule ? `${nextSchedule.label} ${invoice.invoiceNumber}` : `Pembayaran ${invoice.invoiceNumber}`);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const submitLockRef = useRef(false);
  const numericAmount = Number(amount);
  const canSubmit = paymentDate && numericAmount > 0 && numericAmount <= remainingAmount && !isSaving;

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitLockRef.current) return;

    try {
      submitLockRef.current = true;
      setIsSaving(true);
      setError('');
      await financeApi.recordPayment(invoice.id, {
        paymentDate,
        amount: numericAmount,
        notes: notes.trim() || null,
      });
      await onRecorded();
      onClose();
    } catch (err) {
      console.warn('Failed to record payment.', err);
      setError('Gagal mencatat pembayaran ke backend.');
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submitPayment} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 text-base font-semibold">Catat Pembayaran</h2>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber} · {invoice.soNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pelanggan</p>
              <p className="text-sm font-semibold text-slate-800">{invoice.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Sisa Tagihan</p>
              <p className="text-sm font-bold text-red-700">{formatIDR(remainingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Terbayar</p>
              <p className="text-sm text-green-700 font-semibold">{formatIDR(invoice.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Jadwal Berikutnya</p>
              <p className="text-sm text-slate-700">{nextSchedule ? `${nextSchedule.label} · ${formatIDR(nextSchedule.amount)}` : 'Sisa tagihan'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Jumlah Bayar</span>
              <input
                type="number"
                min="1"
                max={remainingAmount}
                value={amount}
                onChange={event => setAmount(event.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal Bayar</span>
              <input
                type="date"
                value={paymentDate}
                onChange={event => setPaymentDate(event.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Catatan / Referensi</span>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={3}
              placeholder="Contoh: DP 50%, transfer BCA, ref bank..."
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </label>

          {numericAmount > remainingAmount && (
            <p className="text-xs text-red-600">Jumlah bayar tidak boleh lebih besar dari sisa tagihan.</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium transition-colors">
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {isSaving ? 'Menyimpan...' : 'Verifikasi Bayar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
