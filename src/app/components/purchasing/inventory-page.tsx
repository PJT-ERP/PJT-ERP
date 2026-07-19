import React from "react";
import { useNavigate } from "react-router";
import {
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Plus,
  Truck,
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
import { useInventory } from "./hooks/useInventory";
import { AddMaterialModal } from "./components/inventory/AddMaterialModal";
import { InventoryTable } from "./components/inventory/InventoryTable";
import { statusCfg, formatRp, CHART_COLORS } from "./components/inventory/InventoryHelpers";

export function InventoryPage() {
  const navigate = useNavigate();
  const board = useInventory();

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
          {board.canCreatePo && (
            <button
              onClick={() => {
                board.setEditItem(null);
                board.setIsAddModalOpen(true);
              }}
              title="Tambah Material / Stok Baru"
              className="flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
            >
              <Plus size={14} /> Tambah Material
            </button>
          )}

          {board.canCreatePo && (
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
          { label: "Total Item", val: board.inventory.length, sub: `${board.categories.length} kategori`, icon: <Package size={16} style={{ color: "#C8102E" }} />, bg: "#eff6ff" },
          { label: "Stok Kritis", val: board.criticalItems.length, sub: "Segera reorder", icon: <AlertTriangle size={16} style={{ color: "#dc2626" }} />, bg: "#fee2e2", urgent: true },
          { label: "Perlu Reorder", val: board.lowItems.length, sub: "Di bawah reorder point", icon: <TrendingDown size={16} style={{ color: "#f59e0b" }} />, bg: "#fef9c3" },
          { label: "Nilai Stok Total", val: formatRp(board.totalValue), sub: "Semua material", icon: <TrendingUp size={16} style={{ color: "#16a34a" }} />, bg: "#dcfce7", isText: true },
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
            {board.criticalItems.slice((board.criticalPage - 1) * board.perPage, board.criticalPage * board.perPage).map((item) => (
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
          {board.criticalTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1 px-4 py-2" style={{ borderTop: "1px solid #fca5a5" }}>
              <button onClick={() => board.setCriticalPage(p => Math.max(1, p - 1))} disabled={board.criticalPage === 1}
                style={{ padding: "2px 6px", fontSize: 11, border: "none", background: "none", color: board.criticalPage === 1 ? "#d4d4d8" : "#dc2626", cursor: board.criticalPage === 1 ? "default" : "pointer", fontWeight: 600 }}>
                ‹
              </button>
              {Array.from({ length: board.criticalTotalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => board.setCriticalPage(p)}
                  style={{ minWidth: 22, height: 22, padding: "0 4px", fontSize: 11, fontWeight: 600, borderRadius: 4, border: "none",
                    background: p === board.criticalPage ? "#dc2626" : "transparent", color: p === board.criticalPage ? "#fff" : "#991b1b", cursor: "pointer" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => board.setCriticalPage(p => Math.min(board.criticalTotalPages, p + 1))} disabled={board.criticalPage >= board.criticalTotalPages}
                style={{ padding: "2px 6px", fontSize: 11, border: "none", background: "none", color: board.criticalPage >= board.criticalTotalPages ? "#d4d4d8" : "#dc2626", cursor: board.criticalPage >= board.criticalTotalPages ? "default" : "pointer", fontWeight: 600 }}>
                ›
              </button>
            </div>
          )}
          {board.criticalItems.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Tidak ada stok kritis</p>
            </div>
          )}
        </div>

        {/* Category chart */}
        <div className="rounded-lg overflow-hidden flex flex-col h-full" style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1F1F1F", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nilai Stok per Kategori
            </p>
          </div>
          <div className="px-2 py-4 flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={board.chartData} margin={{ top: 5, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatRp(v)} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#e2e8f0" }} formatter={(v: number) => [formatRp(v), "Nilai Stok"]} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {board.chartData.map((_, i) => (
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
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>
              Dalam Perjalanan (ETA)
            </p>
            <span className="ml-auto rounded-full flex items-center justify-center text-white" style={{ width: 18, height: 18, background: "#0891b2", fontSize: 10, fontWeight: 700 }}>
              {board.incomingItems.length}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {board.incomingItems.map((item) => (
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
            value={board.search}
            onChange={(e) => { board.setSearch(e.target.value); board.setInvPage(1); }}
            placeholder="Cari kode, nama, kategori..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <Select value={board.filterCat} onValueChange={(v) => { board.setFilterCat(v); board.setInvPage(1); }}>
          <SelectTrigger className="h-9 w-44 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {board.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {(["all", "critical", "low", "normal", "excess"] as const).map((s) => {
            const cfg = s === "all" ? null : statusCfg[s];
            const active = board.filterStatus === s;
            const count = s === "all" ? board.inventory.length : board.inventory.filter((i) => {
              // using same logic as in getStatus
              if (i.currentStock === 0) return "critical" === s;
              if (i.currentStock < i.minStock) return "critical" === s;
              if (i.currentStock <= i.reorderPoint) return "low" === s;
              if (i.currentStock >= i.maxStock * 0.9) return "excess" === s;
              return "normal" === s;
            }).length;
            
            return (
              <button
                key={s}
                onClick={() => board.setFilterStatus(s)}
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

      <InventoryTable board={board} />

      <AddMaterialModal
        isOpen={board.isAddModalOpen}
        onClose={() => {
          board.setIsAddModalOpen(false);
          board.setEditItem(null);
        }}
        onAdded={() => void board.refresh()}
        inventoryItems={board.inventory}
        editItem={board.editItem}
        suppliers={board.suppliers}
      />

      {board.deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-2xl overflow-hidden p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Hapus Material</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Yakin ingin menghapus <strong>{board.deleteItem.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => board.setDeleteItem(null)} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Batal</button>
              <button onClick={board.confirmDelete} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;
