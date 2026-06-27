import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Package,
  RefreshCcw,
  Truck,
  Clock,
  Plus,
  Download,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MaterialRequirementDto } from "../../services/purchasingApi";
import { masterDataApi } from "../../services/masterDataApi";
import { usePurchasingData } from "./usePurchasingData";
import { useApp } from "../context/AppContext";

/* ── Types & Data ──────────────────────────────────────────── */

interface IncomingShipment {
  po: string;
  supplier: string;
  eta: string;
  qty: number;
  unit: string;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  location: string;
  lastUpdated: string;
  supplier: string;
  unitPrice: number;
  incoming?: IncomingShipment;
}

/* ── Helpers ───────────────────────────────────────────────── */

type StockStatus = "critical" | "low" | "normal" | "excess";

function getStatus(item: InventoryItem): StockStatus {
  if (item.currentStock === 0) return "critical";
  if (item.currentStock < item.minStock) return "critical";
  if (item.currentStock <= item.reorderPoint) return "low";
  if (item.currentStock >= item.maxStock * 0.9) return "excess";
  return "normal";
}

const statusCfg: Record<StockStatus, { label: string; bg: string; color: string; dot: string; barColor: string }> = {
  critical: { label: "Kritis", bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", barColor: "#dc2626" },
  low: { label: "Rendah", bg: "#fef9c3", color: "#92400e", dot: "#f59e0b", barColor: "#f59e0b" },
  normal: { label: "Normal", bg: "#dcfce7", color: "#166534", dot: "#16a34a", barColor: "#16a34a" },
  excess: { label: "Berlebih", bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", barColor: "#3b82f6" },
};

const formatRp = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

function TH({ children, className = "", right = false }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "9px 16px", textAlign: right ? "right" : "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

function TD({ children, className = "", right = false }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <td className={className} style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", textAlign: right ? "right" : "left" }}>
      {children}
    </td>
  );
}

const CHART_COLORS = ["#C8102E", "#0891b2", "#7c3aed", "#16a34a", "#d97706"];

function AddMaterialModal({ isOpen, onClose, onAdded, inventoryItems }: { isOpen: boolean; onClose: () => void; onAdded: () => void; inventoryItems: InventoryItem[] }) {
  const [formData, setFormData] = useState({
    code: "", name: "", category: "Project", unit: "pcs",
    currentStock: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
    location: "", supplierName: "", unitPrice: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let maxNum = 0;
      inventoryItems.forEach(i => {
        if (i.code.startsWith("MAT-")) {
          const num = parseInt(i.code.replace("MAT-", ""), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextCode = `MAT-${String(maxNum + 1).padStart(3, "0")}`;
      setFormData(prev => ({ ...prev, code: nextCode }));
    } else {
      // Reset form when closed
      setFormData({
        code: "", name: "", category: "Project", unit: "pcs",
        currentStock: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
        location: "", supplierName: "", unitPrice: 0
      });
    }
  }, [isOpen, inventoryItems]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await masterDataApi.createInventoryItem(formData);
      onAdded();
      onClose();
    } catch (error) {
      console.warn("Failed to create material", error);
      alert("Gagal menambahkan material.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E]";
  const labelClass = "block text-[11px] font-semibold text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">Tambah Material Baru</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kode Material</label>
              <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className={inputClass} placeholder="Contoh: MAT-001" />
            </div>
            <div>
              <label className={labelClass}>Nama Material</label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Aluminium Plate..." />
            </div>
            <div>
              <label className={labelClass}>Kategori</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputClass}>
                <option>Project</option>
                <option>Consumable</option>
                <option>Tools</option>
                <option>Asset</option>
                <option>Maintenance</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Satuan</label>
              <input required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className={inputClass} placeholder="pcs, kg, m, dll" />
            </div>
            <div>
              <label className={labelClass}>Stok Awal</label>
              <input type="number" required value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reorder Point</label>
              <input type="number" required value={formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Min Stock</label>
              <input type="number" required value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max Stock</label>
              <input type="number" required value={formData.maxStock} onChange={e => setFormData({ ...formData, maxStock: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Harga Satuan (Rp)</label>
              <input type="number" required value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lokasi Penyimpanan</label>
              <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputClass} placeholder="Rak A1" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Nama Supplier Default</label>
              <input value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} className={inputClass} placeholder="PT Indo Steel" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Batal</button>
            <button type="submit" disabled={submitting} className="rounded bg-[#C8102E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export function InventoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const { inventoryItems, purchaseRequests, refresh } = usePurchasingData();
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const inventory: InventoryItem[] = useMemo(() => {
    const incomingByName = new Map<string, IncomingShipment>();
    purchaseRequests.forEach(pr => {
      pr.items.forEach(item => {
        if (item.purchaseStatus === "Ordered" || item.purchaseStatus === "Approved") {
          const poNumber = item.poNumber || pr.prNumber;
          const eta = item.expectedArrivalDate ? new Date(item.expectedArrivalDate).toLocaleDateString("id-ID") : "Hari ini";
          incomingByName.set(item.itemName.toLowerCase(), {
            po: poNumber,
            supplier: item.supplierName || item.suggestedSupplier || "Supplier",
            eta,
            qty: item.qty,
            unit: "pcs"
          });
        }
      });
    });

    return inventoryItems.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      reorderPoint: item.reorderPoint,
      location: item.location,
      supplier: item.supplierName,
      unitPrice: item.unitPrice,
      lastUpdated: item.updatedAtUtc,
      incoming: incomingByName.get(item.name.toLowerCase())
    }));
  }, [inventoryItems, purchaseRequests]);

  const categories = useMemo(() => Array.from(new Set(inventory.map((item) => item.category))), [inventory]);
  const chartData = useMemo(() => categories.map((cat) => ({
    name: cat.split(" ")[0],
    value: Math.round(inventory.filter((item) => item.category === cat).reduce((s, item) => s + item.currentStock * item.unitPrice, 0) / 1_000_000),
  })), [categories, inventory]);

  const filtered = inventory.filter((item) => {
    const q = search.toLowerCase();
    const status = getStatus(item);
    const matchQ = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchC = filterCat === "all" || item.category === filterCat;
    const matchS = filterStatus === "all" || status === filterStatus;
    return matchQ && matchC && matchS;
  });

  const criticalItems = inventory.filter((i) => getStatus(i) === "critical");
  const lowItems = inventory.filter((i) => getStatus(i) === "low");
  const incomingItems = inventory.filter((i) => !!i.incoming);
  const totalValue = inventory.reduce((s, i) => s + i.currentStock * i.unitPrice, 0);

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Inventory Status</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Ketersediaan material dan status stok gudang dari backend
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreatePo && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              title="Tambah Material / Stok Baru"
              className="flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
            >
              <Plus size={14} /> Tambah Material
            </button>
          )}
          <button onClick={() => void refresh()} className="flex items-center gap-2 text-sm border hover:bg-slate-50 transition-colors rounded-md px-4 py-1.5 font-medium shadow-sm" style={{ color: "#475569", borderColor: "#e2e8f0", background: "#fff" }}>
            <RefreshCcw size={14} /> Refresh
          </button>
          {canCreatePo && (
            <button
              onClick={() => navigate("/erp/purchasing/create")}
              title="Buat PO untuk item reorder"
              className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
            >
              <Plus size={14} /> Buat PO Reorder
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Item", val: inventory.length, sub: `${categories.length} kategori`, icon: <Package size={16} style={{ color: "#C8102E" }} />, bg: "#eff6ff" },
          { label: "Stok Kritis", val: criticalItems.length, sub: "Segera reorder", icon: <AlertTriangle size={16} style={{ color: "#dc2626" }} />, bg: "#fee2e2", urgent: true },
          { label: "Perlu Reorder", val: lowItems.length, sub: "Di bawah reorder point", icon: <TrendingDown size={16} style={{ color: "#f59e0b" }} />, bg: "#fef9c3" },
          { label: "Nilai Stok Total", val: formatRp(totalValue), sub: "Semua material", icon: <TrendingUp size={16} style={{ color: "#16a34a" }} />, bg: "#dcfce7", isText: true },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-4 flex items-center gap-4"
            style={{
              background: "#fff",
              border: `1px solid ${k.urgent ? "#fca5a5" : "#e2e8f0"}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ background: k.bg }}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
              <p style={{ fontSize: k.isText ? 15 : 22, fontWeight: 700, color: k.urgent ? "#dc2626" : "#1F1F1F", marginTop: 2 }}>{k.val}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top row — alerts + chart + incoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Critical stock alert */}
        <div className="rounded-lg overflow-hidden flex flex-col h-full" style={{ background: "#fff", border: "1px solid #fca5a5", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5" }}>
            <AlertTriangle size={14} style={{ color: "#dc2626" }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Stok Kritis — Tindakan Segera
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "#f1f5f9" }}>
            {criticalItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: "#64748b" }}>{item.code} · {item.location}</p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>
                    {item.currentStock} {item.unit}
                  </p>
                  <p style={{ fontSize: 10, color: "#94a3b8" }}>min: {item.minStock}</p>
                </div>
              </div>
            ))}
          </div>
          {criticalItems.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Tidak ada stok kritis</p>
            </div>
          )}
        </div>

        {/* Category chart */}
        <div className="rounded-lg overflow-hidden flex flex-col h-full" style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1F1F1F", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nilai Stok per Kategori (Juta Rp)
            </p>
          </div>
          <div className="px-2 py-4 flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#e2e8f0" }} formatter={(v: number) => [`Rp ${v} Jt`]} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incoming shipments */}
        <div className="rounded-lg overflow-hidden flex flex-col h-full" style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <Truck size={14} style={{ color: "#0891b2" }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1F1F1F", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Material Masuk
            </p>
            <span className="ml-auto rounded-full flex items-center justify-center text-white" style={{ width: 18, height: 18, background: "#0891b2", fontSize: 10, fontWeight: 700 }}>
              {incomingItems.length}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {incomingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid #f8fafc" }}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded shrink-0 mt-0.5" style={{ background: "#ecfeff" }}>
                  <Truck size={13} style={{ color: "#0891b2" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: "#64748b" }}>{item.incoming!.supplier}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{
                        fontSize: 10, fontWeight: 600,
                        background: item.incoming!.eta === "Hari ini" ? "#fee2e2" : "#eff6ff",
                        color: item.incoming!.eta === "Hari ini" ? "#991b1b" : "#1d4ed8",
                      }}
                    >
                      ETA: {item.incoming!.eta}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>+{item.incoming!.qty} {item.incoming!.unit}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{item.incoming!.po}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, kategori..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-9 w-44 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {(["all", "critical", "low", "normal"] as const).map((s) => {
            const cfg = s === "all" ? null : statusCfg[s];
            const active = filterStatus === s;
            const count = s === "all" ? inventory.length : inventory.filter((i) => getStatus(i) === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="rounded px-2.5 py-1.5 transition-colors flex items-center gap-1.5"
                style={{
                  fontSize: 11, fontWeight: 500,
                  background: active ? (cfg?.bg ?? "#1e3a5f") : "#f8fafc",
                  color: active ? (cfg?.color ?? "#fff") : "#475569",
                  border: `1px solid ${active ? (cfg?.color ? cfg.color + "50" : "#1e3a5f") : "#e2e8f0"}`,
                }}
              >
                {cfg && <span className="rounded-full" style={{ width: 5, height: 5, background: cfg.dot }} />}
                {s === "all" ? "Semua" : cfg!.label}
                <strong style={{ color: active ? "inherit" : "#1F1F1F" }}>{count}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Kode / Material</TH>
                <TH className="hidden md:table-cell">Kategori</TH>
                <TH right>Stok Saat Ini</TH>
                <TH className="hidden lg:table-cell" right>Min</TH>
                <TH className="hidden lg:table-cell" right>Reorder Pt</TH>
                <TH className="hidden xl:table-cell" right>Maks</TH>
                <TH className="hidden lg:table-cell w-36">Level Stok</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Material Masuk</TH>
                <TH className="hidden xl:table-cell">Lokasi</TH>
                <TH className="hidden sm:table-cell" right>Nilai Stok</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = getStatus(item);
                const sc = statusCfg[status];
                const pct = item.maxStock > 0 ? Math.min(100, Math.round((item.currentStock / item.maxStock) * 100)) : 0;

                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: sc.dot }} />
                        <div>
                          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{item.code}</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#1F1F1F" }}>{item.name}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span style={{ fontSize: 12, color: "#475569" }}>{item.category}</span>
                    </TD>
                    <TD right>
                      <span style={{ fontSize: 14, fontWeight: 700, color: status === "critical" ? "#dc2626" : status === "low" ? "#d97706" : "#1F1F1F" }}>
                        {item.currentStock}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>{item.unit}</span>
                    </TD>
                    <TD className="hidden lg:table-cell" right>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{item.minStock}</span>
                    </TD>
                    <TD className="hidden lg:table-cell" right>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{item.reorderPoint}</span>
                    </TD>
                    <TD className="hidden xl:table-cell" right>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{item.maxStock}</span>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <div style={{ width: 100 }}>
                        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#f1f5f9" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: sc.barColor }}
                          />
                        </div>
                        <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{pct}%</p>
                      </div>
                    </TD>
                    <TD>
                      <span
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                        style={{ fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}
                      >
                        <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot }} />
                        {sc.label}
                      </span>
                    </TD>
                    <TD className="hidden md:table-cell">
                      {item.incoming ? (
                        <div>
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                            style={{
                              fontSize: 10, fontWeight: 600,
                              background: item.incoming.eta === "Hari ini" ? "#fee2e2" : "#ecfeff",
                              color: item.incoming.eta === "Hari ini" ? "#991b1b" : "#0e7490",
                            }}
                          >
                            <Truck size={10} /> +{item.incoming.qty} {item.incoming.unit}
                          </span>
                          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>ETA: {item.incoming.eta}</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#e2e8f0" }}>—</span>
                      )}
                    </TD>
                    <TD className="hidden xl:table-cell">
                      <span style={{ fontSize: 11, color: "#64748b" }}>{item.location}</span>
                    </TD>
                    <TD className="hidden sm:table-cell" right>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>
                        {formatRp(item.currentStock * item.unitPrice)}
                      </span>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <p style={{ fontSize: 11, color: "#94a3b8" }}>
            Menampilkan {filtered.length} dari {inventory.length} item
          </p>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
            Nilai total stok: {formatRp(filtered.reduce((s, i) => s + i.currentStock * i.unitPrice, 0))}
          </p>
        </div>
      </div>

      <AddMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={() => void refresh()}
        inventoryItems={inventory}
      />
    </div>
  );
}
