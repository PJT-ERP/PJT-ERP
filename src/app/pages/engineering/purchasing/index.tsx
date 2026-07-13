import React, { useState, useEffect } from "react";
import { Plus, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../../components/context/AppContext";
import { PurchasingRequest } from "../../../components/data/mockData";
import { S, URGENCY_COLORS, PR_STATUS_COLORS } from "./constants";
import { PurchasingFormModal } from "./PurchasingFormModal";
import { PRDetailModal } from "./PRDetailModal";

export function EngineeringPurchasingPage() {
  const { purchasingRequests, refreshBackendData, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PurchasingRequest | null>(null);
  const [editRequest, setEditRequest] = useState<PurchasingRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [spvCurrentPage, setSpvCurrentPage] = useState(1);
  const spvItemsPerPage = 4;

  useEffect(() => {
    void refreshBackendData();
  }, [refreshBackendData]);

  const isSpv = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

  const relevantRequests = isSpv
    ? purchasingRequests
    : purchasingRequests.filter(r => r.requestedBy === currentUser?.name || r.requestedBy === currentUser?.id);

  const isMadeBySpv = (r: any) => {
    const reqBy = r.requestor || r.requestedBy || (r as any).requesterName || "";
    return reqBy.toLowerCase().includes('supervisor') || reqBy.toLowerCase().includes('spv') || reqBy === 'Admin' || reqBy === 'Owner' || r.approvedBy === 'Engineering Supervisor';
  };

  const waitingSpvRequests = relevantRequests.filter(r => r.backendStatus === 'Submitted' && !isMadeBySpv(r));
  const otherRequests = relevantRequests.filter(r => r.backendStatus !== 'Submitted' || isMadeBySpv(r));

  const totalPages = Math.ceil(otherRequests.length / itemsPerPage);
  const paginatedRequests = otherRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const spvTotalPages = Math.ceil(waitingSpvRequests.length / spvItemsPerPage);
  const paginatedSpvRequests = waitingSpvRequests.slice((spvCurrentPage - 1) * spvItemsPerPage, spvCurrentPage * spvItemsPerPage);

  const statusCount = (s: string) => {
    if (s === 'Menunggu SPV') return waitingSpvRequests.length;
    return relevantRequests.filter(r => (r.status === s && (r.backendStatus !== 'Submitted' || isMadeBySpv(r))) || (s === 'Diproses' && r.backendStatus === 'Submitted' && isMadeBySpv(r))).length;
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Pengajuan Purchasing</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Ajukan permintaan material dan pantau statusnya
          </p>
        </div>
        {currentUser?.role !== 'Admin' && (
          <button onClick={() => { setEditRequest(null); setShowForm(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 4, border: "none",
              background: S.cyan, color: "#fff", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
            }}>
            <Plus size={14} /> Ajukan Baru
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {(['Menunggu SPV', 'Pending', 'Diproses', 'Selesai', 'Ditolak'] as const).map(s => {
          let accent = "#94A3B8"; let bg = "rgba(148,163,184,0.08)";
          if (s === 'Menunggu SPV') { accent = "#A855F7"; bg = "rgba(168,85,247,0.08)"; }
          if (s === 'Diproses') { accent = "#3B82F6"; bg = "rgba(59,130,246,0.08)"; }
          if (s === 'Selesai') { accent = "#22C55E"; bg = "rgba(34,197,94,0.08)"; }
          if (s === 'Ditolak') { accent = "#EF4444"; bg = "rgba(239,68,68,0.08)"; }

          return (
            <div key={s} style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>{s}</p>
                  <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{statusCount(s)}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>
                  <ShoppingCart size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {waitingSpvRequests.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7" }} />
            <h3 style={{ margin: 0, fontSize: "14px", color: S.slate }}>Menunggu Persetujuan Supervisor ({waitingSpvRequests.length})</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {paginatedSpvRequests.map(req => {
              const isMulti = req.items && req.items.length > 1;
              const displayName = isMulti ? `${req.items!.length} item material` : req.itemName;
              const displayQty = isMulti ? req.items!.map(it => it.itemName).join(', ') : `${req.quantity} ${req.unit}`;
              return (
                <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, padding: "16px 20px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(168,85,247,0.08)", color: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ShoppingCart size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: S.slate }}>{req.id}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }} className={`px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency].bg} ${URGENCY_COLORS[req.urgency].border} ${URGENCY_COLORS[req.urgency].text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[req.urgency].dot}`} />
                          <span style={{ fontSize: "10.5px", fontWeight: 600 }}>{req.urgency}</span>
                        </div>
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 500, color: S.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                      <p style={{ margin: 0, fontSize: "12.5px", color: S.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.requestedBy || 'Engineering'} &nbsp;&middot;&nbsp; {displayQty} &nbsp;&middot;&nbsp; {req.soId || '—'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(req)} style={{ padding: "8px 16px", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.background = "#8B5CF6"}>Tinjau Pengajuan</button>
                </div>
              );
            })}
            
            {spvTotalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 4px 0", marginTop: "2px" }}>
                <span style={{ color: S.secondary, fontSize: "12px" }}>
                  {waitingSpvRequests.length === 0
                    ? "Tidak ada hasil"
                    : `${(spvCurrentPage - 1) * spvItemsPerPage + 1}–${Math.min(spvCurrentPage * spvItemsPerPage, waitingSpvRequests.length)} dari ${waitingSpvRequests.length} hasil`}
                </span>
                <Pagination page={spvCurrentPage} total={spvTotalPages} onChange={setSpvCurrentPage} />
              </div>
            )}
          </div>
        </div>
      )}

      {otherRequests.length === 0 && waitingSpvRequests.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6 }}>
          <ShoppingCart size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
          <p style={{ color: S.secondary, margin: 0, fontSize: "13.5px" }}>Belum ada pengajuan purchasing</p>
        </div>
      ) : otherRequests.length > 0 ? (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Pengajuan (Diproses / Riwayat)</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 110px 120px 120px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["ID", "Item / Material", "Urgensi", "Ref SO", "Tanggal", "Status"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {paginatedRequests.map((req, idx) => {
            const isMulti = req.items && req.items.length > 1;
            const displayName = isMulti ? `${req.items!.length} item material` : req.itemName;
            const displayQty = isMulti ? null : `${req.quantity} ${req.unit}`;
            return (
              <div
                key={req.id}
                onClick={() => setSelected(req)}
                style={{
                  display: "grid", gridTemplateColumns: "110px 1fr 100px 110px 120px 120px",
                  padding: "10px 18px", cursor: "pointer",
                  borderBottom: idx < paginatedRequests.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{req.id}</span>
                <div style={{ minWidth: 0, paddingRight: 10 }}>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
                  {isMulti ? (
                    <p style={{ color: S.secondary, fontSize: "11px", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.items!.map(it => it.itemName).slice(0, 2).join(', ')}
                      {req.items!.length > 2 ? ` +${req.items!.length - 2} lagi` : ''}
                    </p>
                  ) : (
                    <p style={{ color: S.secondary, fontSize: "11px", margin: "2px 0 0" }}>{displayQty}</p>
                  )}
                </div>
                <div style={{ alignSelf: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }} className={`px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency].bg} ${URGENCY_COLORS[req.urgency].border} ${URGENCY_COLORS[req.urgency].text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[req.urgency].dot}`} />
                    <span style={{ fontSize: "10.5px", fontWeight: 600 }}>{req.urgency}</span>
                  </div>
                </div>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center", fontFamily: "monospace" }}>{req.soId || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{req.requestedAt}</span>
                <div style={{ alignSelf: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }} className={`px-2.5 py-1 rounded border ${PR_STATUS_COLORS[req.status].bg} ${PR_STATUS_COLORS[req.status].border} ${PR_STATUS_COLORS[req.status].text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${PR_STATUS_COLORS[req.status].dot}`} />
                    <span style={{ fontSize: "11px", fontWeight: 500 }}>{req.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${S.border}`, background: "#FAFAFA" }}>
              <span style={{ color: S.secondary, fontSize: "12px" }}>
                {otherRequests.length === 0
                  ? "Tidak ada hasil"
                  : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, otherRequests.length)} dari ${otherRequests.length} hasil`}
              </span>
              <Pagination page={currentPage} total={totalPages} onChange={setCurrentPage} />
            </div>
          )}
        </div>
      ) : null}

      {showForm && (
        <PurchasingFormModal
          editRequest={editRequest}
          onClose={() => {
            setShowForm(false);
            setEditRequest(null);
          }}
          onSuccess={(updatedItems) => {
            if (isSpv && editRequest) {
              const newReq = { ...editRequest };
              if (updatedItems && updatedItems.length > 0) {
                newReq.items = updatedItems;
                newReq.quantity = updatedItems[0].quantity;
                newReq.itemName = updatedItems[0].itemName;
              }
              setSelected(newReq);
            } else {
              setEditRequest(null);
            }
          }}
        />
      )}
      {selected && (
        <PRDetailModal
          pr={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditRequest(selected);
            setSelected(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      <PagBtn label={<ChevronLeft size={12} />} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} />
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <PagBtn key={p} label={p} onClick={() => onChange(p)} active={p === page} />
      ))}
      <PagBtn label={<ChevronRight size={12} />} onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} />
    </div>
  );
}

function PagBtn({ label, onClick, active, disabled }: {
  label: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4,
        border: `1px solid ${active ? "#C8102E" : "#E2E8F0"}`,
        background: active ? "#C8102E" : hov && !disabled ? "#F8FAFC" : "#fff",
        color: active ? "#fff" : disabled ? "#CBD5E1" : hov ? "#111827" : "#64748B",
        fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "Inter, sans-serif", transition: "all 0.12s",
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  );
}
