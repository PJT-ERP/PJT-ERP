import React, { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { S } from "../../../../components/production/ProductionHelpers";

export function CompletedProductionPanel({ board }: { board: any }) {
  const completedQueue = board.completed || board.productionQueues?.completed || [];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const filteredQueue = completedQueue.filter((so: any) => {
    if (!so) return false;
    const searchLow = (searchTerm || "").toLowerCase();
    const idMatch = String(so.id || "").toLowerCase().includes(searchLow);
    const descMatch = String(so.description || "").toLowerCase().includes(searchLow);
    return idMatch || descMatch;
  });
  
  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage) || 1;
  const currentItems = filteredQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (completedQueue.length === 0) {
    return (
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "40px 20px", textAlign: "center" }}>
        <CheckCircle2 size={48} className="text-slate-300 mx-auto mb-4" />
        <h3 className="text-slate-500 font-semibold mb-1">Belum ada riwayat selesai</h3>
        <p className="text-slate-400 text-sm">Proses produksi yang sudah selesai dan lolos QC akan tampil di sini.</p>
      </div>
    );
  }

  return (
    <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: S.slate, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            Riwayat Produksi Selesai
            <span style={{ background: S.bg, padding: "2px 8px", borderRadius: 12, fontSize: "12px", color: S.secondary, border: `1px solid ${S.border}` }}>
              {filteredQueue.length}
            </span>
          </h2>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} className="text-slate-400" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder="Cari ID SO atau deskripsi..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ 
                padding: "8px 12px 8px 32px", 
                borderRadius: 4, 
                border: `1px solid ${S.border}`,
                fontSize: "13px",
                width: "250px",
                outline: "none"
              }}
            />
          </div>
        </div>
      </div>
      
      {currentItems.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: S.secondary, fontSize: "14px" }}>
          Tidak ada hasil pencarian yang cocok.
        </div>
      ) : (
        <div>
          {currentItems.map((so: any, idx: number) => (
            <div key={so.id} style={{ display: "flex", padding: "16px 20px", borderBottom: idx < currentItems.length - 1 ? `1px solid ${S.border}` : "none", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                  <span style={{ fontSize: "11px", padding: "2px 8px", background: "#F0FDF4", color: "#16A34A", borderRadius: 4, fontWeight: 600, border: "1px solid #DCFCE7", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={12} /> Lolos QC
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: S.slate, fontWeight: 500, marginBottom: 4 }}>{so.description}</div>
                <div style={{ fontSize: "12px", color: S.secondary }}>
                  Selesai pada: {so.productionFinishedAtUtc ? (!isNaN(new Date(so.productionFinishedAtUtc).getTime()) ? new Date(so.productionFinishedAtUtc).toLocaleString("id-ID") : "-") : "-"}
                </div>
              </div>
              
              <div>
                <button
                  onClick={() => board.setDetailModal(so)}
                  style={{
                    padding: "6px 12px",
                    background: S.white,
                    border: `1px solid ${S.border}`,
                    borderRadius: 4,
                    fontSize: "13px",
                    fontWeight: 500,
                    color: S.slate,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: S.bg, borderTop: `1px solid ${S.border}` }}>
          <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 500 }}>
            Halaman {currentPage} dari {totalPages}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 4,
                border: `1px solid ${S.border}`, background: S.white,
                color: currentPage === 1 ? "#cbd5e1" : S.slate,
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 4,
                border: `1px solid ${S.border}`, background: S.white,
                color: currentPage === totalPages ? "#cbd5e1" : S.slate,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
