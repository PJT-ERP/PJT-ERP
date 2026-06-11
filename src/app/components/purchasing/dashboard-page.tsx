import {
  ShoppingCart,
  ClipboardList,
  Truck,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
  RefreshCcw,
  Plus,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

/* ── Data ──────────────────────────────────────────────────── */

const spendTrend = [
  { month: "Nov", budget: 600, actual: 542 },
  { month: "Des", budget: 580, actual: 498 },
  { month: "Jan", budget: 620, actual: 587 },
  { month: "Feb", budget: 550, actual: 461 },
  { month: "Mar", budget: 640, actual: 612 },
  { month: "Apr", budget: 600, actual: 588 },
  { month: "Mei", budget: 620, actual: 548 },
];

const deliveryPerf = [
  { week: "W1", onTime: 92, late: 8 },
  { week: "W2", onTime: 88, late: 12 },
  { week: "W3", onTime: 95, late: 5 },
  { week: "W4", onTime: 90, late: 10 },
  { week: "W5", onTime: 97, late: 3 },
  { week: "W6", onTime: 94, late: 6 },
];

const recentActivity = [
  { id: "PO-2405-031", type: "PO Created", detail: "CV Bintang Logam — Besi Hollow, Plat Besi", time: "14:22", status: "open" },
  { id: "MR-2405-018", type: "MR Submitted", detail: "Dept. Produksi — 5 item, Prioritas High", time: "13:10", status: "pending" },
  { id: "PO-2405-030", type: "Delivery Received", detail: "PT Indo Steel — WF 150x75, CNP 150x65", time: "11:45", status: "done" },
  { id: "PO-2405-029", type: "Partial Delivery", detail: "UD Maju Jaya — Cat Epoxy 6/10 kaleng", time: "10:30", status: "partial" },
  { id: "MR-2405-017", type: "MR Approved", detail: "Dept. Maintenance — 3 spare parts item", time: "09:05", status: "done" },
];

const pendingApprovals = [
  { id: "MR-2405-018", dept: "Produksi", items: 5, priority: "High", age: "2j lalu" },
  { id: "MR-2405-016", dept: "QC", items: 2, priority: "Medium", age: "1h lalu" },
  { id: "MR-2405-015", dept: "Engineering", items: 8, priority: "High", age: "1h lalu" },
];

const incomingDeliveries = [
  { po: "PO-2405-031", supplier: "CV Bintang Logam", eta: "27 Mei", items: 3, status: "In Transit" },
  { po: "PO-2405-027", supplier: "CV Tekno Prima", eta: "24 Mei", items: 2, status: "Confirmed" },
  { po: "PO-2405-029", supplier: "UD Maju Jaya", eta: "Hari ini", items: 1, status: "Due Today" },
];

/* ── Helpers ───────────────────────────────────────────────── */

const statusDot: Record<string, string> = {
  open: "#3b82f6",
  pending: "#f59e0b",
  done: "#16a34a",
  partial: "#8b5cf6",
};

const priorityStyle: Record<string, { bg: string; color: string }> = {
  High: { bg: "#fee2e2", color: "#b91c1c" },
  Medium: { bg: "#fef9c3", color: "#92400e" },
  Low: { bg: "#f0fdf4", color: "#166534" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded border shadow-lg px-3 py-2"
      style={{ background: "#fff", borderColor: "#e2e8f0", fontSize: 12 }}
    >
      <p style={{ fontWeight: 600, color: "#1F1F1F", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === "actual" ? "Realisasi" : p.name === "budget" ? "Anggaran" : p.name}: Rp {p.value} Jt
        </p>
      ))}
    </div>
  );
};

/* ── KPI Card ──────────────────────────────────────────────── */
function KPICard({
  label, value, sub, trend, trendUp, icon, accentColor, accentBg,
}: {
  label: string; value: string; sub: string; trend: string; trendUp: boolean;
  icon: React.ReactNode; accentColor: string; accentBg: string;
}) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <div
          className="flex items-center justify-center w-8 h-8 rounded"
          style={{ background: accentBg, color: accentColor }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#1F1F1F", lineHeight: 1.2 }}>{value}</p>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub}</p>
      </div>
      <div className="flex items-center gap-1" style={{ fontSize: 11 }}>
        {trendUp ? (
          <TrendingUp size={12} style={{ color: "#16a34a" }} />
        ) : (
          <TrendingDown size={12} style={{ color: "#dc2626" }} />
        )}
        <span style={{ color: trendUp ? "#16a34a" : "#dc2626" }}>{trend}</span>
      </div>
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────────────── */
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #f1f5f9" }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
interface DashboardPageProps {
  onCreatePO?: () => void;
}

export function DashboardPage({ onCreatePO }: DashboardPageProps) {
  return (
    <div className="p-5 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Procurement Overview</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            PT Pratama Jaya Tekindo · Minggu, 24 Mei 2026 · Shift Pagi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded px-3 py-1.5 border transition-colors hover:bg-slate-50"
            style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0" }}
          >
            <RefreshCcw size={13} /> Refresh
          </button>
          <button
            onClick={onCreatePO}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-white transition-colors"
            style={{ fontSize: 12, background: "#1e3a5f" }}
          >
            <Plus size={13} /> Buat PO
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Pending Requests"
          value="3"
          sub="Menunggu persetujuan"
          trend="+1 hari ini"
          trendUp={false}
          icon={<ClipboardList size={16} />}
          accentColor="#d97706"
          accentBg="#fffbeb"
        />
        <KPICard
          label="Active Purchase Orders"
          value="27"
          sub="14 open · 8 in transit"
          trend="+3 minggu ini"
          trendUp={true}
          icon={<ShoppingCart size={16} />}
          accentColor="#C8102E"
          accentBg="#eff6ff"
        />
        <KPICard
          label="Supplier Deliveries"
          value="3"
          sub="Pengiriman minggu ini"
          trend="1 jatuh tempo hari ini"
          trendUp={false}
          icon={<Truck size={16} />}
          accentColor="#0891b2"
          accentBg="#ecfeff"
        />
        <KPICard
          label="Material Availability"
          value="94%"
          sub="6 item di bawah minimum"
          trend="-2% dari minggu lalu"
          trendUp={false}
          icon={<Package size={16} />}
          accentColor="#16a34a"
          accentBg="#f0fdf4"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spend vs Budget */}
        <div className="lg:col-span-2">
          <Section
            title="Realisasi vs Anggaran Pembelian (Juta Rp)"
            action={
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Nov 2025 – Mei 2026</span>
            }
          >
            <div className="px-2 py-4">
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={spendTrend} margin={{ top: 5, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8102E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="none"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#C8102E"
                    strokeWidth={2}
                    fill="url(#gradActual)"
                    dot={{ r: 3, fill: "#C8102E", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 px-2 mt-1">
                {[
                  { color: "#cbd5e1", dash: true, label: "Anggaran" },
                  { color: "#C8102E", dash: false, label: "Realisasi" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: 20, height: 2,
                        background: l.color,
                        borderTop: l.dash ? `2px dashed ${l.color}` : `2px solid ${l.color}`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>

        {/* Delivery Performance */}
        <Section
          title="On-Time Delivery (%)"
          action={<span style={{ fontSize: 11, color: "#94a3b8" }}>6 minggu terakhir</span>}
        >
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={deliveryPerf} margin={{ top: 5, right: 16, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderColor: "#e2e8f0" }}
                  formatter={(v: number) => [`${v}%`]}
                />
                <Line
                  type="monotone"
                  dataKey="onTime"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="px-3 mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
              <div className="flex justify-between">
                {[
                  { label: "Rata-rata", val: "93%", color: "#16a34a" },
                  { label: "Terendah", val: "88%", color: "#dc2626" },
                  { label: "Tertinggi", val: "97%", color: "#C8102E" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</p>
                    <p style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <div className="lg:col-span-2">
          <Section
            title="Aktivitas Hari Ini"
            action={
              <button className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors" style={{ fontSize: 11 }}>
                Lihat Semua <ArrowRight size={11} />
              </button>
            }
          >
            <div className="divide-y" style={{ divideColor: "#f8fafc" }}>
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div
                    className="rounded-full mt-0.5 shrink-0"
                    style={{ width: 8, height: 8, background: statusDot[a.status] ?? "#94a3b8", marginTop: 6 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{a.type}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{a.time}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{a.detail}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{a.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right panels */}
        <div className="space-y-4">
          {/* Pending approvals */}
          <Section
            title="Persetujuan Tertunda"
            action={
              <span
                className="flex items-center justify-center rounded-full text-white"
                style={{ background: "#dc2626", fontSize: 10, fontWeight: 700, width: 18, height: 18 }}
              >
                {pendingApprovals.length}
              </span>
            }
          >
            <div className="divide-y" style={{ divideColor: "#f8fafc" }}>
              {pendingApprovals.map((mr) => (
                <div key={mr.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{mr.id}</span>
                      <span
                        className="rounded px-1.5"
                        style={{
                          fontSize: 10, fontWeight: 600,
                          ...priorityStyle[mr.priority],
                        }}
                      >
                        {mr.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b" }}>{mr.dept} · {mr.items} item · {mr.age}</p>
                  </div>
                  <button
                    className="rounded px-2 py-1 text-white shrink-0 transition-opacity hover:opacity-90"
                    style={{ fontSize: 11, background: "#1e3a5f" }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Incoming deliveries */}
          <Section title="Pengiriman Masuk">
            <div className="divide-y" style={{ divideColor: "#f8fafc" }}>
              {incomingDeliveries.map((d) => (
                <div key={d.po} className="px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{d.po}</span>
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{
                        fontSize: 10, fontWeight: 600,
                        background: d.status === "Due Today" ? "#fee2e2" : d.status === "In Transit" ? "#eff6ff" : "#f0fdf4",
                        color: d.status === "Due Today" ? "#b91c1c" : d.status === "In Transit" ? "#1d4ed8" : "#166534",
                      }}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{d.supplier}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>ETA: {d.eta} · {d.items} item</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Alert banner */}
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-3"
        style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
      >
        <AlertTriangle size={15} style={{ color: "#c2410c", flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: "#7c2d12" }}>
          <strong>6 material</strong> berada di bawah stok minimum — segera buat Purchase Order untuk menghindari hambatan produksi.
        </p>
        <button
          className="ml-auto rounded px-3 py-1 text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ fontSize: 11, background: "#c2410c" }}
        >
          Lihat Stok Kritis
        </button>
      </div>
    </div>
  );
}
