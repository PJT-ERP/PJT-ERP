import React, { useState } from "react";
import { 
  Pencil, Send, Clock, CheckCircle, ExternalLink, Factory, Shield, 
  Package, LayoutDashboard, AlertTriangle, ArrowRight, TrendingUp, 
  ArrowUpRight, Users, CheckSquare, List
} from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { Quotation, QuotationStatus, getQuotationStatusColor, USERS } from "../components/data/mockData";
import { useNavigate } from "react-router";

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
  const cfg = getQuotationStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {cfg.label}
    </span>
  );
}

function DesignModal({ qut, onClose }: { qut: Quotation; onClose: () => void }) {
  const { updateQuotation, customers, currentUser } = useApp();
  const [designLink, setDesignLink] = useState(qut.designLink ?? '');
  const [step, setStep] = useState<'upload' | 'confirm' | 'done'>('upload');
  const customer = customers.find(c => c.code === qut.customerId);
  
  const isSpv = currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv';
  const isPendingSpv = qut.status === 'design_review';

  const handleForward = () => {
    updateQuotation(qut.id, {
      designLink,
      status: isSpv ? 'client_design_approval' : 'design_review',
    });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-gray-900 m-0">{qut.id}</h2>
            <p className="text-xs text-gray-500 m-0 mt-1">{qut.productName} - {qut.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
        </div>
        <div className="px-6 py-5">
          {step === 'done' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-gray-900 mb-1">
                {isSpv ? 'Desain Disetujui (Diteruskan ke Sales)' : 'Desain Menunggu Approval Supervisor'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isSpv ? 'Status Penawaran dikembalikan ke Sales untuk Validasi Klien.' : 'Status Penawaran menjadi "Design Review"'}
              </p>
              <button onClick={onClose} className="px-6 py-2 bg-red-600 text-white text-sm rounded-lg border-none cursor-pointer">Tutup</button>
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-4 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 m-0">
                  {isSpv ? 'Konfirmasi menyetujui desain dan BOM dari staf? Dokumen akan masuk ke tahap Validasi Klien.' : 'Konfirmasi meneruskan desain & BOM ke Supervisor untuk di-review?'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="text-gray-900 font-medium">{customer?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Qty</span><span className="text-gray-900 font-medium">{qut.quantity} {qut.unit}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" className="text-red-600 text-xs flex items-center gap-1 font-medium decoration-transparent hover:underline">Lihat <ExternalLink size={11} /></a>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="flex-1 py-2 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg hover:bg-gray-50 cursor-pointer">Kembali</button>
                <button onClick={handleForward} className="flex-1 py-2 bg-red-600 text-white text-sm border-none rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 cursor-pointer font-medium">
                  <Send size={15} /> {isSpv ? 'Approve & Forward' : 'Forward ke Supervisor'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500 m-0">Customer</p><p className="text-gray-900 m-0 font-medium">{customer?.name}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Qty</p><p className="text-gray-900 m-0 font-medium">{qut.quantity} {qut.unit}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Deadline</p><p className="text-gray-900 m-0 font-medium">{qut.deadline}</p></div>
                <div><p className="text-xs text-gray-500 m-0">Tanggal Request</p><p className="text-gray-900 m-0 font-medium">{qut.createdAt}</p></div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 m-0">Silakan unggah dokumen CAD dan daftar material (BOM) ke folder cloud proyek ini, lalu tempelkan linknya di bawah.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1.5 font-medium">Link Desain / Drawing & BOM <span className="text-red-500">*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-red-600" />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-50 cursor-pointer">Batal</button>
                <button onClick={() => setStep('confirm')} disabled={!designLink.trim()}
                  className="flex-1 py-2.5 bg-red-600 border-none text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-medium">
                  <Send size={15} /> {isSpv && isPendingSpv ? 'Review & Approve' : 'Submit & Forward'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignEngineerModal({ qut, onClose }: { qut: Quotation; onClose: () => void }) {
  const { updateQuotation } = useApp();
  const engineers = USERS.filter(u => u.role === 'Engineering' && u.username !== 'eng_spv');
  
  const handleAssign = (userId: string) => {
    updateQuotation(qut.id, { assignedTo: userId });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg text-gray-900 m-0 mb-4 font-semibold font-sans">Tugaskan Desain</h2>
        <div className="space-y-2 flex flex-col gap-2">
          {engineers.map(eng => (
            <button key={eng.id} onClick={() => handleAssign(eng.id)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer bg-white">
              <p className="m-0 font-medium text-gray-900 text-sm">{eng.name}</p>
              <p className="m-0 text-xs text-gray-500">{eng.email}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-2 border border-gray-300 text-gray-700 bg-white text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer">Batal</button>
      </div>
    </div>
  );
}

export function EngineeringPage() {
  const navigate = useNavigate();
  const { quotations, salesOrders, customers, currentUser } = useApp();
  const [selectedQUT, setSelectedQUT] = useState<Quotation | null>(null);
  const [assignModalQUT, setAssignModalQUT] = useState<Quotation | null>(null);

  const isSpv = currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv';

  // Pre-Sales Design Queue
  const designQueue = quotations.filter(q => {
    if (q.status !== 'pending_design' && q.status !== 'design_review') return false;
    if (isSpv) return true;
    return q.assignedTo === currentUser?.id;
  });
  const pendingDesignCount = quotations.filter(q => q.status === 'pending_design').length;
  const designReviewCount = quotations.filter(q => q.status === 'design_review').length;

  // Production Stats
  const inProductionCount = salesOrders.filter(so => so.status === 'in_production' || so.status === 'material_preparation').length;
  const qcCount = salesOrders.filter(so => so.status === 'qc_check').length;

  const summaryCards = [
    {
      label: "Antrian Desain Baru",
      value: pendingDesignCount,
      icon: <List size={18} />,
      accent: "#C8102E",
      bg: "rgba(200,16,46,0.08)",
      change: "Dari Tim Sales",
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
    { label: "Pending Design",    count: pendingDesignCount,    color: "#94A3B8" },
    { label: "Waiting Spv",       count: designReviewCount,     color: "#8B5CF6" },
    { label: "In Production",     count: inProductionCount,     color: "#3B82F6" },
    { label: "QC",                count: qcCount,               color: "#C8102E" },
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
          
          {/* Pre-Sales Design Queue Table */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Pencil size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Tugas Desain (Pre-Sales)</span>
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
              {["No. QUT", "Pelanggan", "Produk", "Ditugaskan", "Status"].map((h) => (
                <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {designQueue.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: S.secondary, fontSize: "13px" }}>
                <CheckCircle size={32} style={{ color: "#86EFAC", margin: "0 auto 10px" }} />
                <p style={{ margin: 0 }}>Tidak ada antrean desain dari Sales.</p>
              </div>
            ) : (
              designQueue.slice(0, 10).map((qut, idx) => (
                <div
                  key={qut.id}
                  onClick={() => setSelectedQUT(qut)}
                  style={{
                    display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px",
                    padding: "10px 18px", cursor: "pointer",
                    borderBottom: idx < designQueue.length - 1 ? `1px solid ${S.border}` : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500 }}>{qut.id}</span>
                  <div>
                    <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500 }}>{customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
                  </div>
                  <span style={{ color: "#334155", fontSize: "12px", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{qut.productName}</span>
                  <div style={{ alignSelf: "center" }}>
                    {qut.assignedTo ? (
                      <span style={{ fontSize: "11px", background: S.bg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${S.border}`, color: S.slate, display: "inline-block" }}>
                        {USERS.find(u => u.id === qut.assignedTo)?.name || 'Engineer'}
                      </span>
                    ) : isSpv ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setAssignModalQUT(qut); }}
                        style={{ fontSize: "11px", background: S.cyan, color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}
                      >
                        Tugaskan
                      </button>
                    ) : (
                      <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                    )}
                  </div>
                  <div style={{ alignSelf: "center" }}>
                    <StatusBadge status={qut.status} />
                  </div>
                </div>
              ))
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

      {selectedQUT && <DesignModal qut={selectedQUT} onClose={() => setSelectedQUT(null)} />}
      {assignModalQUT && <AssignEngineerModal qut={assignModalQUT} onClose={() => setAssignModalQUT(null)} />}
    </div>
  );
}
