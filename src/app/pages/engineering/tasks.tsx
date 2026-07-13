import React, { useState } from "react";
import { Send, CheckCircle, ExternalLink, List, Plus, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { SalesOrder, getStatusColor } from "../../components/data/mockData";
import { salesApi } from "../../services/salesApi";
import { toBackendUserId, isGuid } from "../../services/backendIds";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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


export function EngineeringTasksPage() {
  const { salesOrders, customers, currentUser, users } = useApp();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv') || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';
  
  const engineeringStatuses = ['Pending Design', 'Waiting Spv Approval', 'Revision Required', 'Rejected'];
  
  const pendingSalesOrders = salesOrders.filter(so => engineeringStatuses.includes(so.status) || so.backendDesignStatus === 'PendingDesign' || so.backendDesignStatus === 'RevisionRequired' || so.backendDesignStatus === 'WaitingApproval');
  const completedSalesOrders = salesOrders.filter(so => 
    !engineeringStatuses.includes(so.status) && 
    so.backendDesignStatus === 'Approved' &&
    (so.designAssignedTo || so.designLink || (so.designRevisions && so.designRevisions.length > 0))
  );
  const allQueue = activeTab === 'pending' ? pendingSalesOrders : completedSalesOrders;
  
  const queue = allQueue
    .filter(q => {
      if (isSpv) return true;
      return q.designAssignedTo === currentUser?.id || q.designAssignedTo === currentUser?.name || q.designAssignedName === currentUser?.name;
    })
    .sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

  const waitingReview = pendingSalesOrders.filter(item => isSpv && (item.backendDesignStatus === 'WaitingApproval' || item.status === 'Waiting Spv Approval'));

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Tugas Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola semua antrian desain, revisi, dan status persetujuan
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${S.border}`, marginTop: 8 }}>
        <button
          onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
          style={{
            background: "none", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            color: activeTab === 'pending' ? S.cyan : S.secondary,
            borderBottom: activeTab === 'pending' ? `2px solid ${S.cyan}` : "2px solid transparent",
            padding: "0 4px 12px", marginBottom: "-1px", transition: "all 0.2s"
          }}
        >
          Sedang Berjalan
        </button>
        <button
          onClick={() => { setActiveTab('completed'); setCurrentPage(1); }}
          style={{
            background: "none", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            color: activeTab === 'completed' ? S.cyan : S.secondary,
            borderBottom: activeTab === 'completed' ? `2px solid ${S.cyan}` : "2px solid transparent",
            padding: "0 4px 12px", marginBottom: "-1px", transition: "all 0.2s"
          }}
        >
          Riwayat Selesai
        </button>
      </div>

      {isSpv && activeTab === 'pending' && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, background: "#F59E0B", borderRadius: "50%" }}></span>
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Menunggu Review Supervisor ({waitingReview.length})</span>
            </div>
          </div>
          
          {waitingReview.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <CheckCircle size={32} style={{ color: "#22C55E", margin: "0 auto 12px" }} />
              <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada desain yang perlu direview</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {waitingReview.map((item, idx) => {
                const customer = customers.find(c => c.code === item.customerId);
                const daysDiff = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < waitingReview.length - 1 ? `1px solid ${S.border}` : "none" }}>
                    <div style={{ width: 40, height: 40, background: "#FEF3C7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706", flexShrink: 0 }}>
                      <Clock size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{item.id}</span>
                        <StatusBadge status={item.status} />
                        {daysDiff <= 7 && daysDiff >= 0 && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FFF7ED", color: "#EA580C", borderRadius: 4, fontWeight: 500, border: "1px solid #FFEDD5" }}>{daysDiff} hari lagi</span>}
                        {daysDiff < 0 && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>{Math.abs(daysDiff)}h terlambat</span>}
                      </div>
                      <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{item.description || item.partNumber || "-"}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                        <span>{customer?.name || "-"}</span><span>·</span><span>{item.quantity} {item.unit}</span><span>·</span><span style={{ color: daysDiff < 0 ? "#DC2626" : S.secondary }}>Deadline: {item.deadline}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/erp/engineer-tasks/${item.id}`)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      Review Desain
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Semua Antrian Desain</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "95px 1.2fr 1.2fr 210px 105px 150px 140px", gap: "14px", padding: "10px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
          {["No. SO", "Pelanggan", "Produk", "Ditugaskan", "Deadline", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
            <p style={{ color: S.slate, margin: 0, fontSize: "13.5px" }}>Semua pesanan sudah selesai didesain.</p>
          </div>
        ) : (
          queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((qut, idx) => {
            const isPreProduction = !(['Ready for Production', 'In Production', 'Paused', 'QC', 'Completed'].includes(qut.status)) && !qut.startTime && !qut.qcStatus;
            const isWaitingReview = qut.backendDesignStatus === 'WaitingApproval' || qut.status === 'Waiting Spv Approval';
            const isApproved = qut.backendDesignStatus === 'Approved' || activeTab === 'completed' || !isPreProduction;

            return (
              <div
                key={qut.id}
                onClick={() => {
                  navigate(`/erp/engineer-tasks/${qut.id}`);
                }}
                style={{
                  display: "grid", gridTemplateColumns: "95px 1.2fr 1.2fr 210px 105px 150px 140px", gap: "14px", alignItems: "center",
                  padding: "12px 18px", cursor: "pointer",
                  borderBottom: idx < queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{qut.id}</span>
                <div style={{ minWidth: 0, paddingRight: 6 }}>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
                </div>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{qut.description || qut.partNumber || "-"}</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "11px", background: "#E0F2FE", padding: "3px 8px", borderRadius: 6, border: "1px solid #7DD3FC", color: "#0369A1", fontWeight: 600, display: "inline-flex", alignItems: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Ditangani: SPV Engineering
                  </span>
                </div>
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap" }}>{qut.deadline}</span>
                <div>
                  <StatusBadge status={activeTab === 'completed' ? 'Design Selesai' : qut.status} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!isApproved && !isWaitingReview && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/erp/engineer-tasks/${qut.id}`);
                      }}
                      style={{ fontSize: "11px", background: "#2563EB", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                    >
                      Input CAD / Desain
                    </button>
                  )}

                  {!isApproved && isWaitingReview && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/erp/engineer-tasks/${qut.id}`);
                      }}
                      style={{ fontSize: "11px", background: "#F59E0B", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                    >
                      Review & Finalisasi
                    </button>
                  )}

                  {isApproved && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/erp/engineer-tasks/${qut.id}`);
                      }}
                      style={{ fontSize: "11px", background: S.white, color: S.slate, border: `1px solid ${S.border}`, padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                    >
                      Lihat Desain
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {queue.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, queue.length)} dari {queue.length} hasil
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(queue.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minWidth: 28, height: 28, padding: "0 8px",
                    borderRadius: 8, border: "none",
                    background: p === currentPage ? S.cyan : "transparent",
                    color: p === currentPage ? "#FFFFFF" : "#475569",
                    fontSize: "13.5px", fontWeight: p === currentPage ? 600 : 500,
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(queue.length / itemsPerPage), p + 1))} 
                disabled={currentPage >= Math.ceil(queue.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
