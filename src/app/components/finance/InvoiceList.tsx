import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Download, Printer, Eye, FilePlus,
  ChevronLeft, ChevronRight, X, AlertCircle, CheckCircle2,
  Clock, AlertTriangle
} from 'lucide-react';
import { formatIDR, formatDate, type Invoice, type InvoiceStatus } from './mockData';
import { useFinanceData } from './useFinanceData';
import { financeApi } from '../../services/financeApi';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: 'Lunas', PENDING: 'Menunggu', OVERDUE: 'Jatuh Tempo', PARTIAL: 'Sebagian',
};
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: '#16A34A',
  PENDING: '#F59E0B',
  OVERDUE: '#DC2626',
  PARTIAL: '#DC2626',
};
const STATUS_ICONS: Record<InvoiceStatus, React.ComponentType<any>> = {
  PAID: CheckCircle2, PENDING: Clock, OVERDUE: AlertTriangle, PARTIAL: AlertCircle,
};

const PAGE_SIZE = 6;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function InvoiceDetailModal({ invoice, onClose, payments, onNavigateToVerification }: { invoice: Invoice; onClose: () => void; payments?: any[]; onNavigateToVerification: () => void }) {
  const pendingPayment = payments?.find(p => p.invoiceId === invoice.id && p.status === 'PENDING');
  
  const subtotal = invoice.items.reduce((s, i) => s + i.total, 0);
  const exportInvoice = () => {
    downloadCsv(`${invoice.invoiceNumber}.csv`, [
      ['Invoice', 'SO', 'Customer', 'Amount', 'Status', 'Due Date'],
      [invoice.invoiceNumber, invoice.soNumber, invoice.customerName, String(invoice.amount), STATUS_LABELS[invoice.status], invoice.dueDate],
      [],
      ['Description', 'Qty', 'Unit', 'Unit Price', 'Total'],
      ...invoice.items.map(item => [
        item.description,
        String(item.quantity),
        item.unit,
        String(item.unitPrice),
        String(item.total),
      ]),
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col transform transition-all border border-white/20">
        {/* OVERDUE Watermark */}
        {invoice.status === 'OVERDUE' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-10 pointer-events-none z-0">
            <span className="text-8xl font-black text-red-600 uppercase tracking-widest border-8 border-red-600 px-8 py-4 rounded-3xl">OVERDUE</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-3.5 flex items-center justify-between rounded-t-[24px] z-20">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{invoice.invoiceNumber}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">SO: {invoice.soNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">{formatDate(invoice.issueDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${STATUS_COLORS[invoice.status]}`} style={{ color: STATUS_COLORS[invoice.status], backgroundColor: `${STATUS_COLORS[invoice.status]}15`, borderColor: `${STATUS_COLORS[invoice.status]}30` }}>
              {STATUS_LABELS[invoice.status]}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full p-2 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-[#FAFAFA]">
          {/* Customer Info */}
          <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-2xl p-4 text-white shadow-lg shadow-red-900/20 border border-red-800/50 relative overflow-hidden">
            {/* Subtle overlay accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
              <div>
                <p className="text-[10px] text-red-200/80 font-semibold uppercase tracking-wider mb-0.5">Pelanggan</p>
                <p className="text-sm font-semibold">{invoice.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] text-red-200/80 font-semibold uppercase tracking-wider mb-0.5">NPWP</p>
                <p className="text-sm text-red-100 font-medium">—</p>
              </div>
              <div>
                <p className="text-[10px] text-red-200/80 font-semibold uppercase tracking-wider mb-0.5">Tgl Terbit</p>
                <p className="text-sm text-red-50 font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-red-200/80 font-semibold uppercase tracking-wider mb-0.5">Jatuh Tempo</p>
                <p className={`text-sm font-bold ${invoice.status === 'OVERDUE' ? 'text-amber-300' : 'text-white'}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Detail Item Pembelian</h3>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Satuan</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Harga Satuan</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100/50">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-2 text-slate-700 font-medium">{item.description}</td>
                      <td className="px-4 py-2 text-center text-slate-600 bg-slate-50/30 group-hover:bg-transparent">{item.quantity}</td>
                      <td className="px-4 py-2 text-center text-slate-500">{item.unit}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{formatIDR(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800 bg-slate-50/30 group-hover:bg-transparent">{formatIDR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700 font-medium">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PPN</span>
                  <span className="text-slate-700 font-medium">{formatIDR(invoice.ppn)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2 mt-1">
                  <span className="text-slate-800">Total Akhir</span>
                  <span className="text-red-600">{formatIDR(invoice.amount)}</span>
                </div>
                {invoice.paidAmount > 0 && (
                  <div className="border-t border-dashed border-slate-200 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>Sudah Dibayar</span>
                      <span>-{formatIDR(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg">
                      <span>Sisa Tagihan</span>
                      <span>{formatIDR(invoice.amount - invoice.paidAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Schedules */}
          {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Jadwal Pembayaran</p>
              <div className="space-y-2">
                {invoice.paymentSchedules.map((schedule, idx) => (
                  <div key={schedule.id || idx} className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-md p-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{schedule.label} ({schedule.percentage}%)</span>
                      <span className="text-slate-500">Jatuh Tempo: {formatDate(schedule.dueDate)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-700">{formatIDR(schedule.amount)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${schedule.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {schedule.isPaid ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : invoice.notes ? (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Catatan</p>
              <p className="text-xs text-red-600">{invoice.notes}</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-slate-200/60 relative z-10">
            {pendingPayment && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToVerification();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold rounded-xl py-2 transition-all shadow-lg shadow-amber-500/20"
              >
                <CheckCircle2 size={16} />
                Verifikasi Pembayaran
              </button>
            )}
            <button
              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/v1/finance/invoices/${invoice.id}/pdf?inline=true`, '_blank')}
              className={`flex-1 flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-xl py-2 transition-all shadow-lg ${invoice.status === 'OVERDUE' ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20 hover:from-red-700 hover:to-rose-700' : 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-600/20 hover:from-red-700 hover:to-red-800'}`}
            >
              <Printer size={16} />
              {invoice.status === 'OVERDUE' ? 'Cetak Penagihan' : 'Print Invoice'}
            </button>
            <button
              onClick={exportInvoice}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl py-2 transition-all shadow-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, payments, isLoading, isUsingBackend, refresh } = useFinanceData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const invoiceData = invoices;

  const filtered = useMemo(() => {
    return invoiceData.filter(inv => {
      const matchSearch = !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.soNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoiceData, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: invoiceData.length,
    paid: invoiceData.filter(i => i.status === 'PAID').length,
    pending: invoiceData.filter(i => i.status === 'PENDING').length,
    overdue: invoiceData.filter(i => i.status === 'OVERDUE').length,
  };

  const exportInvoices = () => {
    downloadCsv('invoices.csv', [
      ['Invoice', 'SO', 'Customer', 'Amount', 'Paid', 'Due Date', 'Status'],
      ...filtered.map(invoice => [
        invoice.invoiceNumber,
        invoice.soNumber,
        invoice.customerName,
        String(invoice.amount),
        String(invoice.paidAmount),
        invoice.dueDate,
        STATUS_LABELS[invoice.status],
      ]),
    ]);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Daftar Invoice</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola semua invoice proyek manufaktur {isUsingBackend ? '· data backend' : '· backend belum tersedia'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 transition-colors shadow-sm disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/erp/finance/create-invoice')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors shadow-sm"
          >
            <FilePlus size={15} />
            Buat Invoice Baru
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoice', value: stats.total, color: 'text-slate-700' },
          { label: 'Lunas', value: stats.paid, color: 'text-green-600' },
          { label: 'Menunggu', value: stats.pending, color: 'text-amber-600' },
          { label: 'Jatuh Tempo', value: stats.overdue, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari no. invoice, pelanggan, atau no. SO..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-400 transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:flex-shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
              {(['ALL', 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                    statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s === 'ALL' ? 'Semua' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportInvoices}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  ['No. Invoice', 'w-[16%]'],
                  ['No. SO', 'w-[14%]'],
                  ['Pelanggan', 'w-[24%]'],
                  ['Jumlah', 'w-[15%]'],
                  ['Jatuh Tempo', 'w-[13%]'],
                  ['Status', 'w-[13%]'],
                  ['', 'w-[5%]'],
                ].map(([h, width]) => (
                  <th key={h} className={`text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${width}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Tidak ada data invoice ditemukan</td></tr>
              ) : paginated.map(inv => {
                const Icon = STATUS_ICONS[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-red-50/30 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                    <td className="px-5 py-4">
                      <span className="font-medium text-red-600 hover:text-red-700">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{inv.soNumber}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 truncate">{inv.customerName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{formatIDR(inv.amount)}</p>
                      {inv.paidAmount > 0 && inv.status !== 'PAID' && (
                        <p className="text-xs text-green-600">Terbayar: {formatIDR(inv.paidAmount)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm tracking-wide uppercase"
                        style={{ backgroundColor: STATUS_COLORS[inv.status] || '#64748B', color: '#FFFFFF', border: 'none' }}
                      >
                        <Icon size={12} className="text-white" />
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-all"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-slate-100">
          {paginated.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">Tidak ada data</p>
          ) : paginated.map(inv => {
            const Icon = STATUS_ICONS[inv.status];
            return (
              <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-red-600 text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{inv.soNumber} · {inv.customerName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status]}`}>
                    <Icon size={10} /> {STATUS_LABELS[inv.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{formatIDR(inv.amount)}</span>
                  <span className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-500' : 'text-slate-400'}`}>
                    Jth: {formatDate(inv.dueDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} invoice
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                  page === p ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          payments={payments} 
          onNavigateToVerification={() => navigate('/erp/finance/payment-verification')} 
        />
      )}
    </div>
  );
}
