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
              <div key={so.id} className="flex flex-col md:flex-row items-start gap-4 p-4 md:p-6 bg-slate-50 border-b border-dashed border-slate-300 last:border-b-0">
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.soNumber || so.id}</span>
                    <StatusBadge status={so.status} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[12.5px] text-slate-500 mb-2">
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
