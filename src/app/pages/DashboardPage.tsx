import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Package, Clock, CheckCircle, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SOStatus, calcProductionDuration, formatSOStatus } from "../components/data/mockData";

const STATUS_ORDER: SOStatus[] = [
  'design_pending', 'design_review', 'client_design_approval',
  'waiting_dp', 'pending_assignment', 'material_preparation',
  'in_production', 'qc_check', 'completed'
];

const STATUS_COLORS: Record<string, string> = {
  'design_pending': '#94A3B8',
  'design_review': '#FCD34D',
  'client_design_approval': '#A78BFA',
  'waiting_dp': '#8B5CF6',
  'pending_assignment': '#6366F1',
  'material_preparation': '#EC4899',
  'in_production': '#FB923C',
  'qc_check': '#22D3EE',
  'completed': '#34D399',
};

const WEEKLY_DATA = [
  { week: 'W1 Apr', completed: 3, rejected: 0, avgHours: 320 },
  { week: 'W2 Apr', completed: 5, rejected: 1, avgHours: 290 },
  { week: 'W3 Apr', completed: 4, rejected: 0, avgHours: 350 },
  { week: 'W4 Apr', completed: 6, rejected: 1, avgHours: 270 },
  { week: 'W1 Mei', completed: 4, rejected: 0, avgHours: 310 },
  { week: 'W2 Mei', completed: 2, rejected: 1, avgHours: 380 },
];

export function DashboardPage() {
  const { salesOrders, customers, users, quotations } = useApp();

  const statusCounts = STATUS_ORDER.map(status => ({
    status,
    fullStatus: formatSOStatus(status),
    count: salesOrders.filter(so => so.status === status).length,
    color: STATUS_COLORS[status],
  })).filter(s => s.count > 0);

  const pieData = statusCounts.filter(s => s.count > 0).map(s => ({
    name: formatSOStatus(s.status),
    value: s.count,
    color: s.color,
  }));

  const completedSOs = salesOrders.filter(so => so.status === 'completed' && so.startTime && so.endTime);
  const avgDuration = completedSOs.length > 0
    ? Math.round(completedSOs.reduce((acc, so) => acc + (calcProductionDuration(so.startTime, so.endTime) ?? 0), 0) / completedSOs.length)
    : 0;

  const overdueSOs = salesOrders.filter(so =>
    !['completed'].includes(so.status) &&
    so.deadline < new Date().toISOString().split('T')[0]
  );

  const kpis = [
    { label: 'Total SO Aktif', value: salesOrders.filter(s => !['completed'].includes(s.status)).length, icon: Package, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
    { label: 'Menunggu Approval', value: quotations.filter(q => q.status === 'design_review').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Dalam Produksi', value: salesOrders.filter(s => s.status === 'in_production').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Selesai (Total)', value: salesOrders.filter(s => s.status === 'completed').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Avg Durasi Prod.', value: `${avgDuration}h`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: 'SO Terlambat', value: overdueSOs.length, icon: AlertTriangle, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
  ];

  return (
    <div className="w-full" style={{ padding: "20px 24px" }}>
      <div className="mb-6">
        <h1 className="text-slate-800">Dashboard Strategi</h1>
        <p className="text-sm text-slate-500">Overview performa produksi PT. Pratama Jaya Tekindo</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-md p-4 border shadow-sm ${kpi.border}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${kpi.bg}`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <p className={`text-2xl ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution Bar */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-1">Distribusi Status SO</h3>
          <p className="text-xs text-slate-400 mb-4">Jumlah order per status</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusCounts} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <CartesianGrid key="bar-grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                key="bar-xaxis"
                dataKey="status"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                angle={-35}
                textAnchor="end"
              />
              <YAxis key="bar-yaxis" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip
                key="bar-tooltip"
                formatter={(value: number, name: string, props: any) => [value, props.payload.fullStatus]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar key="bar-data" dataKey="count" radius={[4, 4, 0, 0]}>
                {statusCounts.map((entry, idx) => (
                  <Cell key={`bar-cell-${entry.fullStatus}-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-1">Komposisi SO</h3>
          <p className="text-xs text-slate-400 mb-4">Proporsi berdasarkan status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                key="pie-data"
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${value}`}
                labelLine={false}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={`pie-cell-${entry.name}-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                key="pie-tooltip"
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                key="pie-legend"
                formatter={(value) => <span style={{ fontSize: 11, color: '#6B7280' }}>{value}</span>}
                wrapperStyle={{ paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart - Weekly Performance */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5 mb-6">
        <h3 className="text-slate-800 mb-1">Performa Mingguan</h3>
        <p className="text-xs text-slate-400 mb-4">Jumlah SO selesai & rata-rata durasi produksi (jam)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={WEEKLY_DATA} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid key="line-grid" strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis key="line-xaxis" dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis key="line-yaxis-left" yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis key="line-yaxis-right" yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <Tooltip key="line-tooltip" contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend key="line-legend" formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            <Line key="line-completed" yAxisId="left" type="monotone" dataKey="completed" stroke="#34D399" strokeWidth={2.5} dot={{ r: 4 }} name="SO Selesai" />
            <Line key="line-rejected" yAxisId="left" type="monotone" dataKey="rejected" stroke="#F87171" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} name="Ditolak" />
            <Line key="line-avghours" yAxisId="right" type="monotone" dataKey="avgHours" stroke="#475569" strokeWidth={2} dot={{ r: 4 }} name="Avg Jam Produksi" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent SOs + Overdue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overdue */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-500" />
            SO Terlambat ({overdueSOs.length})
          </h3>
          {overdueSOs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Tidak ada SO yang terlambat</p>
          ) : (
            <div className="space-y-2">
              {overdueSOs.map(so => {
                const days = Math.ceil((Date.now() - new Date(so.deadline).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={so.id} className="flex items-center justify-between text-sm bg-red-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-mono text-slate-800 text-xs">{so.id}</p>
                      <p className="text-slate-600 text-xs">{formatSOStatus(so.status)}</p>
                    </div>
                    <span className="text-red-600 text-xs">+{days} hari</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5">
          <h3 className="text-slate-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-slate-700" />
            Customer Teraktif
          </h3>
          <div className="space-y-3">
            {customers
              .map(c => ({ ...c, count: salesOrders.filter(so => so.customerId === c.code).length }))
              .filter(c => c.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((c, idx) => {
                const maxCount = salesOrders.length || 1;
                return (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4 text-right shrink-0">{idx + 1}</span>
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-xs text-blue-700 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{c.count} SO</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
