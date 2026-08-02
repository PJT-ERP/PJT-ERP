import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Package, FileWarning } from "lucide-react";
import { SalesOrder } from "../../../../components/data/mockData";
import { S, StatusBadge, DrawingLinks } from "../../../../components/production/ProductionHelpers";
import { PaginationControl } from "../../../../components/production/PaginationControl";
import { InlineBomDisplay } from "../InlineBomDisplay";
import { useProductionBoard } from "../../hooks/useProductionBoard";

interface Props {
  board: ReturnType<typeof useProductionBoard>;
}

export function MaterialPrepPanel({ board }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const {
    isSupervisor,
    currentUser,
    pendingMaterialPrep,
    checkMaterialShortage,
    getMaterialRequestState,
    setDetailModal,
    setReviewMrModal
  } = board;

  if (!isSupervisor) return null;

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={16} style={{ color: S.cyan }} />
          <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Persiapan Material ({pendingMaterialPrep.length})</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {pendingMaterialPrep.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada pesanan pada tahap persiapan material</p>
          </div>
        ) : pendingMaterialPrep.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((so: SalesOrder, idx: number) => {
          const hasBom = so.materials && Array.isArray(so.materials) && so.materials.length > 0;
          const isShortage = checkMaterialShortage(so);
          const mrState = getMaterialRequestState(so);
          const hasMr = mrState !== 'none';

          return (
            <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < pendingMaterialPrep.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.soNumber || so.id}</span>
                    <StatusBadge status={so.status} />
                    {!hasBom && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>BOM Belum Dibuat</span>}
                    {hasBom && isShortage && !hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Kekurangan Material - MR Belum Diajukan</span>}
                    {hasBom && mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 600, border: "1px solid #FCD34D" }}>Menunggu Review SPV</span>}
                    {hasBom && (mrState === 'finance_pending' || mrState === 'approved') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DBEAFE", color: "#1E40AF", borderRadius: 4, fontWeight: 600, border: "1px solid #BFDBFE" }}>Sedang Diproses Purchasing</span>}
                    {hasBom && mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#991B1B", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>MR Ditolak</span>}
                    {hasBom && isShortage && hasMr && mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 600, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                    {so.rejectionReason && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FFF7ED", color: "#9A3412", borderRadius: 4, fontWeight: 600, border: "1px solid #FED7AA", display: "flex", alignItems: "center", gap: 4 }}><FileWarning size={12} /> Dikembalikan ke SPV</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                    <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                    <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                    <DrawingLinks so={so} />
                  </div>
                </div>
                {currentUser?.role !== 'Admin' && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {isSupervisor && mrState === 'requested' && (
                      <button onClick={(e) => { e.stopPropagation(); setReviewMrModal(so); }}
                        style={{ padding: "7px 12px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        Review MR
                      </button>
                    )}
                    {isShortage && (mrState === 'none' || mrState === 'completed') && isSupervisor && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/production/mr/${so.id}`); }}
                        style={{ padding: "7px 12px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {mrState === 'rejected' && isSupervisor && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/production/mr/${so.id}`); }}
                        style={{ padding: "7px 12px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <FileWarning size={14} /> Ajukan Ulang MR
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                <InlineBomDisplay so={so} />
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControl currentPage={page} totalItems={pendingMaterialPrep.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
    </div>
  );
}
