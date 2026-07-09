import React, { useState, useMemo, Fragment } from "react";
import { Users, Activity, CalendarClock, AlertTriangle, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { useApp } from "../../components/context/AppContext";

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return d.getFullYear() * 100 + d.getMonth();
}

function monthLabel(year: number, month: number) {
  return `${MONTHS[month]} ${year}`;
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

const CUSTOMER_COLORS = [
  '#C8102E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316',
];

// Custom bar chart
function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-[160px] pt-4">
      {data.map(d => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {d.value > 0 && (
              <span className="text-[10px] text-slate-500 leading-none">{d.value}</span>
            )}
            <div className="w-full flex items-end" style={{ height: '120px' }}>
              <div
                className="w-full rounded-t transition-all"
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`, backgroundColor: '#3B82F6' }}
              />
            </div>
            <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Custom line chart for Revenue
function MiniLineChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 400;
  const H = 140;
  const PAD = { top: 16, right: 8, bottom: 28, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;

  const px = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * innerW;
  const py = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const polyline = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const area = [
    `${px(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${px(i)},${py(d.value)}`),
    `${px(n - 1)},${PAD.top + innerH}`,
  ].join(' ');

  const yTicks = [...new Set([0, Math.ceil(max / 2), max])];

  const formatTick = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '160px' }}>
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <line
          key={`grid-${i}`}
          x1={PAD.left} y1={py(v)}
          x2={PAD.left + innerW} y2={py(v)}
          stroke="#E2E8F0" strokeWidth={1}
        />
      ))}
      {/* Y axis labels */}
      {yTicks.map((v, i) => (
        <text key={`ylabel-${i}`} x={PAD.left - 4} y={py(v) + 4} textAnchor="end" fontSize={9} fill="#94A3B8">
          {formatTick(v)}
        </text>
      ))}
      {/* Area fill */}
      <polygon points={area} fill="#10B981" fillOpacity={0.08} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#10B981" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots + X labels */}
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={px(i)} cy={py(d.value)} r={3.5} fill="#10B981" />
          <text x={px(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#94A3B8">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CustomerAnalyticsPage() {
  const { salesOrders, customers } = useApp();
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'completed' | 'all'>('all');

  const validOrders = useMemo(() =>
    viewMode === 'completed'
      ? salesOrders.filter(so => so.status === 'Completed')
      : salesOrders,
    [salesOrders, viewMode]
  );

  const customerStats = useMemo(() => {
    return customers.map((c, idx) => {
      const orders = validOrders
        .filter(so => so.customerId === c.code || (so as any).customerCode === c.code)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((acc, so) => acc + (so.estimatedAmount ?? 0), 0);

      const intervals: number[] = [];
      for (let i = 1; i < orders.length; i++) {
        intervals.push(daysBetween(orders[i - 1].createdAt, orders[i].createdAt));
      }
      const avgInterval = intervals.length > 0
        ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
        : null;

      let predictedDate: Date | null = null;
      let predictedMonth: string | null = null;
      let daysUntilNext: number | null = null;
      let isOverdue = false;

      if (avgInterval !== null && orders.length > 0) {
        const lastOrder = orders[orders.length - 1];
        predictedDate = addDays(lastOrder.createdAt, avgInterval);
        predictedMonth = monthLabel(predictedDate.getFullYear(), predictedDate.getMonth());
        daysUntilNext = Math.round((predictedDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilNext < 0;
      }

      const monthlyMap: Record<number, number> = {};
      const monthlyRevenueMap: Record<number, number> = {};
      orders.forEach(so => {
        const key = monthKey(so.createdAt);
        monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
        monthlyRevenueMap[key] = (monthlyRevenueMap[key] ?? 0) + (so.estimatedAmount ?? 0);
      });

      return {
        customer: c,
        orders,
        totalOrders,
        totalRevenue,
        avgInterval,
        predictedDate,
        predictedMonth,
        daysUntilNext,
        isOverdue,
        monthlyMap,
        monthlyRevenueMap,
        color: CUSTOMER_COLORS[idx % CUSTOMER_COLORS.length],
        lastOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
      };
    }).filter(s => viewMode === 'all' || s.totalOrders > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue by default
  }, [customers, validOrders, viewMode]);

  const visibleMonths = useMemo(() => {
    const months: { year: number; month: number; key: number; label: string; isFuture: boolean }[] = [];
    for (let m = 0; m <= 8; m++) {
      const month = m % 12;
      const year = CURRENT_YEAR + Math.floor(m / 12);
      const key = year * 100 + month;
      const isFuture = key > TODAY.getFullYear() * 100 + TODAY.getMonth();
      months.push({ year, month, key, label: MONTHS[month], isFuture });
    }
    return months;
  }, []);

  const historyMonths = useMemo(() => visibleMonths.filter(m => !m.isFuture), [visibleMonths]);

  const barData = useMemo(() => {
    return historyMonths.map(m => {
      const total = customerStats.reduce((acc, cs) => acc + (cs.monthlyMap[m.key] ?? 0), 0);
      return { label: m.label, value: total };
    });
  }, [historyMonths, customerStats]);

  const lineData = useMemo(() => {
    return historyMonths.map(m => {
      if (selectedCustomer === 'all') {
        const total = customerStats.reduce((acc, cs) => acc + (cs.monthlyRevenueMap[m.key] ?? 0), 0);
        return { label: m.label, value: total };
      }
      const cs = customerStats.find(c => c.customer.code === selectedCustomer);
      return { label: m.label, value: cs ? (cs.monthlyRevenueMap[m.key] ?? 0) : 0 };
    });
  }, [historyMonths, customerStats, selectedCustomer]);

  const activeCustomers = customerStats.filter(c => c.totalOrders > 0).length;
  const totalSystemRevenue = customerStats.reduce((acc, cs) => acc + cs.totalRevenue, 0);
  
  const avgReorderDays = customerStats.filter(c => c.avgInterval !== null).length > 0
    ? Math.round(customerStats.filter(c => c.avgInterval !== null).reduce((a, c) => a + c.avgInterval!, 0) / customerStats.filter(c => c.avgInterval !== null).length)
    : 0;
  
  const overdueCount = customerStats.filter(c => c.isOverdue).length;
  const upcomingCount = customerStats.filter(c => c.daysUntilNext !== null && c.daysUntilNext >= 0 && c.daysUntilNext <= 30).length;

  return (
    <div className="w-full" style={{ padding: "20px 24px" }}>
      <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-slate-800">Analitik Customer</h1>
          <p className="text-sm text-slate-500">Ringkasan performa penjualan dan status follow-up pelanggan</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Semua Pesanan
          </button>
          <button
            onClick={() => setViewMode('completed')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Selesai Saja
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Total Customer Aktif</p>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users size={17} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 truncate">{activeCustomers} <span className="text-sm font-normal text-slate-500">/ {customers.length}</span></p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Dari total pelanggan terdaftar</p>
          </div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Total Pendapatan</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={17} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-900 truncate">{formatCurrency(totalSystemRevenue)}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Berdasarkan data yang ditampilkan</p>
          </div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Rata-rata Reorder</p>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <CalendarClock size={17} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 truncate">{avgReorderDays} <span className="text-sm font-normal text-slate-500">hari</span></p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Jarak historis antar pesanan</p>
          </div>
        </div>
        <div className={`bg-white rounded-md border p-5 shadow-sm hover:shadow-md transition-shadow ${overdueCount > 0 ? 'border-red-300' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Perlu Follow-up</p>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <AlertTriangle size={17} className={overdueCount > 0 ? 'text-red-500' : 'text-green-500'} />
            </div>
          </div>
          <p className={`text-2xl font-semibold truncate ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount} <span className="text-sm font-normal text-slate-500">Customer</span></p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">{upcomingCount} jadwal order bulan ini</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-1">Volume Order per Bulan</h3>
          <p className="text-xs text-slate-400 mb-2">Total pesanan (kuantitas SO) yang masuk</p>
          <MiniBarChart data={barData} />
        </div>

        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-800">Tren Pendapatan</h3>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20">
              <option value="all">Semua Customer</option>
              {customerStats.map(cs => (
                <option key={cs.customer.code} value={cs.customer.code}>
                  {cs.customer.name.split(' ').slice(0, 3).join(' ')}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 mb-2">Nilai pendapatan per bulan (IDR)</p>
          <MiniLineChart data={lineData} />
        </div>
      </div>

      {/* Clean CRM Style Table */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50">
          <h3 className="text-slate-800">Daftar Pelanggan & Status Riwayat</h3>
          <p className="text-xs text-slate-400 mt-0.5">Identifikasi pelanggan yang paling berharga dan pelanggan yang berisiko pasif</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Total Pesanan</th>
                <th className="px-5 py-3 font-medium">Total Pendapatan</th>
                <th className="px-5 py-3 font-medium">Order Terakhir</th>
                <th className="px-5 py-3 font-medium">Status Reorder</th>
                <th className="px-5 py-3 font-medium">Prediksi Order</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerStats.map(cs => {
                const isExpanded = expandedCustomer === cs.customer.code;
                const predStatus = cs.avgInterval === null
                  ? 'insufficient'
                  : cs.isOverdue
                    ? 'overdue'
                    : cs.daysUntilNext! <= 30
                      ? 'upcoming'
                      : 'normal';

                return (
                  <React.Fragment key={cs.customer.code}>
                    <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setExpandedCustomer(isExpanded ? null : cs.customer.code)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0" style={{ backgroundColor: cs.color }}>
                            {cs.customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{cs.customer.name}</p>
                            <p className="text-xs text-slate-500">{cs.customer.contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{cs.totalOrders} <span className="text-xs text-slate-400">Order</span></td>
                      <td className="px-5 py-3 font-medium text-slate-700">{formatCurrency(cs.totalRevenue)}</td>
                      <td className="px-5 py-3 text-slate-600">{cs.lastOrderDate ?? '—'}</td>
                      <td className="px-5 py-3">
                        {predStatus === 'insufficient' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <Activity size={12} /> Data Kurang
                          </span>
                        ) : predStatus === 'overdue' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle size={12} /> Perlu Follow-up
                          </span>
                        ) : predStatus === 'upcoming' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <CalendarClock size={12} /> Mendekati Jadwal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Activity size={12} /> Aktif & Aman
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {cs.predictedMonth ? `${cs.predictedMonth} (Jeda: ${cs.avgInterval}h)` : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-5 py-4 border-b border-slate-100">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Riwayat Transaksi Pelanggan</h4>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-slate-600">ID SO</th>
                                  <th className="px-4 py-2 font-medium text-slate-600">Deskripsi</th>
                                  <th className="px-4 py-2 font-medium text-slate-600">Status</th>
                                  <th className="px-4 py-2 font-medium text-slate-600">Tanggal Transaksi</th>
                                  <th className="px-4 py-2 font-medium text-slate-600 text-right">Nilai Estimasi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {cs.orders.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-4 text-center text-slate-400 italic">Belum ada riwayat pesanan</td>
                                  </tr>
                                ) : (
                                  cs.orders.map(so => (
                                    <tr key={so.id} className="hover:bg-slate-50">
                                      <td className="px-4 py-2.5 font-mono text-slate-500">{so.soNumber || so.id}</td>
                                      <td className="px-4 py-2.5 truncate max-w-[250px]">{so.description || '-'}</td>
                                      <td className="px-4 py-2.5">
                                        <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600">
                                          {so.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">{so.createdAt}</td>
                                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(so.estimatedAmount ?? 0)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
