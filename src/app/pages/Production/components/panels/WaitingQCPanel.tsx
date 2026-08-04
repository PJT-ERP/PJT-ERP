import React, { useState } from "react";
import { useCustomersQuery } from "../../../../services/queries";
import { S, StatusBadge, DrawingLinks } from "../../../../components/production/ProductionHelpers";
import { PaginationControl } from "../../../../components/production/PaginationControl";
import { InlineBomDisplay } from "../InlineBomDisplay";
import { useProductionBoard } from "../../hooks/useProductionBoard";
import { SalesOrder } from "../../../../components/data/mockData";

interface Props {
  board: ReturnType<typeof useProductionBoard>;
}

export function WaitingQCPanel({ board }: Props) {
  const { data: customers = [] } = useCustomersQuery();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const { waitingQC, setDetailModal } = board;

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
        </div>
      </div>
      {waitingQC.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {waitingQC.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((so: SalesOrder, idx: number) => {
            const customer = customers.find(c => c.code === so.customerId);
            return (
              <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "24px 18px", borderBottom: idx < waitingQC.slice((page - 1) * itemsPerPage, page * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none", background: "#F8FAFC" }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.soNumber || so.id}</span>
                    <StatusBadge status={so.status} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, marginBottom: 8, flexWrap: "wrap" }}>
                    <span>Pelanggan: <strong style={{ color: S.slate }}>{customer?.name || so.customerId}</strong></span>
                    <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                    <DrawingLinks so={so} />
                  </div>
                  <InlineBomDisplay so={so} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PaginationControl currentPage={page} totalItems={waitingQC.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
    </div>
  );
}
