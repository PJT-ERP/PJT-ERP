import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { S } from "./ProductionHelpers";

export function PaginationControl({ currentPage, totalItems, itemsPerPage, onPageChange }: { currentPage: number, totalItems: number, itemsPerPage: number, onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems <= itemsPerPage) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
      <span style={{ fontSize: "13.5px", color: "#64748B" }}>
        {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} hasil
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
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
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= totalPages ? "#CBD5E1" : S.secondary, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
