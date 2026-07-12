import React, { useState } from "react";
import {
  Pencil, Send, Clock, CheckCircle, ExternalLink, Factory, Shield,
  Package, LayoutDashboard, AlertTriangle, ArrowRight, TrendingUp,
  ArrowUpRight, Users, CheckSquare, List
} from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { getStatusColor } from "../../components/data/mockData";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarcodeScannerModal } from "../../components/common/BarcodeScannerModal";
import { QrCode } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

export function EngineeringPage() {
  const navigate = useNavigate();
  const { salesOrders, customers, currentUser, users } = useApp();
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (barcode: string) => {
    // Format: PJT|SO|20260709|c2345678...
    const parts = barcode.split('|');
    if (parts.length >= 4 && parts[0] === 'PJT' && parts[1] === 'SO') {
      let soId = parts[3];
      // Try to format it as a UUID with dashes if it has 32 chars without dashes
      if (soId.length === 32 && !soId.includes('-')) {
        soId = `${soId.substring(0, 8)}-${soId.substring(8, 12)}-${soId.substring(12, 16)}-${soId.substring(16, 20)}-${soId.substring(20, 32)}`;
      }
      setShowScanner(false);
      navigate(`/erp/engineer-tasks/${soId}`);
    } else {
      alert("Barcode tidak valid. Pastikan Anda men-scan tiket Sales Order (SO).");
    }
  };

  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv') || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  // Pre-Sales Design Queue
  const pendingSalesOrders = salesOrders
    .filter(so => {
      const engineeringStatuses = ['Pending Design', 'Waiting Spv Approval', 'Revision Required'];
      return engineeringStatuses.includes(so.status);
    })
    .map(so => ({ ...so, isQuotation: false } as any));

  const allDesignQueue = [...pendingSalesOrders];

  const designQueue = allDesignQueue.filter(item => {
    if (isSpv) return true;
    return item.designAssignedTo === currentUser?.id || item.assignedTo === currentUser?.id;
  }).sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

  const pendingDesignCount = designQueue.filter(item => ['Pending Design', 'Revision Required', 'Rejected'].includes(item.status)).length;
  const designReviewCount = designQueue.filter(item => item.status === 'Waiting Spv Approval').length;

  // Production Stats
  const inProductionCount = salesOrders.filter(so => so.status === 'In Production' || so.status === 'Ready for Production').length;
  const qcCount = salesOrders.filter(so => so.status === 'QC').length;

  const summaryCards = [
    {
      label: "Antrian Desain Baru",
      value: pendingDesignCount,
      icon: <List size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: isSpv ? "Dari Tim Sales" : "Dari Supervisor",
    },
    {
      label: "Waiting Spv Approval",
      value: designReviewCount,
      icon: <Clock size={18} />,
      accent: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      change: "Review Supervisor",
    },
    {
      label: "Proses Produksi",
      value: inProductionCount,
      icon: <Factory size={18} />,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      change: "Aktif di workshop",
    },
  ];

  const workflowStats = [
    { label: "Pending Design", count: pendingDesignCount, color: "#94A3B8" },
    { label: "Waiting Spv", count: designReviewCount, color: "#8B5CF6" },
    { label: "In Production", count: inProductionCount, color: "#3B82F6" },
    { label: "QC", count: qcCount, color: "#C8102E" },
  ];

  const workerTaskData = users
    .filter(user => (user.role === "Engineering" || user.role === "Engineering Supervisor") && user.isActive)
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
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Supervisor Engineering Dashboard</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            PT Pratama Jaya Tekindo · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>{card.label}</p>
                <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{card.value}</p>
                <p style={{ color: card.accent, fontSize: "11px", margin: 0, fontWeight: 500 }}>{card.change}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", color: card.accent, flexShrink: 0 }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isSpv && (
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
                  <Tooltip />
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
                  <Tooltip />
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
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }} className="lg-grid-cols-1">

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Pre-Sales Design Queue Table */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Pencil size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Tugas Desain (Pre-Sales)</span>
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1.1fr 170px 140px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
              {["No. SO", "Pelanggan", "Produk", "Ditugaskan", "Status"].map((h) => (
                <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {designQueue.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: S.secondary, fontSize: "13px" }}>
                <CheckCircle size={32} style={{ color: "#86EFAC", margin: "0 auto 10px" }} />
                <p style={{ margin: 0 }}>{isSpv ? "Tidak ada antrean desain dari Sales." : "Tidak ada antrean desain dari Supervisor."}</p>
              </div>
            ) : (
              designQueue.slice(0, 10).map((so, idx) => {
                const canOpen = isSpv ? so.status === 'Waiting Spv Approval' : so.designAssignedTo === currentUser?.id && so.status === 'Pending Design';
                const assignedName = so.designAssignedName || users.find(u => u.id === so.designAssignedTo)?.name || 'Engineer';

                return (
                  <div
                    key={so.id}
                    onClick={() => {
                      if (canOpen) {
                        navigate('/erp/engineer-tasks');
                      }
                    }}
                    style={{
                      display: "grid", gridTemplateColumns: "120px 1fr 1.1fr 170px 140px", alignItems: "center",
                      padding: "10px 18px", cursor: canOpen ? "pointer" : "default",
                      borderBottom: idx < designQueue.length - 1 ? `1px solid ${S.border}` : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500 }}>{so.id}</span>
                    <div>
                      <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500 }}>{customers.find(c => c.code === so.customerId)?.name || "-"}</p>
                    </div>
                    <span style={{ color: "#334155", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{so.description || so.partNumber || "-"}</span>
                    <div>
                      {so.designAssignedTo ? (
                        <span style={{ fontSize: "11px", background: S.bg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${S.border}`, color: S.slate, display: "inline-block" }}>
                          {assignedName}
                        </span>
                      ) : isSpv && currentUser?.role !== 'Admin' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/erp/engineer-tasks'); }}
                          style={{ fontSize: "11px", background: S.cyan, color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}
                        >
                          Tugaskan
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                      )}
                    </div>
                    <div>
                      <StatusBadge status={so.status} />
                    </div>
                  </div>
                );
              })
            )}

            {designQueue.length > 10 && (
              <div
                onClick={() => navigate('/erp/engineer-tasks')}
                style={{ padding: "12px 18px", textAlign: "center", cursor: "pointer", background: S.bg, color: S.cyan, fontSize: "12.5px", fontWeight: 600, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#E0F2FE"}
                onMouseLeave={e => e.currentTarget.style.background = S.bg}
              >
                Lihat Semua Tugas Desain ({designQueue.length})
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Pipeline stats */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
              <TrendingUp size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Statistik Beban Kerja</span>
            </div>
            {workflowStats.map((w) => (
              <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: S.secondary, fontSize: "12.5px" }}>{w.label}</span>
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 600, minWidth: 20, textAlign: "right" }}>{w.count}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden", display: "flex" }}>
              {workflowStats.filter(w => w.count > 0).map((w) => (
                <div key={w.label} style={{ flex: w.count, background: w.color, height: "100%" }} />
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
            <p style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600, margin: "0 0 12px" }}>Quick Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => setShowScanner(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", borderRadius: 4, cursor: "pointer",
                  background: S.cyan, border: `1px solid ${S.cyan}`,
                  color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: S.font,
                  transition: "opacity 0.1s", marginBottom: 4
                }}
              >
                <QrCode size={16} /> Scan Barcode / QR Ticket
              </button>
              {[
                { label: "Buat Purchasing Req", icon: <Package size={13} />, path: "/erp/engineer-purchasing", primary: false },
                { label: "Daftar Tugas", icon: <List size={13} />, path: "/erp/engineer-tasks", primary: false },
                { label: "Quality Control", icon: <CheckSquare size={13} />, path: "/erp/engineer-qc", primary: false },
                { label: "Pantau Produksi", icon: <Factory size={13} />, path: "/erp/production", primary: false },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 4, cursor: "pointer",
                    background: action.primary ? S.cyan : S.bg,
                    border: `1px solid ${action.primary ? S.cyan : S.border}`,
                    color: action.primary ? "#fff" : S.slate,
                    fontSize: "12.5px", fontWeight: 500, fontFamily: S.font,
                    transition: "opacity 0.1s",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>{action.icon}{action.label}</span>
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
}
