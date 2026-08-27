import React from "react";
import { ArrowLeft, Building2, ShoppingCart, TrendingUp, CheckCircle2, Star, Edit2, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Supplier, statusCfg, Pill, TH, TD, formatRpM } from "./SupplierHelpers";

export function SupplierDetailPanel({
  supplier,
  onBack,
  onEdit,
  onDelete,
  // eslint-disable-next-line unused-imports/no-unused-vars
  canCreatePo,
}: {
  supplier: Supplier;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canCreatePo: boolean;
}) {
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
        style={{ background: "#1F1F1F", border: "1px solid #334155" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-md shrink-0" style={{ background: "#334155" }}>
              <Building2 size={20} style={{ color: "#fff" }} />
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
                <span style={{ fontSize: 12, color: "#64748b" }}>{supplier.city}, {supplier.province}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded px-3 py-2 border border-white/20 text-white hover:bg-white/10 transition-colors"
              style={{ fontSize: 12 }}
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded px-3 py-2 border border-red-300/40 text-red-100 hover:bg-red-500/20 transition-colors"
              style={{ fontSize: 12 }}
            >
              <Trash2 size={13} /> Hapus
            </button>
          </div>
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
              className="rounded-sm h-7 px-3 text-xs data-[state=active]:bg-[#C8102E] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Info */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1F1F1F", marginBottom: 16 }}>Detail Perusahaan</h3>
              <div className="space-y-4">
                <div>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Alamat Lengkap</p>
                  <p style={{ fontSize: 13, color: "#1F1F1F" }}>{supplier.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Bergabung Sejak</p>
                    <p style={{ fontSize: 13, color: "#1F1F1F" }}>{supplier.since}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>NPWP</p>
                    <p style={{ fontSize: 13, color: "#1F1F1F" }}>{supplier.npwp || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1F1F1F", marginBottom: 16 }}>Informasi Finansial</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Bank</p>
                    <p style={{ fontSize: 13, color: "#1F1F1F", fontWeight: 500 }}>{supplier.bankName || "-"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Cabang</p>
                    <p style={{ fontSize: 13, color: "#1F1F1F" }}>{supplier.bankBranch || "-"}</p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Nomor Rekening</p>
                  <p style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "monospace" }}>{supplier.bankAccount || "-"}</p>
                </div>
                <div className="pt-3" style={{ borderTop: "1px dashed #e2e8f0" }}>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Payment Terms</p>
                  <p style={{ fontSize: 13, color: "#1F1F1F", fontWeight: 500 }}>{supplier.paymentTerms || "Cash"}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplier.contacts.map((c, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #e2e8f0", position: "relative" }}>
                {c.isPrimary && (
                  <span className="absolute top-4 right-4" style={{ fontSize: 10, background: "#fef2f2", color: "#C8102E", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Utama</span>
                )}
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                  {c.name.charAt(0)}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1F1F1F" }}>{c.name}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{c.role}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: "#1F1F1F" }}>{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: "#1F1F1F", wordBreak: "break-all" }}>{c.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1F1F1F", marginBottom: 20 }}>Tren Nilai Pembelian (Juta Rupiah)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={supplier.history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                    <TD><span style={{ color: "#64748b" }}>Rp {h.pos > 0 ? Math.round(h.value / h.pos) : 0} Jt</span></TD>
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
              { label: "Total PO (6 bln)", val: supplier.totalPOs.toString(), target: "-", ok: true, bar: Math.min((supplier.totalPOs / 60) * 100, 100), color: "#0891b2" },

            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{kpi.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#1F1F1F", marginTop: 6 }}>{kpi.val}</p>
                <div className="flex items-center justify-between mt-2 mb-1.5">
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Target: {kpi.target}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: kpi.ok ? "#16a34a" : "#dc2626" }}>
                    {kpi.ok ? "✓ OK" : "⚠ Below"}
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
