import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, TrendingUp, FileText,
  BarChart3, PieChart as PieIcon, Pencil, Check
} from 'lucide-react';
import {
  formatIDR, type Invoice
} from './mockData';
import { useFinanceData } from './useFinanceData';

const PIE_COLORS = ['#16a34a', '#d97706', '#dc2626', '#C8102E'];

const formatIDRShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)}Jt`;
  return `Rp ${(v / 1_000).toFixed(0)}K`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0D1B2A] border border-slate-700 rounded-lg px-4 py-3 shadow-xl text-xs text-white">
        <p className="font-semibold mb-2 text-slate-300">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{typeof p.value === 'number' ? formatIDRShort(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TABS = [
  { id: 'revenue', label: 'Pendapatan', icon: TrendingUp },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'customer', label: 'Pelanggan', icon: BarChart3 },
];

function buildMonthlyTableData(invoices: Invoice[]) {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const byMonth = new Map<string, { month: string; invoiced: number; collected: number; outstanding: number; invoiceCount: number }>();

  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const row = byMonth.get(key) ?? {
      month: `${monthNames[date.getMonth()] ?? invoice.issueDate.slice(5, 7)} ${date.getFullYear()}`,
      invoiced: 0,
      collected: 0,
      outstanding: 0,
      invoiceCount: 0,
    };

    row.invoiced += invoice.amount;
    row.collected += invoice.paidAmount;
    row.outstanding += Math.max(0, invoice.amount - invoice.paidAmount);
    row.invoiceCount += 1;
    byMonth.set(key, row);
  });

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row)
    .slice(-6);
}

function buildTopCustomersData(invoices: Invoice[]) {
  const byCustomer = new Map<string, number>();
  invoices.forEach(invoice => {
    byCustomer.set(invoice.customerName, (byCustomer.get(invoice.customerName) ?? 0) + invoice.paidAmount);
  });

  return [...byCustomer.entries()]
    .map(([name, revenue]) => ({
      name: name.replace(/^PT\.?\s+/i, '').replace(/^CV\.?\s+/i, '').replace(/^UD\.?\s+/i, ''),
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function FinanceReports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange, setDateRange] = useState('6M');
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const { invoices, monthlyRevenueData, invoiceStatusData, monthlyTarget, updateMonthlyTarget } = useFinanceData();
  const [targetInput, setTargetInput] = useState(formatIDR(monthlyTarget));

  const monthlyTableData = useMemo(() => buildMonthlyTableData(invoices), [invoices]);
  const topCustomersData = useMemo(() => buildTopCustomersData(invoices), [invoices]);
  const totalInvoiced = monthlyTableData.reduce((s, m) => s + m.invoiced, 0);
  const totalCollected = monthlyTableData.reduce((s, m) => s + m.collected, 0);
  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl text-slate-900">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analisis kinerja keuangan PT Pratama Jaya Tekindo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {['1M', '3M', '6M', '1Y'].map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  dateRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={14} />
            <span className="hidden sm:inline">Export Laporan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Ditagihkan', value: formatIDRShort(totalInvoiced), sub: '6 bulan', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total Terkumpul', value: formatIDRShort(totalCollected), sub: 'sudah diterima', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Collection Rate', value: `${collectionRate}%`, sub: 'performa penagihan', icon: PieIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Rata-rata/Bulan', value: formatIDRShort(totalCollected / Math.max(1, monthlyTableData.length)), sub: '6 bulan terakhir', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">{k.label}</p>
              <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon size={13} className={k.color} />
              </div>
            </div>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-red-600 border-red-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Revenue vs Invoiced */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Pendapatan vs Ditagihkan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Perbandingan bulanan</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="invGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8102E" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatIDRShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="invoiced" name="Ditagihkan" stroke="#C8102E" strokeWidth={2} fill="url(#invGrad2)" dot={false} />
                  <Area type="monotone" dataKey="revenue" name="Terkumpul" stroke="#16a34a" strokeWidth={2.5} fill="url(#colGrad)" dot={{ r: 3, fill: '#16a34a' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm group">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Perbandingan Target vs Realisasi</h3>
                  {isEditingTarget ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={targetInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setTargetInput(formatIDR(parseInt(raw || '0', 10)));
                        }}
                        className="text-xs font-semibold text-slate-900 border-b border-slate-300 focus:border-red-600 focus:outline-none bg-transparent p-0 m-0 w-32"
                        autoFocus
                        onBlur={() => {
                          const val = parseInt(targetInput.replace(/\D/g, ''), 10) || 0;
                          updateMonthlyTarget(val);
                          setIsEditingTarget(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt(targetInput.replace(/\D/g, ''), 10) || 0;
                            updateMonthlyTarget(val);
                            setIsEditingTarget(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">Target bulanan {formatIDRShort(monthlyTarget)}</p>
                      <button 
                        onClick={() => {
                          setTargetInput(formatIDR(monthlyTarget));
                          setIsEditingTarget(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyRevenueData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatIDRShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="revenue" name="Realisasi" fill="#C8102E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Rekap Bulanan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Bulan', 'Ditagihkan', 'Terkumpul', 'Outstanding', 'Jml Invoice', 'Collection Rate'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {monthlyTableData.map((row, i) => {
                    const rate = ((row.collected / row.invoiced) * 100).toFixed(1);
                    const rateNum = parseFloat(rate);
                    return (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{row.month}</td>
                        <td className="px-5 py-3.5 text-slate-600">{formatIDR(row.invoiced)}</td>
                        <td className="px-5 py-3.5 font-semibold text-green-700">{formatIDR(row.collected)}</td>
                        <td className="px-5 py-3.5 text-amber-600">{formatIDR(row.outstanding)}</td>
                        <td className="px-5 py-3.5 text-slate-600">{row.invoiceCount} invoice</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-16">
                              <div
                                className={`h-1.5 rounded-full ${rateNum >= 90 ? 'bg-green-500' : rateNum >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, rateNum)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${rateNum >= 90 ? 'text-green-600' : rateNum >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-800 text-xs uppercase">Total</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{formatIDR(totalInvoiced)}</td>
                    <td className="px-5 py-3 font-bold text-green-700">{formatIDR(totalCollected)}</td>
                    <td className="px-5 py-3 font-bold text-amber-600">{formatIDR(totalInvoiced - totalCollected)}</td>
                    <td className="px-5 py-3 font-bold text-slate-700">{monthlyTableData.reduce((s, m) => s + m.invoiceCount, 0)}</td>
                    <td className="px-5 py-3 font-bold text-red-700">{collectionRate}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Tab */}
      {activeTab === 'invoice' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Distribusi Status Invoice</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                      {invoiceStatusData.map((entry, i) => <Cell key={`status-cell-${entry.name}`} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [v + ' invoice', n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {invoiceStatusData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PIE_COLORS[i] }} />
                        {d.name}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">{d.value}</span>
                        <span className="text-xs text-slate-400 ml-1">({invoices.length > 0 ? ((d.value / invoices.length) * 100).toFixed(0) : '0'}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice by Amount */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Nilai Invoice per Status</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { status: 'Lunas', value: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0) },
                  { status: 'Menunggu', value: invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0) },
                  { status: 'Jth Tempo', value: invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0) },
                  { status: 'Sebagian', value: invoices.filter(i => i.status === 'PARTIAL').reduce((s, i) => s + i.amount, 0) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatIDRShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nilai" radius={[4, 4, 0, 0]}>
                    {['#16a34a', '#d97706', '#dc2626', '#C8102E'].map((c, i) => (
                      <Cell key={`bar-cell-${c}`} fill={c} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Detail Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Daftar Invoice Aktif</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Invoice', 'Pelanggan', 'Total', 'Terbayar', 'Sisa', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-red-600 text-xs">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-slate-700">{inv.customerName}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{formatIDR(inv.amount)}</td>
                      <td className="px-5 py-3 text-green-600">{formatIDR(inv.paidAmount)}</td>
                      <td className="px-5 py-3 text-amber-600">{formatIDR(inv.amount - inv.paidAmount)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          inv.status === 'PAID' ? 'bg-green-600 text-white border-transparent shadow-sm' :
                          inv.status === 'OVERDUE' ? 'bg-red-600 text-white border-transparent shadow-sm' :
                          inv.status === 'PARTIAL' ? 'bg-red-600 text-white border-transparent shadow-sm' :
                          'bg-amber-500 text-white border-transparent shadow-sm'
                        }`}>
                          {inv.status === 'PAID' ? 'Lunas' : inv.status === 'OVERDUE' ? 'Jth Tempo' : inv.status === 'PARTIAL' ? 'Sebagian' : 'Menunggu'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Tab */}
      {activeTab === 'customer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top Customer Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm xl:col-span-2">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Pendapatan per Pelanggan</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCustomersData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatIDRShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Pendapatan" fill="#C8102E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Detail Pelanggan</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Pelanggan', 'Total Invoice', 'Total Pendapatan', 'Terakhir Transaksi', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topCustomersData
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((c, i) => (
                    <tr key={c.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-500 text-white border-transparent shadow-sm' : i === 1 ? 'bg-slate-600 text-white border-transparent shadow-sm' : 'bg-orange-50 text-orange-600'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{invoices.filter(inv => inv.customerName.includes(c.name.split(' ')[1] ?? c.name)).length} invoice</td>
                      <td className="px-5 py-3.5 font-semibold text-red-700">{formatIDR(c.revenue)}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">Nov 2024</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-600 text-white border-transparent shadow-sm">Aktif</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
