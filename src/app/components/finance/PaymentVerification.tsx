import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Upload, Eye,
  AlertTriangle, X, Banknote
} from 'lucide-react';
import { payments, formatIDR, formatDate, type Payment, type PaymentStatus } from './mockData';
import { useFinanceData } from './useFinanceData';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  PENDING: { label: 'Menunggu Verifikasi', color: 'bg-amber-500 text-white border-transparent shadow-sm border-amber-200', icon: Clock },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-green-600 text-white border-transparent shadow-sm border-green-200', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', color: 'bg-red-600 text-white border-transparent shadow-sm border-red-200', icon: XCircle },
};

function PaymentDetailModal({ payment, onClose, onVerify, onReject }: {
  payment: Payment;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(payment.id, rejectReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-md">
          <div>
            <h2 className="text-slate-900 text-base">Detail Pembayaran</h2>
            <p className="text-xs text-slate-400 mt-0.5">{payment.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {payment.status !== 'PENDING' && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_CONFIG[payment.status].color}`}>
                {STATUS_CONFIG[payment.status].label}
              </span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pelanggan</p>
              <p className="text-sm font-semibold text-slate-800">{payment.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Jumlah Pembayaran</p>
              <p className="text-sm font-bold text-red-700">{formatIDR(payment.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Tanggal Bayar</p>
              <p className="text-sm text-slate-700">{formatDate(payment.paymentDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Metode</p>
              <p className="text-sm text-slate-700">{payment.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Bank</p>
              <p className="text-sm text-slate-700">{payment.bankName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Ref. Bank</p>
              <p className="text-sm text-slate-700 font-mono text-xs">{payment.bankRef}</p>
            </div>
          </div>

          {/* Proof Upload Area */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Bukti Pembayaran</p>
            {payment.proofAvailable ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Simulated receipt */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex flex-col items-center gap-2 border-b border-slate-100">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-md flex flex-col items-center justify-center gap-2 border border-slate-200">
                    <Banknote size={24} className="text-red-500" />
                    <div className="space-y-1 w-8">
                      <div className="h-0.5 bg-slate-200 rounded" />
                      <div className="h-0.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-0.5 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">bukti_transfer_{payment.bankRef}.pdf</p>
                </div>
                <div className="flex gap-2 p-3 bg-white">
                  <button className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg py-2 text-xs font-medium transition-colors">
                    <Eye size={13} /> Lihat Bukti
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-2 text-xs font-medium transition-colors">
                    <Upload size={13} /> Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Upload size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Bukti pembayaran tidak tersedia</p>
              </div>
            )}
          </div>

          {payment.notes && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Catatan dari Pelanggan</p>
              <p className="text-xs text-red-600">{payment.notes}</p>
            </div>
          )}

          {/* Rejection Reason (existing) */}
          {payment.status === 'REJECTED' && payment.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Alasan Penolakan</p>
              <p className="text-xs text-red-600">{payment.rejectionReason}</p>
            </div>
          )}

          {/* Verified info */}
          {payment.status === 'VERIFIED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">Terverifikasi oleh {payment.verifiedBy}</p>
                <p className="text-xs text-green-600 mt-0.5">{payment.verifiedAt}</p>
              </div>
            </div>
          )}

          {/* Actions for PENDING */}
          {payment.status === 'PENDING' && !rejectMode && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { onVerify(payment.id); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-sm"
              >
                <CheckCircle2 size={15} />
                Verifikasi
              </button>
              <button
                onClick={() => setRejectMode(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                <XCircle size={15} />
                Tolak
              </button>
            </div>
          )}

          {/* Rejection form */}
          {rejectMode && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-red-700">Alasan Penolakan</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Jelaskan alasan penolakan (wajib diisi)..."
                className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300/30 focus:border-red-400 transition-all bg-red-50/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                  Konfirmasi Penolakan
                </button>
                <button
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  className="px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PaymentVerification() {
  const { payments: financePayments, isUsingBackend } = useFinanceData();
  const [paymentData, setPaymentData] = useState(payments);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    setPaymentData(financePayments);
  }, [financePayments]);

  const handleVerify = (id: string) => {
    setPaymentData(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'VERIFIED' as PaymentStatus, verifiedBy: 'Ahmad Fauzi', verifiedAt: new Date().toLocaleString('id-ID') } : p
    ));
  };

  const handleReject = (id: string, reason: string) => {
    setPaymentData(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'REJECTED' as PaymentStatus, rejectionReason: reason } : p
    ));
  };

  const filtered = filterStatus === 'ALL' ? paymentData : paymentData.filter(p => p.status === filterStatus);
  const pendingCount = paymentData.filter(p => p.status === 'PENDING').length;
  const verifiedCount = paymentData.filter(p => p.status === 'VERIFIED').length;
  const rejectedCount = paymentData.filter(p => p.status === 'REJECTED').length;
  const pendingAmount = paymentData.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Verifikasi Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Periksa dan verifikasi bukti pembayaran dari pelanggan
            {isUsingBackend ? ' - tersambung backend' : ' - mode data demo'}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">{pendingCount} pembayaran menunggu</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Menunggu Verifikasi', value: pendingCount, sub: formatIDR(pendingAmount), color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Terverifikasi', value: verifiedCount, sub: 'bulan ini', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Ditolak', value: rejectedCount, sub: 'perlu tindak lanjut', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: 'Total Diterima', value: formatIDR(paymentData.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + p.amount, 0)), sub: 'terverifikasi', color: 'text-red-700', bg: 'bg-red-50 border-red-100', wide: true },
        ].map(s => (
          <div key={s.label} className={`bg-white border rounded-xl px-4 py-3 shadow-sm ${s.bg.split(' ')[1]}`}>
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              filterStatus === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s === 'ALL' ? 'Semua' : STATUS_CONFIG[s].label}
            {s === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Payment Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-md">
            <ShieldCheck size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Tidak ada data pembayaran</p>
          </div>
        ) : filtered.map(payment => {
          const cfg = STATUS_CONFIG[payment.status];
          const Icon = cfg.icon;
          return (
            <div key={payment.id} className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${
              payment.status === 'PENDING' ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      payment.status === 'PENDING' ? 'bg-amber-100' : payment.status === 'VERIFIED' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Banknote size={18} className={payment.status === 'PENDING' ? 'text-amber-600' : payment.status === 'VERIFIED' ? 'text-green-600' : 'text-red-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{payment.customerName}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                          <Icon size={10} />{cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{payment.invoiceNumber} · {payment.bankName} · {payment.bankRef}</p>
                      {payment.notes && <p className="text-xs text-slate-500 mt-1 italic">"{payment.notes}"</p>}
                      {payment.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">Ditolak: {payment.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900 text-base">{formatIDR(payment.amount)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(payment.paymentDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedPayment(payment)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <Eye size={13} />
                    Detail & Bukti
                  </button>
                  {payment.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleVerify(payment.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        Verifikasi
                      </button>
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <XCircle size={13} />
                        Tolak
                      </button>
                    </>
                  )}
                  {payment.verifiedBy && (
                    <span className="text-xs text-slate-400 ml-auto">
                      Diverifikasi: {payment.verifiedBy} · {payment.verifiedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onVerify={handleVerify}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
