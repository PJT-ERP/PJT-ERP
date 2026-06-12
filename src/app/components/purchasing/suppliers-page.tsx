import { useMemo, useState } from "react";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  ShoppingCart,
  Eye,
  Download,
  Filter,
  Building2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { usePurchasingData } from "./usePurchasingData";
import { SupplierDto } from "../../services/masterDataApi";
import { AddSupplierModal } from "./add-supplier-modal";

/* ── Types & Data ──────────────────────────────────────────── */

interface Contact {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary?: boolean;
}

interface MonthData { month: string; value: number; pos: number; }

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  city: string;
  province: string;
  address: string;
  status: "Active" | "Inactive" | "On Hold" | "Blacklisted";
  rating: number;
  totalPOs: number;
  totalValue: number;
  onTimeRate: number;
  defectRate: number;
  contacts: Contact[];
  history: MonthData[];
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  npwp: string;
  paymentTerms: string;
  since: string;
}

const generateMockHistory = () => {
  return [
    { month: "Jan", value: 100, pos: 2 },
    { month: "Feb", value: 120, pos: 3 },
    { month: "Mar", value: 90, pos: 2 },
    { month: "Apr", value: 150, pos: 4 },
    { month: "May", value: 130, pos: 3 },
    { month: "Jun", value: 160, pos: 4 },
  ];
};

const MOCK_HISTORY = {
  "SUP-003": [
    { month: "Jan", value: 450, pos: 8 },
    { month: "Feb", value: 520, pos: 10 },
    { month: "Mar", value: 480, pos: 9 },
    { month: "Apr", value: 610, pos: 12 },
    { month: "May", value: 580, pos: 11 },
    { month: "Jun", value: 680, pos: 14 }
  ],
  "SUP-007": [
    { month: "Jan", value: 200, pos: 5 },
    { month: "Feb", value: 180, pos: 4 },
    { month: "Mar", value: 250, pos: 6 },
    { month: "Apr", value: 220, pos: 5 },
    { month: "May", value: 290, pos: 7 },
    { month: "Jun", value: 310, pos: 8 }
  ]
};

/* ── Helpers ───────────────────────────────────────────────── */

const statusCfg: Record<string, { bg: string; color: string; dot: string }> = {
  Active:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
  Inactive:    { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  "On Hold":   { bg: "#fef9c3", color: "#92400e", dot: "#f59e0b" },
  Blacklisted: { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
};

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: bg, color, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "9px 16px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

const formatRpM = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} M`;
  return `${(n / 1_000_000).toFixed(0)} Jt`;
};

function Stars({ r }: { r: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} style={{ fill: s <= Math.round(r) ? "#f59e0b" : "none", color: s <= Math.round(r) ? "#f59e0b" : "#cbd5e1" }} />
      ))}
      <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4, fontWeight: 600 }}>{r}</span>
    </span>
  );
}

/* ── Detail view ───────────────────────────────────────────── */

function SupplierDetail({ supplier, onBack }: { supplier: Supplier; onBack: () => void }) {
  const sc = statusCfg[supplier.status];

  return (
    <div className="p-5 space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
        style={{ fontSize: 12, color: "#475569" }}
      >
        <ArrowLeft size={14} /> Kembali ke Daftar Supplier
      </button>

      {/* Supplier header */}
      <div
        className="rounded-lg p-5"
        style={{ background: "#0f1e35", border: "1px solid #1e3a5f" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg shrink-0" style={{ background: "#1e3a5f" }}>
              <Building2 size={20} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 style={{ color: "#fff" }}>{supplier.name}</h1>
                <Pill bg={sc.bg} color={sc.color}>{supplier.status}</Pill>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                {supplier.code} · {supplier.type} · {supplier.category}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} style={{ color: "#64748b" }} />
                <span style={{ fontSize: 12, color: "#64748b" }}>{supplier.city}, {supplier.province}</span>
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 rounded px-3 py-2 text-white hover:opacity-90 transition-opacity shrink-0"
            style={{ fontSize: 12, background: "#C8102E" }}
          >
            <ShoppingCart size={13} /> Buat PO
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Total PO", val: `${supplier.totalPOs} PO`, icon: <ShoppingCart size={14} style={{ color: "#60a5fa" }} /> },
            { label: "Total Nilai", val: `Rp ${formatRpM(supplier.totalValue)}`, icon: <TrendingUp size={14} style={{ color: "#4ade80" }} /> },
            { label: "On-Time Rate", val: `${supplier.onTimeRate}%`, icon: <CheckCircle2 size={14} style={{ color: "#4ade80" }} />, color: supplier.onTimeRate >= 90 ? "#4ade80" : supplier.onTimeRate >= 80 ? "#fbbf24" : "#f87171" },
            { label: "Defect Rate", val: `${supplier.defectRate}%`, icon: <Star size={14} style={{ color: "#fbbf24" }} />, color: supplier.defectRate <= 1 ? "#4ade80" : supplier.defectRate <= 3 ? "#fbbf24" : "#f87171" },
          ].map((k) => (
            <div key={k.label} className="rounded p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2 mb-1.5">{k.icon}<span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{k.label}</span></div>
              <p style={{ fontSize: 16, fontWeight: 700, color: k.color ?? "#fff" }}>{k.val}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="rounded-lg h-9 bg-white border border-border p-1 gap-0">
          {[
            { val: "info", label: "Informasi" },
            { val: "contacts", label: "Kontak" },
            { val: "history", label: "Riwayat Pembelian" },
            { val: "performance", label: "Performa" },
          ].map((t) => (
            <TabsTrigger
              key={t.val}
              value={t.val}
              className="rounded h-7 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Info */}
        <TabsContent value="info" className="mt-4">
          <div
            className="rounded-lg p-5"
            style={{ background: "#fff", border: "1px solid #e2e8f0" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {[
                { label: "Kode Supplier", val: supplier.code },
                { label: "Tipe Badan Usaha", val: supplier.type },
                { label: "Kategori Material", val: supplier.category },
                { label: "Kota", val: supplier.city },
                { label: "Provinsi", val: supplier.province },
                { label: "Terms Pembayaran", val: supplier.paymentTerms },
                { label: "NPWP", val: supplier.npwp },
                { label: "Bank", val: supplier.bankName },
                { label: "No. Rekening", val: supplier.bankAccount },
                { label: "Cabang Bank", val: supplier.bankBranch },
                { label: "Bergabung Sejak", val: supplier.since },
                { label: "Rating", val: `${supplier.rating}/5.0` },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                  <p style={{ fontSize: 13, color: "#1F1F1F", marginTop: 3 }}>{val}</p>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Alamat Lengkap</p>
                <p style={{ fontSize: 13, color: "#1F1F1F", marginTop: 3 }}>{supplier.address}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-4 space-y-3">
          {supplier.contacts.map((c) => (
            <div
              key={c.email}
              className="rounded-lg p-4"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white shrink-0"
                  style={{ background: "#1e3a5f", fontSize: 14, fontWeight: 700 }}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1F1F1F" }}>{c.name}</p>
                    {c.isPrimary && (
                      <span className="rounded px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8" }}>
                        Kontak Utama
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.role}</p>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ fontSize: 13, color: "#1F1F1F" }}>
                      <Phone size={14} style={{ color: "#94a3b8" }} /> {c.phone}
                    </a>
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ fontSize: 13, color: "#1F1F1F" }}>
                      <Mail size={14} style={{ color: "#94a3b8" }} /> {c.email}
                    </a>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={`tel:${c.phone}`}>
                    <button className="flex items-center gap-1.5 rounded px-3 py-1.5 border hover:bg-slate-50 transition-colors" style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0" }}>
                      <Phone size={13} /> Telepon
                    </button>
                  </a>
                  <a href={`mailto:${c.email}`}>
                    <button className="flex items-center gap-1.5 rounded px-3 py-1.5 border hover:bg-slate-50 transition-colors" style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0" }}>
                      <Mail size={13} /> Email
                    </button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
              Nilai Pembelian 6 Bulan Terakhir (Juta Rp)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={supplier.history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#e2e8f0" }} formatter={(v: number) => [`Rp ${v} Jt`]} />
                <Bar dataKey="value" fill="#C8102E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table summary */}
          <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <TH>Bulan</TH>
                  <TH>Jumlah PO</TH>
                  <TH>Nilai Pembelian</TH>
                  <TH>Rata-rata / PO</TH>
                </tr>
              </thead>
              <tbody>
                {supplier.history.slice().reverse().map((h) => (
                  <tr key={h.month} style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <TD><span style={{ fontWeight: 500, color: "#1F1F1F" }}>{h.month} 2026</span></TD>
                    <TD><span style={{ color: "#475569" }}>{h.pos} PO</span></TD>
                    <TD><span style={{ fontWeight: 600, color: "#1F1F1F" }}>Rp {h.value} Jt</span></TD>
                    <TD><span style={{ color: "#64748b" }}>Rp {Math.round(h.value / h.pos)} Jt</span></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "On-Time Delivery", val: `${supplier.onTimeRate}%`, target: "≥ 90%", ok: supplier.onTimeRate >= 90, bar: supplier.onTimeRate, color: "#C8102E" },
              { label: "Defect Rate", val: `${supplier.defectRate}%`, target: "≤ 2%", ok: supplier.defectRate <= 2, bar: Math.min(supplier.defectRate * 10, 100), color: "#dc2626", invert: true },
              { label: "Total PO (6 bln)", val: supplier.totalPOs.toString(), target: "—", ok: true, bar: Math.min((supplier.totalPOs / 60) * 100, 100), color: "#0891b2" },
              { label: "Rating", val: `${supplier.rating}/5.0`, target: "≥ 4.0", ok: supplier.rating >= 4.0, bar: (supplier.rating / 5) * 100, color: "#f59e0b" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{kpi.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#1F1F1F", marginTop: 6 }}>{kpi.val}</p>
                <div className="flex items-center justify-between mt-2 mb-1.5">
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Target: {kpi.target}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: kpi.ok ? "#16a34a" : "#dc2626" }}>
                    {kpi.ok ? "✓ OK" : "✗ Below"}
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 5, background: "#f1f5f9" }}>
                  <div className="h-full rounded-full" style={{ width: `${kpi.bar}%`, background: kpi.color }} />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Main list view ────────────────────────────────────────── */

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { suppliers, isLoading, refresh } = usePurchasingData();

  const enhancedSuppliers = useMemo(() => {
    return (suppliers as any[]).map(s => {
      const isIndo = s.code === "SUP-003";
      const isSumber = s.code === "SUP-007";
      return {
        ...s,
        totalPOs: isIndo ? 47 : isSumber ? 31 : 15,
        totalValue: isIndo ? 2900000000 : isSumber ? 950000000 : 380000000,
        onTimeRate: isIndo ? 96 : isSumber ? 89 : 82,
        defectRate: isIndo ? 0.5 : isSumber ? 1.2 : 2.5,
        rating: s.rating ?? 4.0,
        history: MOCK_HISTORY[s.code as keyof typeof MOCK_HISTORY] || generateMockHistory()
      };
    });
  }, [suppliers]);

  const filtered = useMemo(() => {
    return enhancedSuppliers.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.city?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [search, filterStatus, enhancedSuppliers]);

  if (isLoading) {
    return <div className="p-5 flex justify-center text-slate-500">Loading suppliers...</div>;
  }

  if (selectedSupplier) return <SupplierDetail supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} />;

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Supplier Management</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Database supplier dan manajemen vendor PT Pratama Jaya Tekindo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded px-3 py-1.5 border hover:bg-slate-50 transition-colors" style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0", background: "#fff" }}>
            <Download size={13} /> Export
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-white hover:opacity-90 transition-opacity" 
            style={{ fontSize: 12, background: "#1e3a5f" }}
          >
            <Plus size={13} /> Tambah Supplier
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, kategori, kota..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <div className="flex gap-2">
          {["all", "Active", "On Hold", "Inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="rounded px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12, fontWeight: 500,
                background: filterStatus === s ? "#1e3a5f" : "#f8fafc",
                color: filterStatus === s ? "#fff" : "#475569",
                border: `1px solid ${filterStatus === s ? "#1e3a5f" : "#e2e8f0"}`,
              }}
            >
              {s === "all" ? "Semua" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Supplier</TH>
                <TH className="hidden md:table-cell">Kategori</TH>
                <TH className="hidden lg:table-cell">Kota</TH>
                <TH className="hidden xl:table-cell">Rating</TH>
                <TH className="hidden sm:table-cell">Total PO</TH>
                <TH className="hidden md:table-cell">On-Time</TH>
                <TH className="hidden lg:table-cell">Nilai Transaksi</TH>
                <TH>Status</TH>
                <TH>Aksi</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const sc = statusCfg[s.status];
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    onClick={() => setSelectedSupplier(s)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded shrink-0" style={{ background: "#1e3a5f", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#1F1F1F", fontSize: 13 }}>{s.name}</p>
                          <p style={{ fontSize: 11, color: "#94a3b8" }}>{s.code}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span style={{ fontSize: 12, color: "#475569" }}>{s.category}</span>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <span style={{ fontSize: 12, color: "#475569" }}>{s.city}</span>
                    </TD>
                    <TD className="hidden xl:table-cell">
                      <Stars r={s.rating} />
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>{s.totalPOs}</span>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.onTimeRate >= 90 ? "#16a34a" : s.onTimeRate >= 80 ? "#d97706" : "#dc2626" }}>
                        {s.onTimeRate}%
                      </span>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>Rp {formatRpM(s.totalValue)}</span>
                    </TD>
                    <TD>
                      <Pill bg={sc.bg} color={sc.color}>
                        <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                        {s.status}
                      </Pill>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <a href={`tel:${s.contacts?.[0]?.phone || ''}`}>
                          <button className="rounded p-1.5 hover:bg-slate-100 transition-colors" style={{ color: "#64748b" }}>
                            <Phone size={13} />
                          </button>
                        </a>
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border hover:bg-red-50 transition-colors"
                          style={{ fontSize: 11, color: "#C8102E", borderColor: "#bfdbfe" }}
                          onClick={() => setSelectedSupplier(s)}
                        >
                          <Eye size={12} /> Detail
                        </button>
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <p style={{ fontSize: 11, color: "#94a3b8" }}>{filtered.length} supplier ditemukan</p>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
            Total aktif: {enhancedSuppliers.filter((s) => s.status === "Active").length}
          </p>
        </div>
      </div>
      
      <AddSupplierModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={() => {
          refresh();
        }} 
      />
    </div>
  );
}
