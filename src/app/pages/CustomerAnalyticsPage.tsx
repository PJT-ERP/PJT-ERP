import { useState, useMemo } from "react";
import { Users, TrendingUp, CalendarClock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const TODAY = new Date('2026-06-07');
const CURRENT_YEAR = 2026;

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

const CUSTOMER_COLORS = [
  '#C8102E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316',
];

// Custom bar chart — avoids recharts CategoricalChart SVG key collision bug
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
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`, backgroundColor: '#C8102E' }}
              />
            </div>
            <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Custom line chart — pure SVG, no recharts
function MiniLineChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 400;
  const H = 140;
  const PAD = { top: 16, right: 8, bottom: 28, left: 28 };
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
          {v}
        </text>
      ))}
      {/* Area fill */}
      <polygon points={area} fill="#C8102E" fillOpacity={0.08} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#C8102E" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots + X labels */}
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={px(i)} cy={py(d.value)} r={3.5} fill="#C8102E" />
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

  const validOrders = useMemo(() =>
    salesOrders.filter(so => so.status !== 'Rejected'),
    [salesOrders]
  );

  const customerStats = useMemo(() => {
    return customers.map((c, idx) => {
      const orders = validOrders
        .filter(so => so.customerId === c.code)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const totalOrders = orders.length;
      const totalQty = orders.reduce((acc, so) => acc + so.quantity, 0);

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
      orders.forEach(so => {
        const key = monthKey(so.createdAt);
        monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
      });

      return {
        customer: c,
        orders,
        totalOrders,
        totalQty,
        avgInterval,
        predictedDate,
        predictedMonth,
        daysUntilNext,
        isOverdue,
        monthlyMap,
        color: CUSTOMER_COLORS[idx % CUSTOMER_COLORS.length],
        lastOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
      };
    }).filter(s => s.totalOrders > 0)
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }, [customers, validOrders]);

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
        const total = customerStats.reduce((acc, cs) => acc + (cs.monthlyMap[m.key] ?? 0), 0);
        return { label: m.label, value: total };
      }
      const cs = customerStats.find(c => c.customer.code === selectedCustomer);
      return { label: m.label, value: cs ? (cs.monthlyMap[m.key] ?? 0) : 0 };
    });
  }, [historyMonths, customerStats, selectedCustomer]);

  const getPredictedCell = (cs: typeof customerStats[0], mk: number) => {
    if (!cs.predictedDate) return false;
    const pk = cs.predictedDate.getFullYear() * 100 + cs.predictedDate.getMonth();
    return pk === mk;
  };

  const activeCustomers = customerStats.length;
  const mostFrequent = customerStats[0];
  const avgReorderDays = customerStats.filter(c => c.avgInterval !== null).length > 0
    ? Math.round(customerStats.filter(c => c.avgInterval !== null).reduce((a, c) => a + c.avgInterval!, 0) / customerStats.filter(c => c.avgInterval !== null).length)
    : 0;
  const overdueCount = customerStats.filter(c => c.isOverdue).length;
  const upcomingCount = customerStats.filter(c => c.daysUntilNext !== null && c.daysUntilNext >= 0 && c.daysUntilNext <= 30).length;

  return (
    <div className="w-full" style={{ padding: "20px 24px" }}>
      <div className="mb-6">
        <h1 className="text-slate-800">Analitik Customer</h1>
        <p className="text-sm text-slate-500">Pola pembelian dan prediksi order berikutnya berdasarkan riwayat data</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Customer Aktif</p>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users size={17} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 truncate">{activeCustomers}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Total pelanggan terdaftar</p>
          </div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Customer Teraktif</p>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <TrendingUp size={17} className="text-red-500" />
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-900 truncate">{mostFrequent?.customer.name.split(' ').slice(0, 3).join(' ')}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">{mostFrequent?.totalOrders} order</p>
          </div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Rata-rata Reorder</p>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <CalendarClock size={17} className="text-slate-700" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 truncate">{avgReorderDays} <span className="text-sm font-normal text-slate-500">hari</span></p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Jarak antar pesanan</p>
          </div>
        </div>
        <div className={`bg-white rounded-md border p-5 shadow-sm hover:shadow-md transition-shadow ${overdueCount > 0 ? 'border-slate-300' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-500">Perlu Follow-up</p>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-slate-100' : 'bg-green-50'}`}>
              <AlertTriangle size={17} className={overdueCount > 0 ? 'text-red-500' : 'text-green-500'} />
            </div>
          </div>
          <p className={`text-2xl font-semibold truncate ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">{upcomingCount} dalam 30 hari</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Volume Bar */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-1">Volume Order per Bulan</h3>
          <p className="text-xs text-slate-400 mb-2">Total SO masuk per bulan (Jan–Jun 2026)</p>
          <MiniBarChart data={barData} />
        </div>

        {/* Trend Line */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-800">Tren Pembelian</h3>
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
          <p className="text-xs text-slate-400 mb-2">Jumlah SO masuk tiap bulan</p>
          <MiniLineChart data={lineData} />
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-slate-800">Pola Pembelian Customer</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Intensitas order per bulan — sel <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-dashed border-slate-300 align-middle mx-0.5" /> = prediksi
          </p>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left text-slate-500 pb-2 pr-4 font-normal w-40">Customer</th>
                {visibleMonths.map(m => (
                  <th key={m.key} className={`text-center pb-2 px-1 font-normal ${m.isFuture ? 'text-slate-300' : 'text-slate-500'}`}>
                    {m.label}
                    {m.isFuture && <span className="block text-[9px] text-slate-300">prediksi</span>}
                  </th>
                ))}
                <th className="text-center pb-2 px-2 font-normal text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customerStats.map(cs => (
                <tr key={cs.customer.code} className="hover:bg-slate-50">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cs.color }} />
                      <span className="text-slate-700 truncate max-w-[160px]" title={cs.customer.name}>
                        {cs.customer.name}
                      </span>
                    </div>
                  </td>
                  {visibleMonths.map(m => {
                    const count = cs.monthlyMap[m.key] ?? 0;
                    const isPredicted = m.isFuture && getPredictedCell(cs, m.key);
                    const intensity = count === 0 ? 0 : count === 1 ? 0.3 : count === 2 ? 0.6 : 0.9;

                    if (m.isFuture) {
                      return (
                        <td key={m.key} className="px-1 py-2">
                          <div className={`mx-auto w-8 h-7 rounded flex items-center justify-center text-[10px] ${isPredicted
                            ? 'border-2 border-dashed border-[#C8102E] bg-red-50 text-[#C8102E]'
                            : 'bg-slate-50'
                            }`}>
                            {isPredicted ? '?' : ''}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={m.key} className="px-1 py-2">
                        <div
                          className="mx-auto w-8 h-7 rounded flex items-center justify-center text-[10px]"
                          style={{
                            backgroundColor: count > 0 ? `${cs.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : '#F8FAFC',
                            color: intensity > 0.5 ? 'white' : count > 0 ? cs.color : '#CBD5E1',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    <span className="text-slate-700">{cs.totalOrders}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prediction Table */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50">
          <h3 className="text-slate-800">Prediksi & Riwayat per Customer</h3>
          <p className="text-xs text-slate-400 mt-0.5">Prediksi berdasarkan rata-rata interval antar order</p>
        </div>
        <div className="divide-y divide-gray-50">
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
              <div key={cs.customer.code}>
                <div
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedCustomer(isExpanded ? null : cs.customer.code)}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center text-white text-sm shrink-0"
                    style={{ backgroundColor: cs.color }}>
                    {cs.customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{cs.customer.name}</p>
                    <p className="text-xs text-slate-400">{cs.customer.contact} · {cs.totalOrders} order</p>
                  </div>
                  <div className="hidden sm:block text-center w-20 shrink-0">
                    <p className="text-[10px] text-slate-400 mb-0.5">Avg Interval</p>
                    <p className="text-xs text-slate-600">
                      {cs.avgInterval !== null ? `${cs.avgInterval}h` : '—'}
                    </p>
                  </div>
                  <div className="hidden md:block text-center w-24 shrink-0">
                    <p className="text-[10px] text-slate-400 mb-0.5">Order Terakhir</p>
                    <p className="text-xs text-slate-600">{cs.lastOrderDate ?? '—'}</p>
                  </div>
                  <div className="text-center w-28 shrink-0">
                    <p className="text-[10px] text-slate-400 mb-0.5">Prediksi Order</p>
                    {predStatus === 'insufficient' ? (
                      <span className="text-[10px] text-slate-400 bg-gray-100 px-2 py-0.5 rounded-full">Data kurang</span>
                    ) : predStatus === 'overdue' ? (
                      <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {cs.predictedMonth}
                      </span>
                    ) : predStatus === 'upcoming' ? (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {cs.predictedMonth}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#C8102E] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        {cs.predictedMonth}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-slate-300">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2 mt-1">Riwayat Order</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="text-left py-1.5 pr-4 font-normal">ID SO</th>
                            <th className="text-left py-1.5 pr-4 font-normal">Deskripsi</th>
                            <th className="text-left py-1.5 pr-4 font-normal">Qty</th>
                            <th className="text-left py-1.5 pr-4 font-normal">Tanggal</th>
                            <th className="text-left py-1.5 font-normal">Interval</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cs.orders.map((so, idx) => {
                            const interval = idx > 0
                              ? daysBetween(cs.orders[idx - 1].createdAt, so.createdAt)
                              : null;
                            return (
                              <tr key={so.id} className="text-slate-600">
                                <td className="py-1.5 pr-4 font-mono text-slate-700">{so.id}</td>
                                <td className="py-1.5 pr-4 max-w-[200px] truncate">{so.description}</td>
                                <td className="py-1.5 pr-4">{so.quantity} {so.unit}</td>
                                <td className="py-1.5 pr-4">{so.createdAt}</td>
                                <td className="py-1.5">
                                  {interval !== null
                                    ? <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{interval}h</span>
                                    : <span className="text-slate-300">—</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {cs.orders.length > 1 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-1.5">Timeline pembelian</p>
                        <div className="flex items-center gap-0 overflow-x-auto pb-1">
                          {cs.orders.map((so, idx) => {
                            const interval = idx > 0
                              ? daysBetween(cs.orders[idx - 1].createdAt, so.createdAt)
                              : null;
                            const maxInterval = Math.max(...cs.orders.slice(1).map((_, i) =>
                              daysBetween(cs.orders[i].createdAt, cs.orders[i + 1].createdAt)
                            ));
                            const width = interval ? Math.max(40, Math.round((interval / maxInterval) * 80)) : 0;
                            return (
                              <div key={so.id} className="flex items-center shrink-0">
                                {interval !== null && (
                                  <div className="flex items-center" style={{ width: `${width}px` }}>
                                    <div className="flex-1 h-0.5 bg-gray-200" />
                                    <span className="text-[9px] text-slate-400 mx-1 shrink-0">{interval}h</span>
                                    <div className="flex-1 h-0.5 bg-gray-200" />
                                  </div>
                                )}
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="w-3 h-3 rounded-full border-2 shrink-0"
                                    style={{ backgroundColor: cs.color, borderColor: cs.color }} />
                                  <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                                    {so.createdAt.slice(5)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {cs.predictedDate && (
                            <div className="flex items-center shrink-0">
                              <div className="flex items-center" style={{ width: '60px' }}>
                                <div className="flex-1 h-0.5 border-t-2 border-dashed border-slate-300" />
                              </div>
                              <div className="flex flex-col items-center shrink-0">
                                <div className="w-3 h-3 rounded-full border-2 border-dashed shrink-0"
                                  style={{ borderColor: cs.color, backgroundColor: 'white' }} />
                                <span className="text-[9px] text-[#C8102E] mt-0.5 whitespace-nowrap">
                                  {cs.predictedDate.toISOString().slice(5, 10)}?
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
