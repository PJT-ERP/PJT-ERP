import {
  useState,
  useMemo } from 'react';
import {
  Search,
  FileText,
  CreditCard,
  MinusCircle,
  PlusCircle,
  Download,
  LayoutList,
  Clock3,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw
} from 'lucide-react';
import { transactions,
  formatIDR,
  formatDate,
  type Transaction,
  type TransactionType
} from './mockData';

const TYPE_CONFIG: Record<TransactionType, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  INVOICE: { label: 'Invoice', icon: FileText, color: 'text-red-600', bg: 'bg-red-100' },
  PAYMENT: { label: 'Pembayaran', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
  CREDIT_NOTE: { label: 'Kredit Nota', icon: MinusCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  DEBIT_NOTE: { label: 'Debit Nota', icon: PlusCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#16A34A',
  OUTSTANDING: '#F59E0B',
  PENDING_VERIFICATION: '#DC2626',
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Selesai',
  OUTSTANDING: 'Outstanding',
  PENDING_VERIFICATION: 'Verifikasi',
};

export function TransactionHistory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const uniqueCustomers = useMemo(() => Array.from(new Set(transactions.map(t => t.customerName))), []);

  const filtered = useMemo(() => {
    const result = transactions.filter(t => {
      const matchSearch = !search ||
        t.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.customerName.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchCustomer = customerFilter === 'ALL' || t.customerName === customerFilter;
      return matchSearch && matchType && matchCustomer;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [search, typeFilter, customerFilter, sortOrder]);

  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const currentBalance = transactions[transactions.length - 1]?.balance ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Log lengkap semua aktivitas keuangan</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors shadow-md">
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-green-600 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-green-100">Total Penerimaan</p>
            <ArrowDownLeft size={16} className="text-green-200" />
          </div>
          <p className="text-xl font-bold">{formatIDR(totalCredit)}</p>
          <p className="text-xs text-green-200 mt-1">{transactions.filter(t => t.credit > 0).length} transaksi kredit</p>
        </div>
        <div className="bg-slate-700 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300">Total Tagihan</p>
            <ArrowUpRight size={16} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold">{formatIDR(totalDebit)}</p>
          <p className="text-xs text-slate-400 mt-1">{transactions.filter(t => t.debit > 0).length} transaksi debit</p>
        </div>
        <div className="bg-[#0D1B2A] rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">Saldo Piutang</p>
            <RefreshCw size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold">{formatIDR(currentBalance)}</p>
          <p className="text-xs text-slate-500 mt-1">per hari ini</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari referensi, deskripsi, atau pelanggan..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-red-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-red-500 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Pelanggan</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['ALL', 'PAYMENT', 'INVOICE', 'CREDIT_NOTE'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                    typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t === 'ALL' ? 'Semua' : TYPE_CONFIG[t]?.label ?? t}
                </button>
              ))}
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 transition-colors ${viewMode === 'timeline' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
              >
                <Clock3 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Tanggal', 'Referensi', 'Deskripsi', 'Pelanggan', 'Debit', 'Kredit', 'Saldo', 'Status'].map(h => (
                    <th 
                      key={h} 
                      className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${h === 'Tanggal' ? 'cursor-pointer hover:bg-slate-100 transition-colors group' : ''}`}
                      onClick={() => h === 'Tanggal' && setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                    >
                      <div className="flex items-center gap-1">
                        {h}
                        {h === 'Tanggal' && (
                          <span className="text-[10px] text-slate-400 group-hover:text-red-500">
                            {sortOrder === 'ASC' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Tidak ada transaksi ditemukan</td></tr>
                ) : filtered.map(trx => {
                  const cfg = TYPE_CONFIG[trx.type];
                  return (
                    <tr key={trx.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(trx.date)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                            <cfg.icon size={12} className={cfg.color} />
                          </div>
                          <span className="font-mono text-xs text-slate-600">{trx.referenceNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 max-w-[200px] truncate">{trx.description}</p>
                        <p className="text-xs text-slate-400">{trx.category}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[120px] truncate">{trx.customerName}</td>
                      <td className="px-4 py-3.5 text-right">
                        {trx.debit > 0 ? (
                          <span className="font-medium text-slate-700">{formatIDR(trx.debit)}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {trx.credit > 0 ? (
                          <span className="font-semibold text-green-600">{formatIDR(trx.credit)}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-medium text-slate-800 text-xs">{formatIDR(trx.balance)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span 
                          className="text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide"
                          style={{ backgroundColor: STATUS_COLORS[trx.status] || '#64748B', color: '#FFFFFF', border: 'none' }}
                        >
                          {STATUS_LABELS[trx.status] ?? trx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="p-5">
            {filtered.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">Tidak ada transaksi</p>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-4">
                  {filtered.map((trx, idx) => {
                    const cfg = TYPE_CONFIG[trx.type];
                    return (
                      <div key={trx.id} className="flex gap-4 relative">
                        {/* Node */}
                        <div className={`w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center flex-shrink-0 z-10 ${cfg.bg}`}>
                          <cfg.icon size={15} className={cfg.color} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 hover:bg-white transition-colors hover:shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-800 text-sm">{trx.description}</span>
                                <span 
                                  className="text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide"
                                  style={{ backgroundColor: STATUS_COLORS[trx.status] || '#64748B', color: '#FFFFFF', border: 'none' }}
                                >
                                  {STATUS_LABELS[trx.status] ?? trx.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{trx.referenceNumber} · {trx.customerName}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {trx.credit > 0 ? (
                                <p className="font-bold text-green-600">+{formatIDR(trx.credit)}</p>
                              ) : (
                                <p className="font-bold text-slate-700">{formatIDR(trx.debit)}</p>
                              )}
                              <p className="text-xs text-slate-400 mt-0.5">{formatDate(trx.date)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[11px] text-slate-400">Saldo: {formatIDR(trx.balance)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">{filtered.length} dari {transactions.length} transaksi</p>
          <p className="text-xs text-slate-500">Update terakhir: hari ini, 14:30 WIB</p>
        </div>
      </div>
    </div>
  );
}
