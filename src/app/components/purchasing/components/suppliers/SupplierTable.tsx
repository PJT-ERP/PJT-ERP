import React from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { Supplier, statusCfg, Pill, TH, TD, formatRpM } from "./SupplierHelpers";
import { useSuppliers } from "../../hooks/useSuppliers";

interface SupplierTableProps {
  board: ReturnType<typeof useSuppliers>;
}

export function SupplierTable({ board }: SupplierTableProps) {
  const { filtered, supplierPage, perPage, setSelectedSupplier, openEdit, setSupplierToDelete } = board;

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>Supplier</TH>
              <TH className="hidden md:table-cell">Kategori</TH>
              <TH className="hidden lg:table-cell">Kota</TH>

              <TH className="hidden sm:table-cell">Total PO</TH>
              <TH className="hidden md:table-cell">On-Time</TH>
              <TH className="hidden lg:table-cell">Nilai Transaksi</TH>
              <TH>Status</TH>
              <TH>Aksi</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((supplierPage - 1) * perPage, supplierPage * perPage).map((s) => {
              const sc = statusCfg[s.status];
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onClick={() => setSelectedSupplier(s)}
                >
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md shrink-0" style={{ background: "#C8102E", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: "#1F1F1F", fontSize: 13 }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8" }}>{s.code}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <span style={{ fontSize: 12, color: "#475569" }}>{s.category}</span>
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <span style={{ fontSize: 12, color: "#475569" }}>{s.city}</span>
                  </TD>

                  <TD className="hidden sm:table-cell">
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>{s.totalPOs}</span>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.onTimeRate >= 90 ? "#16a34a" : s.onTimeRate >= 80 ? "#d97706" : "#dc2626" }}>
                      {s.onTimeRate}%
                    </span>
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>Rp {formatRpM(s.totalValue)}</span>
                  </TD>
                  <TD>
                    <Pill bg={sc.bg} color={sc.color}>
                      <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                      {s.status}
                    </Pill>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 border hover:bg-red-50 transition-colors"
                        style={{ fontSize: 11, color: "#C8102E", borderColor: "#bfdbfe" }}
                        onClick={() => setSelectedSupplier(s)}
                      >
                        <Eye size={12} /> Detail
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-amber-50 transition-colors"
                        style={{ color: "#d97706" }}
                        title="Edit supplier"
                        onClick={() => openEdit(s)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-red-50 transition-colors"
                        style={{ color: "#dc2626" }}
                        title="Hapus supplier"
                        onClick={() => setSupplierToDelete(s)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination control */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
        <div className="text-sm text-slate-500">
          Menampilkan {(supplierPage - 1) * perPage + 1} - {Math.min(supplierPage * perPage, filtered.length)} dari {filtered.length} supplier
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => board.setSupplierPage(Math.max(1, supplierPage - 1))}
            disabled={supplierPage === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm font-medium px-2">{supplierPage}</span>
          <button
            onClick={() => board.setSupplierPage(supplierPage + 1)}
            disabled={supplierPage * perPage >= filtered.length}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
