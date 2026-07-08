import { useEffect, useState } from 'react';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Upload, Eye,
  AlertTriangle, X, Banknote, PlusCircle
} from 'lucide-react';
import { formatIDR, formatDate, type Invoice, type Payment, type PaymentStatus } from './mockData';
import { financeApi } from '../../services/financeApi';
import { useFinanceData } from './useFinanceData';
import { todayInputValue, getRemainingAmount, hasRecordedPayment } from './paymentUtils';
import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { PaymentDetailModal } from './modals/PaymentDetailModal';
import { InvoiceVerificationDetailModal } from './modals/InvoiceVerificationDetailModal';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  PENDING: { label: 'Menunggu Verifikasi', color: 'bg-amber-500 text-white border-transparent shadow-sm border-amber-200', icon: Clock },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-green-600 text-white border-transparent shadow-sm border-green-200', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', color: 'bg-red-600 text-white border-transparent shadow-sm border-red-200', icon: XCircle },
};

export function PaymentVerification() {
  const { payments: financePayments, invoices, refresh, isLoading } = useFinanceData();
  const [paymentData, setPaymentData] = useState<Payment[]>([]);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'ALL' | 'OVERDUE'>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [hiddenInvoiceIds, setHiddenInvoiceIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setPaymentData(financePayments);
  }, [financePayments]);

  const handleVerify = async (id: string) => {
    try {
      await financeApi.verifyPaymentProof(id);
      await refresh();
    } catch (err) {
      console.warn('Failed to verify payment proof.', err);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await financeApi.rejectPaymentProof(id, reason);
      await refresh();
    } catch (err) {
      console.warn('Failed to reject payment proof.', err);
    }
  };

  const handleVerifyInvoice = async () => {
    await refresh();
    setSelectedInvoiceDetail(null);
  };

  const handleRejectInvoice = () => {
    setSelectedInvoiceDetail(null);
  };

  const filteredPayments = filterStatus === 'ALL'
    ? paymentData
    : paymentData.filter(payment => payment.status === filterStatus);

  const pendingPayments = paymentData.filter(payment => payment.status === 'PENDING');
  const todayStr = todayInputValue();

  const unpaidInvoices = invoices
    .filter(invoice => {
      if (hiddenInvoiceIds.has(invoice.id)) return false;
      const rem = getRemainingAmount(invoice);
      if (rem <= 0) return false;
      if (hasRecordedPayment(invoice)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });

  const markInvoiceHidden = (id: string) => {
    setHiddenInvoiceIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const unpaidMenunggu = unpaidInvoices.filter(inv => !inv.dueDate || inv.dueDate >= todayStr);
  const unpaidOverdue = unpaidInvoices.filter(inv => inv.dueDate && inv.dueDate < todayStr);

  const displayedUnpaidInvoices = filterStatus === 'ALL'
    ? unpaidInvoices
    : filterStatus === 'PENDING'
      ? unpaidMenunggu
      : filterStatus === 'OVERDUE'
        ? unpaidOverdue
        : [];

  const displayedPendingPayments = (filterStatus === 'ALL' || filterStatus === 'PENDING')
    ? pendingPayments
    : [];

  const historyPayments = filteredPayments.filter(payment => payment.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-red-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verifikasi Pembayaran</h1>
              <p className="text-sm text-slate-500 mt-0.5">Tinjau dan verifikasi bukti pembayaran pelanggan</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Pembayaran', value: paymentData.length, sub: 'Semua transaksi' },
            { label: 'Menunggu Verifikasi', value: pendingPayments.length, sub: `${pendingPayments.length} bukti baru` },
            { label: 'Terverifikasi', value: paymentData.filter(p => p.status === 'VERIFIED').length, sub: 'Selesai divalidasi' },
            { label: 'Ditolak', value: paymentData.filter(p => p.status === 'REJECTED').length, sub: 'Bukti tidak valid' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-red-200 transition-all duration-200"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-50/50 to-transparent rounded-tr-2xl" />
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'PENDING', label: 'Menunggu' },
            { key: 'OVERDUE', label: 'Overdue' },
            { key: 'VERIFIED', label: 'Terverifikasi' },
            { key: 'REJECTED', label: 'Ditolak' },
          ].map((tab) => {
            const count = tab.key === 'ALL' 
              ? paymentData.length + unpaidInvoices.length
              : tab.key === 'PENDING'
                ? paymentData.filter(p => p.status === 'PENDING').length + unpaidMenunggu.length
                : tab.key === 'OVERDUE'
                  ? unpaidOverdue.length
                  : paymentData.filter(p => p.status === tab.key).length;
                
            const isActive = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key as PaymentStatus | 'ALL' | 'OVERDUE')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                  isActive
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                }`}
              >
                {tab.label}
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-white text-red-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pending Payments Section */}
        {displayedPendingPayments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold text-slate-900">Pembayaran Baru</h2>
                <span className="text-sm text-slate-400">({displayedPendingPayments.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedPendingPayments.map(payment => (
                <div
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-red-300 hover:shadow-md p-5 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{payment.customerName}</p>
                      <p className="text-sm text-slate-500">{formatIDR(payment.amount)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      <Clock size={12} /> Menunggu
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Invoice</span>
                      <span className="font-medium text-slate-700">{payment.invoiceNumber}{payment.soNumber ? ` (${payment.soNumber})` : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal Bayar</span>
                      <span className="font-medium text-slate-700">{formatDate(payment.paymentDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank</span>
                      <span className="font-medium text-slate-700">{payment.bankName}</span>
                    </div>
                    {payment.notes && (
                      <p className="text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">{payment.notes}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleVerify(payment.id); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg py-2.5 text-xs font-bold transition-colors"
                    >
                      <CheckCircle2 size={13} /> Verifikasi
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPayment(payment); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg py-2.5 text-xs font-bold transition-colors"
                    >
                      <XCircle size={13} /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid Invoices Section */}
        {displayedUnpaidInvoices.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold text-slate-900">Invoice Belum Dibayar</h2>
                <span className="text-sm text-slate-400">({displayedUnpaidInvoices.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedUnpaidInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-red-300 hover:shadow-md p-5 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{invoice.customerName}</p>
                      <p className="text-sm text-slate-500">{invoice.invoiceNumber}{invoice.soNumber ? ` • ${invoice.soNumber}` : ''}</p>
                    </div>
                    {invoice.dueDate && invoice.dueDate < todayStr ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle size={12} /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock size={12} /> Menunggu
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Jatuh Tempo</span>
                      <span className="font-medium text-red-600">{formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span className="font-bold text-red-700">{formatIDR(invoice.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sisa</span>
                      <span className="font-bold text-red-700">{formatIDR(getRemainingAmount(invoice))}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedInvoiceDetail(invoice); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg py-2.5 text-xs font-bold transition-colors"
                    >
                      <Eye size={13} /> Detail
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); markInvoiceHidden(invoice.id); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg py-2.5 text-xs font-bold transition-colors"
                    >
                      Sembunyikan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Payments Section */}
        {historyPayments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <h2 className="text-lg font-bold text-slate-900">Riwayat Pembayaran</h2>
                <span className="text-sm text-slate-400">({historyPayments.length})</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
              {historyPayments.map(payment => {
                const statusConfig = STATUS_CONFIG[payment.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <div
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Banknote size={16} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{payment.customerName}</p>
                        <p className="text-xs text-slate-400 truncate">{payment.invoiceNumber}{payment.soNumber ? ` • ${payment.soNumber}` : ''} • {formatDate(payment.paymentDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-900">{formatIDR(payment.amount)}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.color}`}>
                        <StatusIcon size={12} /> {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {paymentData.length === 0 && unpaidInvoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-1">Belum ada data pembayaran</h3>
            <p className="text-sm text-slate-400">Data pembayaran akan muncul saat pelanggan mengupload bukti transfer.</p>
          </div>
        )}

        {/* Modals */}
        {selectedPayment && selectedPayment.status === 'PENDING' && (
          <PaymentDetailModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onVerify={handleVerify}
            onReject={handleReject}
          />
        )}
        {selectedPayment && selectedPayment.status !== 'PENDING' && (
          <PaymentDetailModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onVerify={handleVerify}
            onReject={handleReject}
          />
        )}
        {selectedInvoice && (
          <RecordPaymentModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onRecorded={refresh}
          />
        )}
        {selectedInvoiceDetail && (
          <InvoiceVerificationDetailModal
            invoice={selectedInvoiceDetail}
            onClose={() => setSelectedInvoiceDetail(null)}
            onVerify={handleVerifyInvoice}
            onReject={handleRejectInvoice}
          />
        )}
      </div>
    </div>
  );
}
