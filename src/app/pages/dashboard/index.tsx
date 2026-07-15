import { useState, useEffect } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Package, Clock, CheckCircle, AlertTriangle, Users, DollarSign, PieChart as PieChartIcon, Activity, CheckSquare, Pencil, Factory } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { SOStatus } from "../../components/data/mockData";
import { analyticsApi, OwnerDashboardDto } from "../../services/analyticsApi";
import { productionApi, ExecutiveDashboardDto } from "../../services/productionApi";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

const STATUS_ORDER: SOStatus[] = [
  'Waiting Payment',
  'Pending Design', 'Waiting Approval',
  'Ready for Production', 'In Production', 'QC', 'Completed', 'Rejected',
];

const STATUS_COLORS: Record<string, string> = {
  'Waiting Payment': '#F59E0B',
  'Pending Design': '#94A3B8',
  'Waiting Approval': '#FCD34D',
  'Ready for Production': '#A78BFA',
  'In Production': '#FB923C',
  'QC': '#22D3EE',
  'Completed': '#34D399',
  'Rejected': '#F87171',
};

const formatCurrency = (val: number) => {
  if (val >= 1000000000) {
    return `Rp ${(val / 1000000000).toFixed(1)} M`;
  }
  if (val >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

export function DashboardPage() {
  const { salesOrders, customers, users } = useApp();
  const [dashboardData, setDashboardData] = useState<OwnerDashboardDto | null>(null);
  const [executiveDashboard, setExecutiveDashboard] = useState<ExecutiveDashboardDto | null>(null);

  useEffect(() => {
    analyticsApi.getOwnerDashboard().then(setDashboardData).catch(console.error);
    productionApi.getExecutiveDashboard().then(setExecutiveDashboard).catch(console.error);
  }, []);

  const statusCounts = STATUS_ORDER.map(status => ({
    name: status,
    value: salesOrders.filter(so => so.status === status).length,
    color: STATUS_COLORS[status],
  })).filter(s => s.value > 0);

  const overdueSOs = salesOrders.filter(so =>
    !['Completed', 'Rejected'].includes(so.status) &&
    so.deadline < new Date().toISOString().split('T')[0]
  );

  const totalRevenue = salesOrders
    .filter(so => so.status !== 'Rejected')
    .reduce((acc, so) => acc + (so.estimatedAmount ?? 0), 0);

  const kpis = [
    { label: 'Total Nilai', value: formatCurrency(totalRevenue), icon: <DollarSign size={18} />, bg: '#FEF2F2', accent: S.cyan },
    { label: 'SO Aktif', value: executiveDashboard?.totalOrders ?? salesOrders.filter(s => s.status !== 'Completed' && s.status !== 'Rejected').length, icon: <Package size={18} />, bg: '#eff6ff', accent: '#1d4ed8' },
    { label: 'Selesai', value: executiveDashboard?.completed ?? salesOrders.filter(s => s.status === 'Completed').length, icon: <CheckCircle size={18} />, bg: '#f0fdf4', accent: '#15803d' },
    { label: 'Terlambat', value: executiveDashboard?.overdueCount ?? overdueSOs.length, icon: <AlertTriangle size={18} />, bg: '#fef2f2', accent: '#b91c1c' },
    { label: 'Di Produksi', value: executiveDashboard?.inProgress ?? salesOrders.filter(s => s.status === 'In Production').length, icon: <Clock size={18} />, bg: '#fff7ed', accent: '#c2410c' },
    { label: 'Antri QC', value: executiveDashboard?.waitingQC ?? salesOrders.filter(s => s.status === 'QC').length, icon: <Activity size={18} />, bg: '#faf5ff', accent: '#7e22ce' },
  ];

  const workerTaskData = users
    .filter(user => ((user.role as string) === "Engineering" || (user.role as string) === "Engineering Supervisor" || (user.role as string) === "Engineer") && user.isActive)
    .map(worker => {
      const designOrders = salesOrders.filter(so => so.designAssignedTo === worker.id);
      const prodOrders = salesOrders.filter(so => so.assignedTo === worker.id);
      return {
        name: worker.name,
        designActive: designOrders.filter(so => ["Pending Design", "Revision Required"].includes(so.status)).length,
        designReview: designOrders.filter(so => so.status === "Waiting Spv Approval").length,
        designCompleted: designOrders.filter(so => !["Pending Design", "Revision Required", "Waiting Spv Approval"].includes(so.status)).length,
        prodActive: prodOrders.filter(so => ["Ready for Production", "In Production"].includes(so.status)).length,
        prodQC: prodOrders.filter(so => so.status === "QC").length,
        prodCompleted: prodOrders.filter(so => so.status === "Completed").length,
      };
    });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1600, margin: "0 auto", fontFamily: S.font, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: S.slate, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>Dashboard Eksekutif</h1>
          <p style={{ fontSize: "14px", color: S.secondary, margin: 0 }}>
            PT Pratama Jaya Tekindo · {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {kpis.map((card, idx) => (
          <div key={card.label} style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "18px 20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <p style={{ color: S.secondary, fontSize: "13px", fontWeight: 500, margin: "0 0 8px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.label}</p>
                <p style={{ color: idx === 0 ? S.cyan : S.slate, fontSize: "24px", fontWeight: 700, margin: 0, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", color: card.accent, flexShrink: 0 }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Status Distribution Bar */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Activity size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Distribusi Status SO</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusCounts} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F8FAFC' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusCounts.map((entry, idx) => (
                  <Cell key={`bar-cell-${entry.name}-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <PieChartIcon size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Komposisi Order</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={2}
                dataKey="value" labelLine={false}
              >
                {statusCounts.map((entry, idx) => (
                  <Cell key={`pie-cell-${entry.name}-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend formatter={(value) => <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>} wrapperStyle={{ paddingTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Section 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Line Chart - Weekly Performance */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Activity size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Performa Mingguan</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dashboardData?.weeklyPerformance || []} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#475569' }}>{v}</span>} wrapperStyle={{ paddingTop: 10 }} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Order Selesai" />
              <Line type="monotone" dataKey="rejected" stroke="#F43F5E" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2 }} name="Ditolak/Gagal" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Control Overview */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CheckSquare size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Kualitas Produksi (QC)</span>
          </div>
          {dashboardData?.qualityControl ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Lulus QC (Go)', value: dashboardData.qualityControl.accept, fill: '#10B981' },
                { name: 'Tidak Lulus (No-Go)', value: dashboardData.qualityControl.reject + dashboardData.qualityControl.scrap, fill: '#F43F5E' }
              ]} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {([
                    { fill: '#10B981' }, { fill: '#F43F5E' }
                  ]).map((entry, idx) => (
                    <Cell key={`qc-cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: S.secondary, fontSize: "14px" }}>
              Memuat data...
            </div>
          )}
        </div>
      </div>

      {/* Engineering Workload Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Design Workload */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Pencil size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Beban Kerja Desain</span>
          </div>
          {workerTaskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workerTaskData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={true} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={145} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="designActive" name="Desain Aktif" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="designReview" name="Menunggu Review" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="designCompleted" name="Desain Selesai" stackId="a" fill="#22C55E" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: S.secondary, fontSize: 13 }}>
              Belum ada data.
            </div>
          )}
        </div>

        {/* Production Workload */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Factory size={14} style={{ color: "#F59E0B" }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Beban Kerja Produksi</span>
          </div>
          {workerTaskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workerTaskData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={true} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={145} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="prodActive" name="Produksi Aktif" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="prodQC" name="Menunggu QC" stackId="a" fill="#22D3EE" />
                <Bar dataKey="prodCompleted" name="Produksi Selesai" stackId="a" fill="#10B981" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: S.secondary, fontSize: 13 }}>
              Belum ada data.
            </div>
          )}
        </div>
      </div>

      {/* Lists Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Overdue */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${S.border}`, background: S.bg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Risiko Keterlambatan</span>
            </div>
          </div>
          <div style={{ padding: "16px 18px", flex: 1 }}>
            {overdueSOs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", color: S.secondary }}>
                <CheckCircle size={32} style={{ color: '#10B981', marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: "14px" }}>Semua pesanan on-track</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {overdueSOs.map(so => {
                  const days = Math.ceil((Date.now() - new Date(so.deadline).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={so.id} style={{ display: "flex", alignItems: "center", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, gap: 12 }}>
                      <p style={{ color: S.slate, fontSize: "13px", fontWeight: 600, margin: 0, fontFamily: "monospace", minWidth: 90 }}>{so.soNumber || so.id}</p>
                      <p style={{ color: S.secondary, fontSize: "12.5px", margin: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{so.customerName}</p>
                      <span style={{ color: S.secondary, fontSize: "11.5px", minWidth: 110, textAlign: "left", paddingRight: 8 }}>{so.status}</span>
                      <span style={{ background: "#ffe4e6", color: "#e11d48", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                        Telat {days} hari
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${S.border}`, background: S.bg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Customer Teraktif</span>
            </div>
          </div>
          <div style={{ padding: "16px 18px", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {customers
                .map(c => ({ ...c, count: salesOrders.filter(so => so.customerId === c.code && so.status === 'Completed').length }))
                .filter(c => c.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((c, idx) => {
                  const maxCount = salesOrders.length || 1;
                  return (
                    <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 20, textAlign: "left", fontSize: "13px", fontWeight: 700, color: S.cardBorder, flexShrink: 0 }}>#{idx + 1}</div>
                      <div style={{ width: 40, height: 40, background: S.bg, border: `1px solid ${S.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: S.slate, flexShrink: 0 }}>
                        {c.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: S.slate, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</p>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: S.secondary }}>{c.count} Order</span>
                        </div>
                        <div style={{ width: "100%", height: 8, background: S.bg, borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: S.cyan, borderRadius: 999, width: `${(c.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              {customers.filter(c => salesOrders.some(so => so.customerId === c.code && so.status === 'Completed')).length === 0 && (
                <div style={{ textAlign: "center", color: S.secondary, padding: "32px 0", fontSize: "14px" }}>
                  <p style={{ margin: 0 }}>Belum ada data pelanggan terselesaikan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
