import React, { useState } from "react";
import { 
  Pencil, Send, Clock, CheckCircle, ExternalLink, Factory, Shield, 
  Package, LayoutDashboard, AlertTriangle, ArrowRight, TrendingUp, 
  ArrowUpRight, Users, CheckSquare, List
} from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, SOStatus, getStatusColor } from "../components/data/mockData";
import { useNavigate } from "react-router";

// Theme constants based on SO Dashboard
const S = {
  font: "Inter, sans-serif",
  navy: "#0F172A",
  cyan: "#06B6D4",
  slate: "#1E293B",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

function StatusBadge({ status }: { status: SOStatus }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

function DesignModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const [designLink, setDesignLink] = useState(so.designLink ?? '');
  const [step, setStep] = useState<'upload' | 'confirm' | 'done'>('upload');
  const customer = customers.find(c => c.code === so.customerId);

  const handleForward = () => {
    updateSalesOrder(so.id, {
      designLink,
      status: 'Waiting Approval',
      submittedAt: new Date().toISOString(),
    });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900 m-0">{so.id}</h2>
            <p className="text-xs text-gray-500 m-0 mt-1">{so.partNumber} - {so.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
        </div>
        <div className="px-6 py-5">
          {step === 'done' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-gray-900 mb-1">Desain Diteruskan ke Owner</h3>
              <p className="text-sm text-gray-500 mb-4">Status SO diubah menjadi "Waiting Approval"</p>
              <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg border-none cursor-pointer">Tutup</button>
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-4 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 m-0">Konfirmasi meneruskan desain ke Owner untuk approval?</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="text-gray-900 font-medium">{customer?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Qty</span><span className="text-gray-900 font-medium">{so.quantity} {so.unit}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1 font-medium decoration-transparent hover:underline">Lihat <ExternalLink size={11} /></a>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="flex-1 py-2 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg hover:bg-gray-50 cursor-pointer">Kembali</button>
                <button onClick={handleForward} className="flex-1 py-2 bg-blue-600 text-white text-sm border-none rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer font-medium">
                  <Send size={15} /> Forward ke Owner
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500 m-0">Customer</p><p className="text-gray-900 m-0 font-medium">{customer?.name}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Qty</p><p className="text-gray-900 m-0 font-medium">{so.quantity} {so.unit}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Deadline</p><p className="text-gray-900 m-0 font-medium">{so.deadline}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Input SO</p><p className="text-gray-900 m-0 font-medium">{so.createdAt}</p></div>
              </div>
              {so.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-xs text-rose-700 m-0"><strong>Catatan Revisi dari Owner:</strong> {so.rejectionReason}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5 font-medium">Link Desain / Drawing <span className="text-red-500">*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600" />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-50 cursor-pointer">Batal</button>
                <button onClick={() => setStep('confirm')} disabled={!designLink.trim()}
                  className="flex-1 py-2.5 bg-blue-600 border-none text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-medium">
                  <Send size={15} /> Submit & Forward
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EngineeringPage() {
  const navigate = useNavigate();
  const { salesOrders, customers } = useApp();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  // Stats
  const pendingDesign = salesOrders.filter(so => so.status === 'Pending Design').length;
  const revisionRequired = salesOrders.filter(so => so.status === 'Revision Required').length;
  const waitingApproval = salesOrders.filter(so => so.status === 'Waiting Approval').length;
  const inProduction = salesOrders.filter(so => so.status === 'In Production' || so.status === 'Ready for Production').length;
  const qc = salesOrders.filter(so => so.status === 'QC').length;

  // Queue sorting exactly as old EngineeringPage
  const STATUS_ORDER = ['Revision Required', 'Pending Design', 'Waiting Approval'];
  const queue = salesOrders
    .filter(so => STATUS_ORDER.includes(so.status))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const summaryCards = [
    {
      label: "Total Antrian",
      value: queue.length,
      icon: <List size={18} />,
      accent: "#06B6D4",
      bg: "rgba(6,182,212,0.08)",
      change: "Tugas Desain Aktif",
    },
    {
      label: "Perlu Revisi",
      value: revisionRequired,
      icon: <AlertTriangle size={18} />,
      accent: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
      change: "Dari Owner",
    },
    {
      label: "Menunggu Approval",
      value: waitingApproval,
      icon: <Clock size={18} />,
      accent: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
      change: "Sedang di-review",
    },
    {
      label: "In Production",
      value: inProduction,
      icon: <Factory size={18} />,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      change: "Aktif di workshop",
    },
  ];

  const workflowStats = [
    { label: "Pending Design",    count: pendingDesign,    color: "#94A3B8" },
    { label: "Revision Required", count: revisionRequired, color: "#EF4444" },
    { label: "Waiting Approval",  count: waitingApproval,  color: "#F59E0B" },
    { label: "In Production",     count: inProduction,     color: "#3B82F6" },
    { label: "QC",                count: qc,               color: "#06B6D4" },
  ];

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Engineering Dashboard</h1>
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

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }} className="lg-grid-cols-1">
        
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          
          {/* Design Queue Table */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Pencil size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Tugas Desain</span>
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
              {["No. SO", "Pelanggan", "Produk", "Deadline", "Status"].map((h) => (
                <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {queue.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: S.secondary, fontSize: "13px" }}>
                <CheckCircle size={32} style={{ color: "#86EFAC", margin: "0 auto 10px" }} />
                <p style={{ margin: 0 }}>Semua pesanan sudah selesai didesain.</p>
              </div>
            ) : (
              queue.slice(0, 5).map((order, idx) => (
                <div
                  key={order.id}
                  onClick={() => {
                    if (order.status !== 'Waiting Approval') {
                      setSelectedSO(order);
                    }
                  }}
                  style={{
                    display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px",
                    padding: "10px 18px", cursor: order.status !== 'Waiting Approval' ? "pointer" : "default",
                    borderBottom: idx < queue.length - 1 ? `1px solid ${S.border}` : "none",
                    transition: "background 0.1s",
                    opacity: order.status === 'Waiting Approval' ? 0.8 : 1,
                  }}
                  onMouseEnter={e => { if(order.status !== 'Waiting Approval') e.currentTarget.style.background = "#F8FAFC" }}
                  onMouseLeave={e => { if(order.status !== 'Waiting Approval') e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500 }}>{order.id}</span>
                  <div>
                    <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500 }}>{customers.find(c => c.code === order.customerId)?.name || "-"}</p>
                  </div>
                  <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{order.description}</span>
                  <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center", fontWeight: 500 }}>{order.deadline}</span>
                  <div style={{ alignSelf: "center" }}>
                    <StatusBadge status={order.status as SOStatus} />
                  </div>
                </div>
              ))
            )}
            
            {queue.length > 5 && (
              <div 
                onClick={() => navigate('/erp/engineer-tasks')}
                style={{ padding: "12px 18px", textAlign: "center", cursor: "pointer", background: S.bg, color: S.cyan, fontSize: "12.5px", fontWeight: 600, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#E0F2FE"}
                onMouseLeave={e => e.currentTarget.style.background = S.bg}
              >
                Lihat Semua Tugas ({queue.length})
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
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Pipeline Status</span>
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
              {[
                { label: "Buat Purchasing Req", icon: <Package size={13} />, path: "/erp/engineer-purchasing", primary: true },
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

      {selectedSO && <DesignModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
