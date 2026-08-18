import React, { useState } from "react";
import { PlayCircle, FileWarning } from "lucide-react";
import { useNavigate } from "react-router";
import { S, StatusBadge, DrawingLinks } from "../../../../components/production/ProductionHelpers";
import { PaginationControl } from "../../../../components/production/PaginationControl";
import { InlineBomDisplay } from "../InlineBomDisplay";
import { useProductionBoard } from "../../hooks/useProductionBoard";
import { SalesOrder } from "../../../../components/data/mockData";

interface Props {
  board: ReturnType<typeof useProductionBoard>;
}

export function ReadyToStartPanel({ board }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const {
    isSupervisor,
    currentUser,
    users,
    readyToStart,
    checkMaterialShortage,
    getMaterialRequestState,
    setDetailModal,
    setStartModal,
    setReturnToSpvModal,
    setReviewMrModal,
    setSystemMessage
  } = board;
  const currentBackendUserId = currentUser?.id || "";

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PlayCircle size={16} style={{ color: S.cyan }} />
          <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Siap Mulai Produksi ({readyToStart.length})</span>
        </div>
      </div>
      {readyToStart.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang siap mulai</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {readyToStart.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((so: SalesOrder, idx: number) => {
            const operator = users.find((u: any) => u.id === so.assignedTo)?.name || so.assignedName || "-";
            const mrState = getMaterialRequestState(so);
            const isShortage = checkMaterialShortage(so);
            return (
              <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < readyToStart.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.soNumber || so.id}</span>
                      <StatusBadge status={so.status} />
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                      {mrState === 'completed' && !isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                      {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                      <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                      <span>Operator: <strong style={{ color: S.slate }}>{operator}</strong></span>
                      <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                      <DrawingLinks so={so} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                      <button onClick={() => setReviewMrModal(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                        Review MR
                      </button>
                    )}
                    {isShortage && (mrState === 'none' || mrState === 'completed') && isSupervisor && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {mrState === 'rejected' && isSupervisor && currentUser?.role !== 'Admin' && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <FileWarning size={14} /> Ajukan Ulang MR
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <button onClick={() => setReturnToSpvModal(so)}
                        style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <FileWarning size={14} /> Kembalikan ke SPV
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <button onClick={() => {
                        if (mrState !== 'completed' && mrState !== 'none') {
                          setSystemMessage({
                            tone: "error",
                            title: "Material Belum Lengkap",
                            message: `Material untuk pesanan ini masih dalam proses (Status: ${mrState}). Tidak bisa memulai produksi sebelum material lengkap.`
                          });
                          return;
                        }
                        setStartModal(so);
                      }}
                        style={{ padding: "8px 16px", background: "#B91C1C", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <PlayCircle size={14} /> Mulai Produksi
                      </button>
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
      <PaginationControl currentPage={page} totalItems={readyToStart.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
    </div>
  );
}
