import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FileText, Clock, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpRight, FilePlus, ShieldCheck, BarChart3, ChevronRight,
  AlertCircle, Wallet, RefreshCw, Users, CheckSquare
} from 'lucide-react';
import {
  formatIDR, formatDate
} from './mockData';
import { useFinanceData } from './useFinanceData';
import { useApp } from '../context/AppContext';

const KPI_CARDS = [
  {
    title: 'Total Invoice',
    value: '247',
    sub: '8 invoice bulan ini',
    icon: FileText,
    trend: '+12%',
    up: true,
    color: 'bg-red-600 text-white border-transparent shadow-sm',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    border: 'border-red-100',
  },
  {
    title: 'Menunggu Pembayaran',
    value: formatIDR(799200000),
    sub: '4 invoice outstanding',
    icon: Clock,
    trend: '+5%',
    up: false,
    color: 'bg-amber-500 text-white border-transparent shadow-sm',
    iconColor: 'text-amber-600',
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
    color: 'bg-green-600 text-white border-transparent shadow-sm',
    iconColor: 'text-green-600',
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
    color: 'bg-purple-600 text-white border-transparent shadow-sm',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    border: 'border-purple-100',
  },
];

const QUICK_ACTIONS = [
  { label: 'Buat Invoice', icon: FilePlus, to: '/erp/finance/create-invoice', color: 'bg-red-600 hover:bg-red-700 text-white' },
  { label: 'Verifikasi Pembayaran', icon: ShieldCheck, to: '/erp/finance/payment-verification', color: 'bg-amber-500 hover:bg-amber-600 text-white', badge: '2' },
  { label: 'Tagihan Supplier', icon: CheckSquare, to: '/erp/finance/approval-po', color: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200' },
  { label: 'Lihat Laporan', icon: BarChart3, to: '/erp/finance/reports', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
  { label: 'Daftar Invoice', icon: FileText, to: '/erp/finance/invoices', color: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200' },
];

const statusColors: Record<string, string> = {
  PAID: '#16A34A',
  PENDING: '#F59E0B',
  OVERDUE: '#DC2626',
  PARTIAL: '#3B82F6',
};
const statusLabel: Record<string, string> = {
  PAID: 'Lunas', PENDING: 'Menunggu', OVERDUE: 'Jatuh Tempo', PARTIAL: 'Sebagian',
};

const PIE_COLORS = ['#16a34a', '#d97706', '#dc2626', '#C8102E'];

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
  const {
    invoices,
    payments,
    isLoading,
    isUsingBackend,
    refresh,
    monthlyRevenueData,
    invoiceStatusData,
  } = useFinanceData();
  const { salesOrders, purchasingRequests } = useApp();
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'CUSTOMER'>('GLOBAL');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');

  const recentInvoices = [...invoices].slice(0, 5);
  const pendingVerifications = payments.filter(payment => payment.status === 'PENDING');
  const pendingPricingOrders = salesOrders.filter(so => so.status === 'Waiting Pricing');
  const chartRevenueData = monthlyRevenueData;
  const chartStatusData = invoiceStatusData;
  const quickActions = QUICK_ACTIONS.map(action => action.label === 'Verifikasi Pembayaran'
    ? { ...action, badge: pendingVerifications.length > 0 ? String(pendingVerifications.length) : undefined }
    : action);

  const uniqueCustomers = useMemo(() => Array.from(new Set(invoices.map(t => t.customerName))), [invoices]);

  const customerAnalytics = useMemo(() => {
    const acc: Record<string, { total: number, paid: number, remaining: number }> = {};
    invoices.forEach(inv => {
      // Filter if a specific customer is selected in the Customer Tab
      if (activeTab === 'CUSTOMER' && selectedCustomer !== 'ALL' && inv.customerName !== selectedCustomer) return;

      if (!acc[inv.customerName]) acc[inv.customerName] = { total: 0, paid: 0, remaining: 0 };
      acc[inv.customerName].total += inv.amount;
      acc[inv.customerName].paid += inv.paidAmount;
      acc[inv.customerName].remaining += (inv.amount - inv.paidAmount);
    });
    return Object.entries(acc).map(([name, data]) => ({
      name: name.replace('PT ', '').replace('CV ', '').replace('UD ', ''), // Shorten name
      fullName: name,
      ...data
    })).sort((a, b) => b.total - a.total);
  }, [activeTab, selectedCustomer, invoices]);

  const financeSummary = useMemo(() => {
    const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const totalSupplierBills = purchasingRequests.reduce((sum, request) => sum + (request.estimatedPrice || 0), 0);
    const paidSupplierBills = purchasingRequests
      .filter(request => request.status === 'Selesai')
      .reduce((sum, request) => sum + (request.estimatedPrice || 0), 0);
    const overdueAmount = invoices
      .filter(invoice => invoice.status === 'OVERDUE')
      .reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
    const openingBalance = 250_000_000;

    return {
      outstandingAmount: Math.max(0, totalBilled - totalPaid),
      overdueAmount,
      supplierPayable: Math.max(0, totalSupplierBills - paidSupplierBills),
      currentBalance: openingBalance + totalPaid - paidSupplierBills,
      openingBalance,
      collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 0,
    };
  }, [invoices, purchasingRequests]);

  const displayKPIs = useMemo(() => {
    const custInvoices = activeTab === 'CUSTOMER' && selectedCustomer !== 'ALL'
      ? invoices.filter(i => i.customerName === selectedCustomer)
      : invoices;
    const totalInv = custInvoices.length;
    const pendingInv = custInvoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
    const paidInv = custInvoices.filter(i => i.status === 'PAID').length;
    const totalRev = custInvoices.reduce((s, i) => s + i.paidAmount, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currInv = custInvoices.filter(i => {
      const d = new Date(i.issueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const prevInv = custInvoices.filter(i => {
      const d = new Date(i.issueDate);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const currTotalInv = currInv.length;
    const prevTotalInv = prevInv.length;
    const invTrend = prevTotalInv === 0 ? 0 : Math.round(((currTotalInv - prevTotalInv) / prevTotalInv) * 100);

    const currPending = currInv.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
    const prevPending = prevInv.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
    const pendingTrend = prevPending === 0 ? 0 : Math.round(((currPending - prevPending) / prevPending) * 100);

    const currPaid = currInv.filter(i => i.status === 'PAID').length;
    const prevPaid = prevInv.filter(i => i.status === 'PAID').length;
    const paidTrend = prevPaid === 0 ? 0 : Math.round(((currPaid - prevPaid) / prevPaid) * 100);

    const currRev = currInv.reduce((s, i) => s + i.paidAmount, 0);
    const prevRev = prevInv.reduce((s, i) => s + i.paidAmount, 0);
    const revTrend = prevRev === 0 ? 0 : Math.round(((currRev - prevRev) / prevRev) * 100);

    return [
      { ...KPI_CARDS[0], value: String(totalInv), sub: activeTab === 'GLOBAL' ? 'Total invoice aktif' : 'Total Invoice Pelanggan', trend: `${invTrend >= 0 ? '+' : ''}${invTrend}%`, up: invTrend >= 0 },
      { ...KPI_CARDS[1], value: formatIDR(pendingInv), sub: activeTab === 'GLOBAL' ? 'Outstanding piutang' : 'Outstanding Piutang Pelanggan', trend: `${pendingTrend >= 0 ? '+' : ''}${pendingTrend}%`, up: pendingTrend <= 0 },
      { ...KPI_CARDS[2], value: String(paidInv), sub: 'Invoice Lunas', trend: `${paidTrend >= 0 ? '+' : ''}${paidTrend}%`, up: paidTrend >= 0 },
      { ...KPI_CARDS[3], value: formatIDR(totalRev), sub: 'Total Telah Dibayar', title: activeTab === 'GLOBAL' ? 'Pendapatan Tercatat' : 'Pendapatan Pelanggan', trend: `${revTrend >= 0 ? '+' : ''}${revTrend}%`, up: revTrend >= 0 },
    ];
  }, [activeTab, selectedCustomer, invoices]);

  return (
    <div className="p-4 lg:p-6 space-y-6 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Dashboard Keuangan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ringkasan keuangan PT Pratama Jaya Tekindo · {isUsingBackend ? 'data backend' : 'backend belum tersedia'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-md px-3 py-1.5 transition-colors shadow-md disabled:opacity-60"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/erp/finance/create-invoice')}
            className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
          >
            <FilePlus size={14} />
            <span>Buat Invoice</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-6 border-b border-slate-200 mt-4">
        <button
          onClick={() => { setActiveTab('GLOBAL'); setSelectedCustomer('ALL'); }}
          className={`py-2 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'GLOBAL' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={16} />
          Ringkasan Global
        </button>
        <button
          onClick={() => setActiveTab('CUSTOMER')}
          className={`py-2 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'CUSTOMER' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} />
          Analitik Pelanggan
        </button>
      </div>

      {/* Customer Filter Dropdown (Only visible in CUSTOMER tab) */}
      {activeTab === 'CUSTOMER' && (
        <div className="flex items-center gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
          <span className="text-sm font-semibold text-slate-700">Pilih Pelanggan:</span>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-red-500 block w-64 p-2 shadow-sm font-medium"
          >
            <option value="ALL">Semua Pelanggan</option>
            {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {displayKPIs.map((card, idx) => (
          <div key={`${card.title}-${idx}`} className={`bg-white rounded-xl border ${card.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-slate-500">{card.title}</p>
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={17} className={card.iconColor} />
              </div>
            </div>
            <p className="text-xl font-semibold text-slate-900 truncate">{card.value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">{card.sub}</p>
              {activeTab === 'GLOBAL' && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-green-600' : 'text-red-500'}`}>
                  {card.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {card.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Saldo Awal', value: financeSummary.openingBalance, sub: 'Baseline kas presentasi' },
          { label: 'Saldo Saat Ini', value: financeSummary.currentBalance, sub: 'Saldo awal + masuk - keluar' },
          { label: 'Hutang Supplier', value: financeSummary.supplierPayable, sub: 'Tagihan supplier belum lunas' },
          { label: 'Piutang Aktif', value: financeSummary.outstandingAmount, sub: 'Invoice customer belum lunas' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{formatIDR(item.value)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      {activeTab === 'GLOBAL' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-slate-800 text-sm font-semibold">Tren Pendapatan & Invoice</h3>
                <p className="text-xs text-slate-400 mt-0.5">6 bulan terakhir</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-red-500 rounded-full inline-block" /> Pendapatan</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-slate-300 rounded-full inline-block" /> Ditagihkan</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8102E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
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
                <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#C8102E" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: '#C8102E' }} activeDot={{ r: 5 }} />
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
                <Pie data={chartStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                  {chartStatusData.map((entry, i) => (
                    <Cell key={`pie-cell-${entry.name}`} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v + ' invoice', n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {chartStatusData.map((d, i) => (
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
      )}

      {/* Customer Analytics Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-slate-800 text-sm font-semibold">Grafik Tagihan & Pembayaran</h3>
            <p className="text-xs text-slate-400 mt-0.5">{selectedCustomer === 'ALL' ? 'Total Tagihan, Terbayar, dan Sisa Piutang per Pelanggan' : `Detail untuk Pelanggan: ${selectedCustomer}`}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm inline-block" /> Total Tagihan</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Terbayar</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-sm inline-block" /> Sisa Piutang</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={customerAnalytics} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={selectedCustomer === 'ALL' ? 'name' : 'fullName'} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatIDRShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="total" name="Total Tagihan" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="paid" name="Terbayar" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="remaining" name="Sisa Piutang" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      {activeTab === 'GLOBAL' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Invoices */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-slate-800 text-sm font-semibold">Invoice Terbaru</h3>
              <button onClick={() => navigate('/erp/finance/invoices')} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                Lihat Semua <ChevronRight size={13} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate('/erp/finance/invoices')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 truncate">{inv.invoiceNumber}</span>
                      <span 
                        className="text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide"
                        style={{ backgroundColor: statusColors[inv.status] || '#64748B', color: '#FFFFFF', border: 'none' }}
                      >
                        {statusLabel[inv.status] ?? inv.status}
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
            {/* Pending Pricing Alert */}
            {pendingPricingOrders.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-800">Tugas Estimasi Harga</p>
                    <p className="text-xs text-blue-600 mt-0.5">{pendingPricingOrders.length} Sales Order menunggu estimasi harga</p>
                    <button onClick={() => navigate('/erp/finance/costing')} className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900 underline">
                      Buka Costing & Pricing →
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pending Payments Alert */}
            {pendingVerifications.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Perlu Perhatian</p>
                    <p className="text-xs text-amber-600 mt-0.5">{pendingVerifications.length} pembayaran menunggu verifikasi</p>
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
                {quickActions.map(a => (
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
                      {a.badge && <span className="bg-white/30 text-xs rounded-full px-1.5 shadow-md">{a.badge}</span>}
                      <ArrowUpRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Finance Summary */}
            <div className="bg-[#0D1B2A] rounded-xl p-5 text-white shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Total Piutang Aktif</p>
              <p className="text-2xl font-bold text-white">{formatIDR(financeSummary.outstandingAmount)}</p>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500">Overdue</p>
                  <p className="text-sm font-semibold text-red-400">{formatIDR(financeSummary.overdueAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Collection Rate</p>
                  <p className="text-sm font-semibold text-green-400">{financeSummary.collectionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
