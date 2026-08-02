import { useState } from 'react';
import { CheckCircle2, XCircle, Upload, Eye, X, Banknote } from 'lucide-react';
import { formatIDR, formatDate, type Payment } from '../mockData';
import { getPaymentTypeBadge } from '../paymentUtils';

const STATUS_CONFIG: Record<any, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu Verifikasi', color: 'bg-amber-500 text-white border-transparent shadow-sm border-amber-200' },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-green-600 text-white border-transparent shadow-sm border-green-200' },
  REJECTED: { label: 'Ditolak', color: 'bg-red-600 text-white border-transparent shadow-sm border-red-200' },
};

export function PaymentDetailModal({ payment, onClose, onVerify, onReject }: {
  payment: Payment;
  onClose: () => void;
  onVerify: (id: string) => void | Promise<void>;
  onReject: (id: string, reason: string) => void | Promise<void>;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    void onReject(payment.id, rejectReason);
    onClose();
  };

  const getFullProofUrl = () => {
    if (!payment.proofFileUrl) return '';
    let proofPath = payment.proofFileUrl;
    
    let finalUrl = proofPath;
    if (proofPath.startsWith('http')) {
      try {
        const urlObj = new URL(proofPath);
        urlObj.pathname = urlObj.pathname.split('/').map((p: string) => encodeURIComponent(p)).join('/');
        finalUrl = urlObj.toString();
      } catch (err) {
        console.warn("Failed to parse proof URL", err);
      }
    } else {
      if (!proofPath.startsWith('/')) proofPath = '/' + proofPath;
      finalUrl = proofPath.split('/').map((p: string) => encodeURIComponent(p)).join('/');
    }
    
    return finalUrl;
  };

  const openProof = () => {
    if (!payment.proofFileUrl) return;
    try {
      window.open(getFullProofUrl(), '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open proof', err);
    }
  };

  const downloadProof = () => {
    if (!payment.proofFileUrl) return;
    try {
      const link = document.createElement('a');
      link.href = getFullProofUrl();
      link.download = payment.proofFileName || `bukti_transfer_${payment.bankRef}.pdf`;
      link.click();
    } catch (err) {
      console.error('Failed to download proof', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-md">
          <div>
            <h2 className="text-slate-900 text-base">Detail Pembayaran</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {payment.invoiceNumber}
              {payment.soNumber ? ` \u00b7 SO: ${payment.soNumber}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_CONFIG[payment.status].color}`}>
              {STATUS_CONFIG[payment.status].label}
            </span>
            {getPaymentTypeBadge(payment.notes)}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
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

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Bukti Pembayaran</p>
            {payment.proofAvailable ? (
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
                  <p className="text-xs text-slate-500 font-medium mt-1">{payment.proofFileName || `bukti_transfer_${payment.bankRef}.pdf`}</p>
                </div>
                <div className="flex gap-2 p-3 bg-white">
                  <button
                    onClick={openProof}
                    disabled={!payment.proofFileUrl}
                    className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2 text-xs font-medium transition-colors"
                  >
                    <Eye size={13} /> Lihat Bukti
                  </button>
                  <button
                    onClick={downloadProof}
                    disabled={!payment.proofFileUrl}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2 text-xs font-medium transition-colors"
                  >
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

          {payment.status === 'PENDING' && payment.submittedBy && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800">Dikirim oleh {payment.submittedBy}</p>
              {payment.submittedAt && <p className="text-xs text-amber-700 mt-0.5">{new Date(payment.submittedAt).toLocaleString('id-ID')}</p>}
            </div>
          )}

          {payment.status === 'REJECTED' && payment.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Alasan Penolakan</p>
              <p className="text-xs text-red-600">{payment.rejectionReason}</p>
            </div>
          )}

          {payment.status === 'VERIFIED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">Terverifikasi oleh {payment.verifiedBy}</p>
                <p className="text-xs text-green-600 mt-0.5">{payment.verifiedAt}</p>
              </div>
            </div>
          )}

          {payment.status === 'PENDING' && !rejectMode && !verifyMode && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setVerifyMode(true)}
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

          {verifyMode && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-green-700">Konfirmasi Verifikasi</p>
              <p className="text-sm text-slate-600">Apakah Anda yakin ingin memverifikasi pembayaran ini? Pastikan dana sudah masuk ke rekening.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { void onVerify(payment.id); onClose(); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                  Ya, Verifikasi
                </button>
                <button
                  onClick={() => setVerifyMode(false)}
                  className="px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

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
