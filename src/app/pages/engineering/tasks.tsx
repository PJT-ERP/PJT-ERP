import React, { useState } from "react";
import { CheckCircle, List, ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { useCustomersQuery, useSalesOrdersQuery } from "../../services/queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStatusColor } from "../../components/data/mockData";
import { productionApi, EngineeringQueuesDto } from "../../services/productionApi";
import { salesApi } from "../../services/salesApi";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { mapQuotationDto, mapSalesOrderDto, formatDocNumber, isQuotationEntry } from "../../components/context/hooks/dataMappers";
import { isGuid, toBackendUserId } from "../../services/backendIds";

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
  const { currentUser, users, salesOrders: appSalesOrders = [] } = useApp();
  const { data: querySalesOrders = [] } = useSalesOrdersQuery();
  const { data: quotationDtos = [], error: quotationError, isError: quotationIsError, isLoading: quotationsLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => salesApi.listQuotations(),
  });
  const { data: customers = [] } = useCustomersQuery();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [queues, setQueues] = useState<EngineeringQueuesDto | null>(null);

  const [assigningTarget, setAssigningTarget] = useState<any | null>(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState("");
  const [selectedEngineerName, setSelectedEngineerName] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const fetchQueues = React.useCallback(() => {
    productionApi.getEngineeringQueues().then(setQueues).catch(console.error);
  }, []);

  React.useEffect(() => {
    fetchQueues();
  }, [fetchQueues, currentUser]);

  const quotationTasks = React.useMemo(() => quotationDtos.map(dto => mapQuotationDto(dto)), [quotationDtos]);

  const allSalesOrders = React.useMemo(() => {
    const map = new Map<string, any>();
    const add = (order: any) => {
      const key = isQuotationEntry(order)
        ? `quotation:${order.soNumber || order.quotationNumber || order.id}`
        : `order:${order.backendId || order.id}`;
      map.set(key, order);
    };
    querySalesOrders.forEach(add);
    appSalesOrders.forEach(so => {
      const key = isQuotationEntry(so)
        ? `quotation:${so.soNumber || so.quotationNumber || so.id}`
        : `order:${so.backendId || so.id}`;
      if (!map.has(key)) add(so);
    });
    // Dedicated quotation DTOs override any legacy-shaped copy so the task keeps
    // its Quotation GUID and cannot be routed to the SalesOrder assignment API.
    quotationTasks.forEach(add);
    return Array.from(map.values());
  }, [querySalesOrders, appSalesOrders, quotationTasks]);

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv') || currentUser?.role === 'Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';
  const canAssignEngineer = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin';
  const engineerOptions = users.filter(user => user.role === 'Engineering' && user.isActive !== false)
    .map(user => ({ user, id: toBackendUserId(user) }))
    .filter((entry): entry is { user: typeof users[number]; id: string } => Boolean(entry.id));

  const filterForUser = React.useCallback((items: any[]) => items.filter(item => {
    if (isSupervisor) return true;
    if (!currentUser) return false;
    if (isQuotationEntry(item)) {
      const currentEngineerId = toBackendUserId(currentUser);
      return Boolean(currentEngineerId && item.designAssignedTo === currentEngineerId);
    }
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
          map.set(so.id, isQuotationEntry(so) ? so : mapSalesOrderDto(so as any));
        }
      }
    });

    // Use the dedicated Quotation DTO (including its database GUID and assignment)
    // as the source of truth for quotation tasks in this mixed legacy queue.
    quotationTasks
      .filter(quotation => engineeringStatuses.includes(quotation.status))
      .forEach(quotation => map.set(quotation.id, quotation));

    return filterForUser(Array.from(map.values()));
  }, [queues, allSalesOrders, quotationTasks, filterForUser]);

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
    if (!selectedEngineerId || !selectedEngineerName) {
      toast.error("Pilih Engineer yang valid sebelum menyimpan penugasan.");
      return;
    }
    setIsSubmittingAssign(true);
    const isQuo = isQuotationEntry(assigningTarget);

    try {
      if (isQuo) {
        const quotationId = assigningTarget.backendId || (isGuid(assigningTarget.id) ? assigningTarget.id : null);
        if (!quotationId || !isGuid(quotationId)) {
          throw new Error("Quotation database ID tidak tersedia. Penugasan tidak dikirim.");
        }
        const updatedQuotation = await salesApi.assignQuotationEngineer(quotationId, {
          engineerId: selectedEngineerId,
          engineerName: selectedEngineerName
        });
        queryClient.setQueryData<any[]>(['quotations'], previous => [
          ...(previous || []).filter(quotation => quotation.id !== updatedQuotation.id),
          updatedQuotation,
        ]);
      } else {
        const salesOrderId = assigningTarget.backendId || assigningTarget.id;
        await salesApi.assignSalesOrderEngineers(salesOrderId, {
          designWorker: { userId: selectedEngineerId, name: selectedEngineerName }
        });
      }
      toast.success(`Tugas desain berhasil ditugaskan ke ${selectedEngineerName}`);
      setAssigningTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['salesOrders'] }),
        queryClient.invalidateQueries({ queryKey: ['quotations'] }),
      ]);
      fetchQueues();
    } catch (err: any) {
      console.error("Assignment request failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Penugasan Engineer gagal disimpan.");
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

      <div className="overflow-x-auto" style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6 }}>
        <div style={{ minWidth: 1050 }}>
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

          {quotationIsError ? (
            <div role="alert" style={{ padding: "24px 20px", textAlign: "center", color: "#B91C1C", fontSize: "13.5px" }}>
              Gagal memuat tugas quotation Engineering: {(quotationError as any)?.response?.data?.message || (quotationError as any)?.message || "Terjadi kesalahan saat mengambil data."}
            </div>
          ) : quotationsLoading && queue.length === 0 ? (
            <div aria-live="polite" style={{ padding: "60px 20px", textAlign: "center", color: S.secondary, fontSize: "13.5px" }}>
              Memuat antrian desain...
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
              <p style={{ color: S.slate, margin: 0, fontSize: "13.5px" }}>Semua pesanan sudah selesai didesain.</p>
            </div>
          ) : (
            queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((qut, idx) => {
              const isPreProduction = !(['Ready for Production', 'In Production', 'Paused', 'QC', 'Completed'].includes(qut.status)) && !qut.startTime && !qut.qcStatus;
              const isApproved = qut.backendDesignStatus === 'Approved' || activeTab === 'completed' || !isPreProduction;
              const docNum = formatDocNumber(qut.soNumber || qut.id, qut.status);
              const assignedWorkerId = qut.designAssignedTo || (qut as any).assignedTo;
              const assignedWorkerName = qut.designAssignedName
                || (qut as any).designWorkerName
                || (qut as any).assignedName
                || engineerOptions.find(entry => entry.id === assignedWorkerId)?.user.name
                || (assignedWorkerId ? "Engineer ditugaskan" : null);

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
                      <span 
                        onClick={() => { if (canAssignEngineer) { setSelectedEngineerId(assignedWorkerId || ""); setSelectedEngineerName(assignedWorkerName || ""); setAssigningTarget(qut); } }}
                        title={canAssignEngineer ? "Klik untuk ganti engineer" : undefined}
                        style={{ fontSize: "11.5px", background: "#F8FAFC", border: "1px solid #CBD5E1", padding: "3px 8px", borderRadius: 6, color: S.slate, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: canAssignEngineer ? "pointer" : "default" }}
                      >
                        {assignedWorkerName}
                      </span>
                    ) : canAssignEngineer ? (
                      <button
                        onClick={() => { setSelectedEngineerId(""); setSelectedEngineerName(""); setAssigningTarget(qut); }}
                        style={{ fontSize: "11px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <UserPlus size={12} />
                        Tugaskan
                      </button>
                    ) : (
                      <span style={{ fontSize: "11.5px", color: S.secondary, fontStyle: "italic" }}>
                        Belum Ditugaskan
                      </span>
                    )}
                  </div>

                  <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap" }}>{qut.deadline}</span>
                  <div>
                    <StatusBadge status={activeTab === 'completed' ? 'Design Selesai' : qut.status} />
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
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
                aria-label="Pilih Engineer Penanggung Jawab"
                value={selectedEngineerId}
                onChange={e => {
                  const selected = engineerOptions.find(entry => entry.id === e.target.value);
                  setSelectedEngineerId(e.target.value);
                  setSelectedEngineerName(selected?.user.name || "");
                }}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${S.border}`,
                  fontSize: "13px", color: S.slate, background: "#F8FAFC", outline: "none",
                  fontWeight: 500
                }}
              >
                <option value="">Pilih Engineer</option>
                {engineerOptions.map(({ user, id }) => <option key={id} value={id}>{user.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setAssigningTarget(null)}
                disabled={isSubmittingAssign || !selectedEngineerId}
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
