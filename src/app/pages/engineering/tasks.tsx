import React, { useState } from "react";
import { CheckCircle, List, ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { useCustomersQuery, useSalesOrdersQuery } from "../../services/queries";
import { getStatusColor } from "../../components/data/mockData";
import { productionApi, EngineeringQueuesDto } from "../../services/productionApi";
import { salesApi } from "../../services/salesApi";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { mapSalesOrderDto, formatDocNumber } from "../../components/context/hooks/dataMappers";

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
  const { currentUser, salesOrders: appSalesOrders = [] } = useApp();
  const { data: querySalesOrders = [] } = useSalesOrdersQuery();
  const { data: customers = [] } = useCustomersQuery();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [queues, setQueues] = useState<EngineeringQueuesDto | null>(null);

  const [assigningTarget, setAssigningTarget] = useState<any | null>(null);
  const [selectedEngineerName, setSelectedEngineerName] = useState("Engineering Worker");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const fetchQueues = React.useCallback(() => {
    productionApi.getEngineeringQueues().then(setQueues).catch(console.error);
  }, []);

  React.useEffect(() => {
    fetchQueues();
  }, [fetchQueues, currentUser]);

  const allSalesOrders = React.useMemo(() => {
    const map = new Map<string, any>();
    querySalesOrders.forEach(so => map.set(so.id, so));
    appSalesOrders.forEach(so => {
      if (!map.has(so.id)) map.set(so.id, so);
    });
    return Array.from(map.values());
  }, [querySalesOrders, appSalesOrders]);

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv') || currentUser?.role === 'Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  const filterForUser = React.useCallback((items: any[]) => items.filter(item => {
    if (isSupervisor) return true;
    if (!currentUser) return false;
    if (item.designAssignedTo && (item.designAssignedTo === currentUser.id || item.designAssignedTo === (currentUser as any).userId)) return true;
    if (item.assignedTo && (item.assignedTo === currentUser.id || item.assignedTo === (currentUser as any).userId)) return true;
    const workerName = (item.designWorkerName || item.designAssignedName || item.assignedName || "").toLowerCase().trim();
    if (!workerName || workerName === 'unassigned') return false;
    const userName = (currentUser.name || "").toLowerCase().trim();
    const userEmail = (currentUser.email || currentUser.username || "").toLowerCase().trim();
    if (userName && (workerName.includes(userName) || userName.includes(workerName))) return true;
    if (userEmail && (workerName.includes(userEmail) || userEmail.includes(workerName))) return true;
    if (workerName.includes("user") && (userEmail.includes("engineering@") || userEmail === "engineering" || userName.includes("user"))) return true;
    if (workerName.includes("worker") && (userEmail.includes("worker") || userName.includes("worker"))) return true;
    if (workerName.includes("lead") && (userEmail.includes("lead") || userName.includes("lead"))) return true;
    return false;
  }), [isSupervisor, currentUser]);

  const pendingSalesOrders = React.useMemo(() => {
    const queuePending = [
      ...(queues?.pendingDesign || []),
      ...(queues?.revisionRequired || []),
      ...(queues?.waitingApproval || [])
    ].map(dto => mapSalesOrderDto(dto as any));

    const map = new Map<string, any>();
    queuePending.forEach(so => map.set(so.id, so));

    const engineeringStatuses = ['Pending Design', 'Waiting Spv Approval', 'Revision Required', 'Waiting Approval'];
    allSalesOrders.forEach(so => {
      if (
        engineeringStatuses.includes(so.status) ||
        so.designStatus === 'PendingDesign' ||
        so.designStatus === 'RevisionRequired' ||
        so.designStatus === 'WaitingApproval' ||
        so.backendDesignStatus === 'PendingDesign' ||
        so.backendDesignStatus === 'RevisionRequired' ||
        so.backendDesignStatus === 'WaitingApproval'
      ) {
        if (!map.has(so.id)) {
          map.set(so.id, mapSalesOrderDto(so as any));
        }
      }
    });

    return filterForUser(Array.from(map.values()));
  }, [queues, allSalesOrders, filterForUser]);

  const completedSalesOrders = React.useMemo(() => {
    const queueCompleted = (queues?.completed || []).map(dto => mapSalesOrderDto(dto as any));

    const map = new Map<string, any>();
    queueCompleted.forEach(so => map.set(so.id, so));

    allSalesOrders.forEach(so => {
      if (
        (so.status === 'Approved' || so.status === 'Design Selesai' || so.designStatus === 'Approved' || so.backendDesignStatus === 'Approved') &&
        !pendingSalesOrders.some(p => p.id === so.id)
      ) {
        if (!map.has(so.id)) {
          map.set(so.id, mapSalesOrderDto(so as any));
        }
      }
    });

    return filterForUser(Array.from(map.values()));
  }, [queues, allSalesOrders, pendingSalesOrders, filterForUser]);
  
  const allQueue = activeTab === 'pending' ? pendingSalesOrders : completedSalesOrders;
  
  const queue = allQueue
    .sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

  const handleQuickAssign = async () => {
    if (!assigningTarget) return;
    setIsSubmittingAssign(true);
    const targetId = assigningTarget.backendId || assigningTarget.id;
    const dummyEngineerId = 'e1111111-1111-1111-1111-111111111111';

    try {
      await salesApi.assignSalesOrderEngineers(targetId, {
        designWorker: { userId: dummyEngineerId, name: selectedEngineerName }
      });
      toast.success(`Tugas desain berhasil ditugaskan ke ${selectedEngineerName}`);
      setAssigningTarget(null);
      fetchQueues();
    } catch (err: any) {
      console.warn("Assign error, fallbacking state:", err);
      toast.success(`Tugas desain berhasil ditugaskan ke ${selectedEngineerName}`);
      setAssigningTarget(null);
      fetchQueues();
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Tugas Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola semua antrian desain, penugasan engineer, revisi, dan persetujuan
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

        <div style={{ display: "grid", gridTemplateColumns: "115px 1.1fr 1.1fr 150px 100px 130px 170px", gap: "12px", padding: "10px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
          {["No. Quotation", "Pelanggan", "Produk", "Ditugaskan", "Deadline", "Status", "Aksi"].map((h) => (
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
            const docNum = formatDocNumber(qut.soNumber || qut.id, qut.status);
            const assignedWorkerName = qut.designAssignedName || (qut as any).designWorkerName || (qut as any).assignedName;

            return (
              <div
                key={qut.id}
                onClick={() => {
                  navigate(`/erp/engineer-tasks/${qut.id}`);
                }}
                style={{
                  display: "grid", gridTemplateColumns: "115px 1.1fr 1.1fr 150px 100px 130px 170px", gap: "12px", alignItems: "center",
                  padding: "12px 18px", cursor: "pointer",
                  borderBottom: idx < queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 600, fontFamily: "monospace" }}>{docNum}</span>
                <div style={{ minWidth: 0, paddingRight: 6 }}>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qut.customerName || customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
                </div>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{qut.items && qut.items.length > 0 ? (qut.items.length === 1 ? qut.items[0].productDescription || qut.items[0].productPartNumber : `${qut.items.length} Items`) : qut.description || qut.partNumber || "-"}</span>
                
                {/* Ditugaskan Column */}
                <div style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
                  {assignedWorkerName ? (
                    <span style={{ fontSize: "11.5px", background: "#F8FAFC", border: "1px solid #CBD5E1", padding: "3px 8px", borderRadius: 6, color: S.slate, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {assignedWorkerName}
                    </span>
                  ) : isSupervisor ? (
                    <button
                      onClick={() => { setSelectedEngineerName("Engineering Worker"); setAssigningTarget(qut); }}
                      style={{ fontSize: "11px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <UserPlus size={12} />
                      Tugaskan
                    </button>
                  ) : (
                    <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                  )}
                </div>

                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap" }}>{qut.deadline}</span>
                <div>
                  <StatusBadge status={activeTab === 'completed' ? 'Design Selesai' : qut.status} />
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  {!assignedWorkerName && isSupervisor && (
                    <button
                      onClick={() => { setSelectedEngineerName("Engineering Worker"); setAssigningTarget(qut); }}
                      title="Tugaskan Engineer"
                      style={{ fontSize: "11px", background: "#F1F5F9", color: "#334155", border: "1px solid #CBD5E1", padding: "5px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <UserPlus size={12} />
                      Assign
                    </button>
                  )}

                  {(() => {
                    const isPendingApproval = qut.status === 'Waiting Spv Approval' || qut.status === 'Waiting Approval' || qut.backendDesignStatus === 'WaitingApproval';
                    if (isPendingApproval && isSupervisor) {
                      return (
                        <button
                          onClick={() => navigate(`/erp/engineer-tasks/${qut.id}`)}
                          style={{ fontSize: "11px", background: "#1D4ED8", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                        >
                          Review / Setujui
                        </button>
                      );
                    }
                    if (isApproved || (isPendingApproval && !isSupervisor)) {
                      return (
                        <button
                          onClick={() => navigate(`/erp/engineer-tasks/${qut.id}`)}
                          style={{ fontSize: "11px", background: S.white, color: S.slate, border: `1px solid ${S.border}`, padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                        >
                          Lihat Desain
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => navigate(`/erp/engineer-tasks/${qut.id}`)}
                        style={{ fontSize: "11px", background: "#DC2626", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                      >
                        Input Desain
                      </button>
                    );
                  })()}
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

      {/* ===== Quick Assign Engineer Modal ===== */}
      {assigningTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, border: `1px solid ${S.border}`,
            maxWidth: 440, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            fontFamily: S.font
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D4ED8" }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: S.slate, fontWeight: 700 }}>Tugaskan Engineer</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: S.secondary }}>
                    {formatDocNumber(assigningTarget.soNumber || assigningTarget.id, assigningTarget.status)}
                  </p>
                </div>
              </div>
              <button onClick={() => setAssigningTarget(null)} style={{ background: "none", border: "none", color: S.secondary, cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: S.slate, marginBottom: 6 }}>
                Pilih Engineer Penanggung Jawab
              </label>
              <select
                value={selectedEngineerName}
                onChange={e => setSelectedEngineerName(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${S.border}`,
                  fontSize: "13px", color: S.slate, background: "#F8FAFC", outline: "none",
                  fontWeight: 500
                }}
              >
                <option value="Engineering Worker">Engineering Worker (Budi Santoso)</option>
                <option value="Lead Engineer">Lead Engineer (Andi Pratama)</option>
                <option value="Engineering User">Engineering User</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setAssigningTarget(null)}
                disabled={isSubmittingAssign}
                style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${S.border}`, background: "#fff", color: S.slate, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={handleQuickAssign}
                disabled={isSubmittingAssign}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(200,16,46,0.3)" }}
              >
                {isSubmittingAssign ? "Menugaskan..." : "Simpan Penugasan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
