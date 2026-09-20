import React, { useState } from "react";
import { Users, FileWarning } from "lucide-react";
import { S, StatusBadge, DrawingLinks } from "../../../../components/production/ProductionHelpers";
import { PaginationControl } from "../../../../components/production/PaginationControl";
import { getMaterialOptions } from "../material-request/MaterialRequestHelpers";
import { InlineBomDisplay } from "../InlineBomDisplay";
import { useProductionBoard } from "../../hooks/useProductionBoard";
import { SalesOrder } from "../../../../components/data/mockData";

interface Props {
  board: ReturnType<typeof useProductionBoard>;
}

export function PendingAssignmentPanel({ board }: Props) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const {
    isSupervisor,
    currentUser,
    pendingAssignment,
    checkMaterialShortage,
    getMaterialRequestState,
    setDetailModal,
    setAssignModal
  } = board;

  if (!isSupervisor) return null;

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={16} style={{ color: S.cyan }} />
          <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Menunggu Penugasan Operator ({pendingAssignment.length})</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {pendingAssignment.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada pesanan yang menunggu penugasan operator</p>
          </div>
        ) : pendingAssignment.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((so: SalesOrder, idx: number) => {
          const hasBom = getMaterialOptions(so, true).length > 0;
          const mrState = getMaterialRequestState(so);
          const hasMr = mrState !== 'none';
          const isShortage = checkMaterialShortage(so);
          const canAssignToOperator = !hasBom || !isShortage;

          return (
            <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < pendingAssignment.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.soNumber || so.id}</span>
                    <StatusBadge status={so.status} />
                    {!hasBom && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 600, border: "1px solid #FCD34D" }}>Tanpa BOM</span>}
                    {hasBom && isShortage && !hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Kekurangan Material - MR Belum Diajukan</span>}
                    {hasBom && mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 600, border: "1px solid #FCD34D" }}>Menunggu Review SPV</span>}
                    {hasBom && mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#991B1B", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>MR Ditolak</span>}
                    {so.rejectionReason && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FFF7ED", color: "#9A3412", borderRadius: 4, fontWeight: 600, border: "1px solid #FED7AA", display: "flex", alignItems: "center", gap: 4 }}><FileWarning size={12} /> Dikembalikan ke SPV</span>}
                    {hasBom && isShortage && hasMr && mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 600, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                    {canAssignToOperator && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 600, border: "1px solid #BBF7D0" }}>{hasBom ? "Material Lengkap - " : ""}Siap Tugaskan</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                    <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                    <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                    <DrawingLinks so={so} />
                  </div>
                </div>
                {currentUser?.role !== 'Admin' && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssignModal(so); }}
                      style={{
                        padding: "8px 14px",
                        background: S.cyan,
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      Tugaskan Operator
                    </button>
                  </div>
                )}
              </div>
              <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                <InlineBomDisplay so={so} />
                {so.rejectionReason && (
                  <p style={{ fontSize: "12px", color: "#9A3412", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FFF7ED", borderRadius: 6, border: "1px solid #FED7AA" }}>
                    Dikembalikan: {so.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControl currentPage={page} totalItems={pendingAssignment.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
    </div>
  );
}
