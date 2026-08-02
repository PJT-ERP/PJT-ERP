import React, { useState } from "react";
import { CheckCircle, List, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { useCustomersQuery } from "../../services/queries";
import { getStatusColor } from "../../components/data/mockData";
import { productionApi, EngineeringQueuesDto } from "../../services/productionApi";
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
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}


import { mapSalesOrderDto } from "../../components/context/hooks/dataMappers";

export function EngineeringTasksPage() {
  const { currentUser } = useApp();
  const { data: customers = [] } = useCustomersQuery();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [queues, setQueues] = useState<EngineeringQueuesDto | null>(null);

  React.useEffect(() => {
    productionApi.getEngineeringQueues().then(setQueues).catch(console.error);
  }, [currentUser]);

  const rawPending = [
    ...(queues?.pendingDesign || []),
    ...(queues?.revisionRequired || []),
    ...(queues?.waitingApproval || [])
  ].map(dto => mapSalesOrderDto(dto as any));
  const rawCompleted = (queues?.completed || []).map(dto => mapSalesOrderDto(dto as any));

  const pendingSalesOrders = rawPending;
  const completedSalesOrders = rawCompleted;
  
  const allQueue = activeTab === 'pending' ? pendingSalesOrders : completedSalesOrders;
  
  const queue = allQueue
    .sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

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

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Semua Antrian Desain</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: activeTab === 'completed' ? "95px 1.2fr 1.2fr 210px 105px 150px 140px" : "95px 1.2fr 1.2fr 105px 150px 140px", gap: "14px", padding: "10px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
          {(activeTab === 'completed' ? ["No. SO", "Pelanggan", "Produk", "Desain Ditugaskan", "Deadline", "Status", "Aksi"] : ["No. SO", "Pelanggan", "Produk", "Deadline", "Status", "Aksi"]).map((h) => (
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
            const isApproved = qut.backendDesignStatus === 'Approved' || activeTab === 'completed' || !isPreProduction;

            return (
              <div
                key={qut.id}
                onClick={() => {
                  navigate(`/erp/engineer-tasks/${qut.id}`);
                }}
                style={{
                  display: "grid", gridTemplateColumns: activeTab === 'completed' ? "95px 1.2fr 1.2fr 210px 105px 150px 140px" : "95px 1.2fr 1.2fr 105px 150px 140px", gap: "14px", alignItems: "center",
                  padding: "12px 18px", cursor: "pointer",
                  borderBottom: idx < queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{qut.soNumber || qut.id}</span>
                <div style={{ minWidth: 0, paddingRight: 6 }}>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qut.customerName || customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
                </div>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{qut.items && qut.items.length > 0 ? (qut.items.length === 1 ? qut.items[0].productDescription || qut.items[0].productPartNumber : `${qut.items.length} Items`) : qut.description || qut.partNumber || "-"}</span>
                {activeTab === 'completed' && (
                  <div style={{ minWidth: 0 }}>
                    {qut.designAssignedName || (qut as any).designWorkerName || (qut as any).designApprovedByName ? (
                      <span style={{ fontSize: "11.5px", background: "#F8FAFC", border: "1px solid #CBD5E1", padding: "4px 8px", borderRadius: 6, color: S.slate, fontWeight: 500, display: "inline-flex", alignItems: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {qut.designAssignedName || (qut as any).designWorkerName || (qut as any).designApprovedByName}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                    )}
                  </div>
                )}
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap" }}>{qut.deadline}</span>
                <div>
                  <StatusBadge status={activeTab === 'completed' ? 'Design Selesai' : qut.status} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!isApproved && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/erp/engineer-tasks/${qut.id}`);
                      }}
                      style={{ fontSize: "11px", background: "#DC2626", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                    >
                      Input Desain
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
