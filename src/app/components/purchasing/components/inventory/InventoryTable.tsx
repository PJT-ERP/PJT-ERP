import React from "react";
import { Edit, Trash2, Truck, ArrowRightLeft } from "lucide-react";
import { InventoryItem, statusCfg, getStatus, TH, TD, formatRp } from "./InventoryHelpers";
import { useInventory } from "../../hooks/useInventory";

interface InventoryTableProps {
  board: ReturnType<typeof useInventory>;
}

export function InventoryTable({ board }: InventoryTableProps) {
  const { filtered, invPage, perPage, handleEdit, handleDelete, handleMutation } = board;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>Kode / Material</TH>
              <TH className="hidden md:table-cell">Kategori</TH>
              <TH right>Stok Saat Ini</TH>
              <TH className="hidden lg:table-cell" right>Min</TH>
              <TH className="hidden lg:table-cell" right>Reorder Pt</TH>
              <TH className="hidden xl:table-cell" right>Maks</TH>
              <TH className="hidden lg:table-cell w-36">Level Stok</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Sedang Dipesan (ETA)</TH>
              <TH className="hidden xl:table-cell">Lokasi</TH>
              <TH className="hidden sm:table-cell" right>Nilai Stok</TH>
              <TH right>Aksi</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((invPage - 1) * perPage, invPage * perPage).map((item) => {
              const status = getStatus(item);
              const sc = statusCfg[status];
              const pct = item.maxStock > 0 ? Math.min(100, Math.round((item.currentStock / item.maxStock) * 100)) : 0;

              return (
                <tr
                  key={item.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: sc.dot }} />
                      <div>
                        <p style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{item.code}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#1F1F1F" }}>{item.name}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <span style={{ fontSize: 12, color: "#475569" }}>{item.category}</span>
                  </TD>
                  <TD right>
                    <span style={{ fontSize: 14, fontWeight: 700, color: status === "critical" ? "#dc2626" : status === "low" ? "#d97706" : "#1F1F1F" }}>
                      {item.currentStock}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>{item.unit}</span>
                  </TD>
                  <TD className="hidden lg:table-cell" right>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{item.minStock}</span>
                  </TD>
                  <TD className="hidden lg:table-cell" right>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{item.reorderPoint}</span>
                  </TD>
                  <TD className="hidden xl:table-cell" right>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{item.maxStock}</span>
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <div style={{ width: 100 }}>
                      <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#f1f5f9" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: sc.barColor }}
                        />
                      </div>
                      <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{pct}%</p>
                    </div>
                  </TD>
                  <TD>
                    <span
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                      style={{ fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}
                    >
                      <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot }} />
                      {sc.label}
                    </span>
                  </TD>
                  <TD className="hidden md:table-cell">
                    {item.incoming ? (
                      <div>
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                          style={{
                            fontSize: 10, fontWeight: 600,
                            background: item.incoming.eta === "Hari ini" ? "#fee2e2" : "#ecfeff",
                            color: item.incoming.eta === "Hari ini" ? "#991b1b" : "#0e7490",
                          }}
                        >
                          <Truck size={10} /> +{item.incoming.qty} {item.incoming.unit}
                        </span>
                        <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>ETA: {item.incoming.eta}</p>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#e2e8f0" }}>—</span>
                    )}
                  </TD>
                  <TD className="hidden xl:table-cell">
                    <span style={{ fontSize: 11, color: "#64748b" }}>{item.location}</span>
                  </TD>
                  <TD className="hidden sm:table-cell" right>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>
                      {formatRp(item.currentStock * item.unitPrice)}
                    </span>
                  </TD>
                  <TD right>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleMutation(item)} className="text-slate-400 hover:text-green-600 transition" title="Mutasi Stok">
                        <ArrowRightLeft size={16} />
                      </button>
                      <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-blue-600 transition" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-slate-400 hover:text-red-600 transition" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {board.invTotalPages > 1 && (
        <div className="flex items-center justify-center gap-1 px-4 py-2" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button onClick={() => board.setInvPage(p => Math.max(1, p - 1))} disabled={invPage === 1}
            style={{ padding: "2px 6px", fontSize: 11, border: "none", background: "none", color: invPage === 1 ? "#d4d4d8" : "#C8102E", cursor: invPage === 1 ? "default" : "pointer", fontWeight: 600 }}>‹</button>
          {Array.from({ length: board.invTotalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => board.setInvPage(p)}
              style={{ minWidth: 22, height: 22, padding: "0 4px", fontSize: 11, fontWeight: 600, borderRadius: 4, border: "none",
                background: p === invPage ? "#C8102E" : "transparent", color: p === invPage ? "#fff" : "#475569", cursor: "pointer" }}>{p}</button>
          ))}
          <button onClick={() => board.setInvPage(p => Math.min(board.invTotalPages, p + 1))} disabled={invPage >= board.invTotalPages}
            style={{ padding: "2px 6px", fontSize: 11, border: "none", background: "none", color: invPage >= board.invTotalPages ? "#d4d4d8" : "#C8102E", cursor: invPage >= board.invTotalPages ? "default" : "pointer", fontWeight: 600 }}>›</button>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
        <p style={{ fontSize: 11, color: "#94a3b8" }}>
          Menampilkan {Math.min(invPage * perPage, filtered.length)} dari {filtered.length} item
        </p>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
          Nilai total stok: {formatRp(filtered.reduce((s, i) => s + i.currentStock * i.unitPrice, 0))}
        </p>
      </div>
    </div>
  );
}
