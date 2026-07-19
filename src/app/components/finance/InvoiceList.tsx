import { useNavigate } from 'react-router';
import {
  Search, Download, Eye, FilePlus,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatIDR, formatDate } from './mockData';
import { InvoiceDetailModal } from './components/invoice-list/InvoiceDetailModal';
import { STATUS_LABELS, STATUS_COLORS, STATUS_ICONS, PAGE_SIZE, downloadCsv } from './components/invoice-list/InvoiceListHelpers';
import { useInvoiceList } from './hooks/useInvoiceList';

export function InvoiceList() {
  const navigate = useNavigate();
  const board = useInvoiceList();

  const exportInvoices = () => {
    downloadCsv('invoices.csv', [
      ['Invoice', 'SO', 'Customer', 'Amount', 'Paid', 'Due Date', 'Status'],
      ...board.filtered.map(invoice => [
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
            Kelola semua invoice proyek manufaktur {board.isUsingBackend ? '· data backend' : '· backend belum tersedia'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          { label: 'Total Invoice', value: board.stats.total, color: 'text-slate-700' },
          { label: 'Lunas', value: board.stats.paid, color: 'text-green-600' },
          { label: 'Menunggu', value: board.stats.pending, color: 'text-amber-600' },
          { label: 'Jatuh Tempo', value: board.stats.overdue, color: 'text-red-600' },
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
              value={board.search}
              onChange={e => { board.setSearch(e.target.value); board.setPage(1); }}
              placeholder="Cari no. invoice, pelanggan, atau no. SO..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-400 transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:flex-shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
              {(['ALL', 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { board.setStatusFilter(s); board.setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                    board.statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s === 'ALL' ? 'Semua' : STATUS_LABELS[s]}
                </button>
              ))}
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
              {board.paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Tidak ada data invoice ditemukan</td></tr>
              ) : board.paginated.map(inv => {
                const Icon = STATUS_ICONS[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-red-50/30 transition-colors cursor-pointer" onClick={() => board.setSelectedInvoice(inv)}>
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
                        onClick={e => { e.stopPropagation(); board.setSelectedInvoice(inv); }}
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
          {board.paginated.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm">Tidak ada data</p>
          ) : board.paginated.map(inv => {
            const Icon = STATUS_ICONS[inv.status];
            return (
              <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => board.setSelectedInvoice(inv)}>
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
            Menampilkan {Math.min((board.page - 1) * PAGE_SIZE + 1, board.filtered.length)}–{Math.min(board.page * PAGE_SIZE, board.filtered.length)} dari {board.filtered.length} invoice
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => board.setPage(p => Math.max(1, p - 1))}
              disabled={board.page === 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: board.totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => board.setPage(p)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                  board.page === p ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => board.setPage(p => Math.min(board.totalPages, p + 1))}
              disabled={board.page === board.totalPages}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {board.selectedInvoice && (
        <InvoiceDetailModal
          invoice={board.selectedInvoice}
          onClose={() => board.setSelectedInvoice(null)}
          payments={board.payments}
          onNavigateToVerification={() => navigate('/erp/finance/payment-verification')}
          onRefresh={board.refresh}
        />
      )}
    </div>
  );
}

export default InvoiceList;
