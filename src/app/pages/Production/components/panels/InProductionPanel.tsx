import React, { useState } from "react";
import { Clock, PlayCircle, PauseCircle, CheckSquare, FileWarning } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { S, StatusBadge, DrawingLinks } from "../../../../components/production/ProductionHelpers";
import { PaginationControl } from "../../../../components/production/PaginationControl";
import { InlineBomDisplay } from "../InlineBomDisplay";
import { useProductionBoard } from "../../hooks/useProductionBoard";
import { SalesOrder } from "../../../../components/data/mockData";

interface Props {
  board: ReturnType<typeof useProductionBoard>;
}

export function InProductionPanel({ board }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const {
    isSupervisor,
    currentUser,
    users,
    inProduction,
    checkMaterialShortage,
    getMaterialRequestState,
    setDetailModal,
    setStartModal,
    setPauseModal,
    setCompleteModal,
    notifiedSoIds,
    setNotifiedSoIds
  } = board;
  
  const currentBackendUserId = currentUser?.id || "";

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} style={{ color: S.cyan }} />
          <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Sedang Diproduksi ({inProduction.length})</span>
        </div>
      </div>
      {inProduction.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang sedang beroperasi</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {inProduction.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((so: SalesOrder, idx: number) => {
            const operator = users.find((u: any) => u.id === so.assignedTo)?.name || so.assignedName || "-";
            let isLate = false;
            let daysLate = 0;
            if (so.deadline) {
              const todayStr = new Date().toISOString().split("T")[0];
              const deadlineStr = so.deadline.split("T")[0];
              const tDate = new Date(todayStr);
              const dDate = new Date(deadlineStr);
              if (tDate > dDate) {
                isLate = true;
                daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
              }
            }
            const mrState = getMaterialRequestState(so);
            const isShortage = checkMaterialShortage(so);

            return (
              <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < inProduction.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {isLate && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Telat {daysLate} Hari</span>}
                      {so.status === 'Paused' && so.pauseReason?.toLowerCase().includes("material") && (
                        <>
                          {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                          {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                          {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                          {mrState === 'completed' && isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                          {!isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>Material Lengkap</span>}
                          {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                      <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                      <span>Operator: <strong style={{ color: S.slate }}>{operator}</strong></span>
                      <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                      <DrawingLinks so={so} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {so.status === 'Paused' && so.pauseReason?.toLowerCase().includes("material") && isShortage && (
                      <>
                        {(mrState === 'none' || mrState === 'completed') && (isSupervisor || (!notifiedSoIds.has(so.id) && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId))) && (
                          <button 
                            onClick={() => {
                              if (isSupervisor) {
                                navigate(`/erp/production/mr/${so.id}`);
                              } else {
                                toast.success("Notifikasi telah dikirim ke Supervisor untuk mereview kebutuhan material.", { duration: 4000 });
                                setNotifiedSoIds((prev: Set<string>) => new Set(prev).add(so.id));
                              }
                            }}
                            style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <FileWarning size={14} /> Material Kurang
                          </button>
                        )}
                        {mrState === 'rejected' && (isSupervisor || (!notifiedSoIds.has(so.id) && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId))) && (
                          <button 
                            onClick={() => {
                              if (isSupervisor) {
                                navigate(`/erp/production/mr/${so.id}`);
                              } else {
                                toast.success("Notifikasi telah dikirim ke Supervisor untuk mengajukan ulang Material Request.", { duration: 4000 });
                                setNotifiedSoIds((prev: Set<string>) => new Set(prev).add(so.id));
                              }
                            }}
                            style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <FileWarning size={14} /> Ajukan Ulang MR
                          </button>
                        )}
                      </>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <>
                        {so.status === 'Paused' ? (
                          <>
                            {so.pauseReason?.toLowerCase().includes("material") && isShortage ? (
                              <button disabled title="Menunggu material lengkap"
                                style={{ padding: "8px 16px", background: "#E5E7EB", color: "#9CA3AF", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                                <Clock size={14} /> Menunggu Material
                              </button>
                            ) : (
                              <button onClick={() => setStartModal(so)}
                                style={{ padding: "8px 16px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                                <PlayCircle size={14} /> Lanjutkan Produksi
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => setPauseModal(so)}
                            style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <PauseCircle size={14} /> Jeda Produksi
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (so.status === 'Paused') return;
                            setCompleteModal(so);
                          }}
                          style={{ padding: "8px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: so.status === 'Paused' ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: so.status === 'Paused' ? 0.5 : 1, whiteSpace: "nowrap" }}>
                          <CheckSquare size={14} /> Selesai Produksi
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <InlineBomDisplay so={so} />
                  {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                    <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                      Catatan QC: {so.qcNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PaginationControl currentPage={page} totalItems={inProduction.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
    </div>
  );
}
