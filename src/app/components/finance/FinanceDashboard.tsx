import { useNavigate } from 'react-router';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  FileText, Clock, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpRight, FilePlus, ShieldCheck, BarChart3, ChevronRight,
  AlertCircle, Wallet, RefreshCw
} from 'lucide-react';
import {
  invoices, payments, transactions, monthlyRevenueData, invoiceStatusData,
  formatIDR, formatDate, formatDateShort
} from './mockData';

const KPI_CARDS = [
  {
    title: 'Total Invoice',
    value: '247',
    sub: '8 invoice bulan ini',
    icon: FileText,
    trend: '+12%',
    up: true,
    color: 'bg-blue-50 text-blue-700',
    iconBg: 'bg-blue-100',
    border: 'border-blue-100',
  },
  {
    title: 'Menunggu Pembayaran',
    value: formatIDR(799200000),
    sub: '4 invoice outstanding',
    icon: Clock,
    trend: '+5%',
    up: false,
    color: 'bg-amber-50 text-amber-700',
    iconBg: 'bg-amber-100',
    border: 'border-amber-100',
  },
  {
    title: 'Order Lunas',
    value: '189',
    sub: '3 lunas bulan ini',
    icon: CheckCircle2,
    trend: '+18%',
    up: true,
    color: 'bg-green-50 text-green-700',
    iconBg: 'bg-green-100',
    border: 'border-green-100',
  },
  {
    title: 'Pendapatan Bulan Ini',
    value: formatIDR(601850000),
    sub: 'Target: Rp 1,0 M',
    icon: Wallet,
    trend: '-40%',
    up: false,
    color: 'bg-purple-50 text-purple-700',
    iconBg: 'bg-purple-100',
    border: 'border-purple-100',
  },
];

const QUICK_ACTIONS = [
  { label: 'Buat Invoice', icon: FilePlus, to: '/erp/finance/create-invoice', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { label: 'Verifikasi Pembayaran', icon: ShieldCheck, to: '/erp/finance/payment-verification', color: 'bg-amber-500 hover:bg-amber-600 text-white', badge: '2' },
  { label: 'Lihat Laporan', icon: BarChart3, to: '/erp/finance/reports', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
  { label: 'Daftar Invoice', icon: FileText, to: '/erp/finance/invoices', color: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200' },
];

const statusColors: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
};
const statusLabel: Record<string, string> = {
  PAID: 'Lunas', PENDING: 'Menunggu', OVERDUE: 'Jatuh Tempo', PARTIAL: 'Sebagian',
};

const PIE_COLORS = ['#16a34a', '#d97706', '#dc2626', '#2563eb'];

const formatIDRShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)}Jt`;
  return formatIDR(v);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0D1B2A] border border-slate-700 rounded-lg px-4 py-3 shadow-xl text-xs text-white">
        <p className="font-semibold mb-2 text-slate-300">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{formatIDRShort(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function FinanceDashboard() {
  const navigate = useNavigate();
  const recentInvoices = [...invoices].slice(0, 5);
  const pendingPayments = payments.filter(p => p.status === 'PENDING');

  return (
    <div className="p-4 lg:p-6 space-y-6 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Dashboard Keuangan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan keuangan PT Pratama Jaya Tekindo · November 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-md px-3 py-1.5 transition-colors">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/erp/finance/create-invoice')}
            className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
          >
            <FilePlus size={14} />
            <span>Buat Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div key={card.title} className={`bg-white rounded-xl border ${card.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-slate-500">{card.title}</p>
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={17} className={card.color.split(' ')[1]} />
              </div>
            </div>
            <p className="text-xl font-semibold text-slate-900 truncate">{card.value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">{card.sub}</p>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-green-600' : 'text-red-500'}`}>
                {card.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-slate-800 text-sm font-semibold">Tren Pendapatan & Invoice</h3>
              <p className="text-xs text-slate-400 mt-0.5">6 bulan terakhir</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-blue-500 rounded-full inline-block" /> Pendapatan</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-slate-300 rounded-full inline-block" /> Ditagihkan</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatIDRShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={75} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="invoiced" name="Ditagihkan" stroke="#cbd5e1" strokeWidth={2} fill="url(#invGrad)" dot={false} />
              <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#2563eb" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-slate-800 text-sm font-semibold">Status Invoice</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribusi bulan ini</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {invoiceStatusData.map((entry, i) => (
                  <Cell key={`pie-cell-${entry.name}`} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v + ' invoice', n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {invoiceStatusData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-slate-600">{d.name}</span>
                </span>
                <span className="font-medium text-slate-700">{d.value} invoice</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 text-sm font-semibold">Invoice Terbaru</h3>
            <button onClick={() => navigate('/erp/finance/invoices')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Lihat Semua <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate('/erp/finance/invoices')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 truncate">{inv.invoiceNumber}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>
                      {statusLabel[inv.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{inv.customerName} · {inv.soNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{formatIDR(inv.amount)}</p>
                  <p className="text-xs text-slate-400">Jatuh tempo: {formatDate(inv.dueDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Pending Alert */}
        <div className="space-y-4">
          {/* Pending Payments Alert */}
          {pendingPayments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Perlu Perhatian</p>
                  <p className="text-xs text-amber-600 mt-0.5">{pendingPayments.length} pembayaran menunggu verifikasi</p>
                  <button onClick={() => navigate('/erp/finance/payment-verification')} className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 underline">
                    Verifikasi Sekarang →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-slate-800 text-sm font-semibold mb-3">Aksi Cepat</h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${a.color} shadow-sm`}
                >
                  <span className="flex items-center gap-2">
                    <a.icon size={15} />
                    {a.label}
                  </span>
                  <span className="flex items-center gap-1">
                    {a.badge && <span className="bg-white/30 text-xs rounded-full px-1.5">{a.badge}</span>}
                    <ArrowUpRight size={13} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Finance Summary */}
          <div className="bg-[#0D1B2A] rounded-xl p-5 text-white shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Total Piutang Aktif</p>
            <p className="text-2xl font-bold text-white">{formatIDR(1392450000)}</p>
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-500">Overdue</p>
                <p className="text-sm font-semibold text-red-400">{formatIDR(343200000)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Collection Rate</p>
                <p className="text-sm font-semibold text-green-400">74.2%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
