import React, { useState } from "react";
import { Shield, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SalesOrder } from "../components/data/mockData";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#1E293B",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

function QCDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Detail Laporan QC</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "13px", fontWeight: 600, padding: "6px 12px", borderRadius: 99, 
              background: so.status === 'qc_check' ? "#FEF3C7" : so.qcStatus === 'Pass' ? "#DCFCE7" : "#FEE2E2",
              color: so.status === 'qc_check' ? "#D97706" : so.qcStatus === 'Pass' ? "#16A34A" : "#DC2626"
            }}>
              {so.status === 'qc_check' ? (
                <>Menunggu QC</>
              ) : (
                <>{so.qcStatus === 'Pass' ? <CheckCircle size={14} /> : <XCircle size={14} />} {so.qcStatus === 'Pass' ? 'Go (Lulus QC)' : 'NoGo (Gagal QC)'}</>
              )}
            </span>
            {so.qcAt && <span style={{ color: S.secondary, fontSize: "12.5px" }}>{new Date(so.qcAt).toLocaleString('id-ID')}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Quantity</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{so.quantity} {so.unit}</p>
            </div>
          </div>

          {so.qcNotes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan Inspeksi</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{so.qcNotes}</p>
            </div>
          )}

          {so.qcPhotos && so.qcPhotos.length > 0 && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Bukti ({so.qcPhotos.length})</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {so.qcPhotos.map((p, i) => (
                  <div key={i} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <ImageIcon size={20} style={{ color: S.secondary }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ paddingTop: 8 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QCReadOnlyView() {
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [filterResult, setFilterResult] = useState<'all' | 'Pass' | 'Fail' | 'Menunggu'>('all');
  const [qcSearch, setQcSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isRegularEngineer = currentUser?.role === 'Engineering' && !currentUser?.isSupervisor && currentUser?.username !== 'admin';
  const baseOrders = salesOrders; // Terbuka untuk semua engineer

  const completed = baseOrders.filter(so => so.status === 'completed');
  const pendingQC = baseOrders.filter(so => so.status === 'qc_check');
  const allQC = [...pendingQC, ...completed];

  const passCount = completed.filter(s => s.qcStatus === 'Pass').length;
  const failCount = completed.filter(s => s.qcStatus === 'Fail').length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;
  const lateCount = completed.filter(s => s.lateReason).length;

  const filtered = allQC.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    const matchSearch = !qcSearch ||
      so.id.toLowerCase().includes(qcSearch.toLowerCase()) ||
      so.description.toLowerCase().includes(qcSearch.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(qcSearch.toLowerCase());
    const matchFilter =
      filterResult === 'all' ||
      (filterResult === 'Menunggu' && so.status === 'QC') ||
      (filterResult !== 'Menunggu' && so.qcStatus === filterResult);
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Laporan Quality Control</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Ringkasan hasil inspeksi QC seluruh order produksi
          </p>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Total Selesai</p>
          <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{completed.length}</p>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Go (Lulus)</p>
          <p style={{ color: "#16A34A", fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passCount}</p>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>NoGo (Tidak Lulus)</p>
          <p style={{ color: "#DC2626", fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{failCount}</p>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Pass Rate</p>
          <p style={{ color: "#9333EA", fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passRate}%</p>
        </div>
      </div>

      {/* Pass Rate Bar */}
      {completed.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: "13.5px", fontWeight: 500 }}>
            <span style={{ color: S.slate }}>Pass Rate Keseluruhan</span>
            <span style={{ color: passRate >= 80 ? "#16A34A" : passRate >= 60 ? "#D97706" : "#DC2626" }}>{passRate}%</span>
          </div>
          <div style={{ height: 12, background: S.bg, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${passRate}%`, background: passRate >= 80 ? "#22C55E" : passRate >= 60 ? "#F59E0B" : "#EF4444", transition: "width 0.3s ease" }} />
          </div>
          {lateCount > 0 && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "12px 0 0", fontSize: "12.5px", color: "#B45309" }}>
              <AlertTriangle size={14} /> {lateCount} order selesai terlambat dari deadline
            </p>
          )}
        </div>
      )}

      {/* Filter / Search */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
            <input type="text" value={qcSearch} onChange={e => { setQcSearch(e.target.value); setCurrentPage(1); }} placeholder="Cari SO, Deskripsi, Customer..."
              style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(['all', 'Menunggu', 'Pass', 'Fail'] as const).map(f => {
              const label = f === 'all' ? 'Semua' : f === 'Pass' ? 'Go' : f === 'Fail' ? 'NoGo' : f;
              return (
              <button key={f} onClick={() => { setFilterResult(f); setCurrentPage(1); }}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                  background: filterResult === f ? S.navy : S.white,
                  color: filterResult === f ? S.white : S.secondary,
                  border: `1px solid ${filterResult === f ? S.navy : S.border}`
                }}>
                {label}
              </button>
            )})}
          </div>
          <span style={{ fontSize: "12px", color: S.secondary }}>{filtered.length} item</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px", gap: 16, padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["SO", "Customer", "Deskripsi", "Deadline", "Keterlambatan", ...(!isAdmin ? ["Foto"] : []), "Hasil QC", "Tanggal"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Shield size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Belum ada data QC</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const isLate = !!so.lateReason;
              return (
                <div key={so.id} onClick={() => setSelectedSO(so)}
                  style={{
                    display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px", gap: 16,
                    padding: "10px 18px", cursor: "pointer",
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${S.border}` : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace", alignSelf: "center" }}>{so.id}</span>
                  <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{customer?.name}</span>
                  <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{so.description}</span>
                  <span style={{ color: S.secondary, fontSize: "12.5px", alignSelf: "center" }}>{so.deadline}</span>
                  <div style={{ alignSelf: "center" }}>
                    {isLate ? <span style={{ fontSize: "11.5px", color: "#D97706", display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> Terlambat</span> : <span style={{ fontSize: "11.5px", color: "#16A34A" }}>Tepat waktu</span>}
                  </div>
                  {!isAdmin && (
                    <div style={{ alignSelf: "center" }}>
                      {(so.qcPhotos?.length ?? 0) > 0
                        ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: S.secondary }}><ImageIcon size={11} /> {so.qcPhotos!.length}</span>
                        : <span style={{ fontSize: "11.5px", color: S.border }}>—</span>
                      }
                    </div>
                  )}
                  <div style={{ alignSelf: "center" }}>
                    {so.status === 'qc_check' ? (
                      <span style={{ fontSize: "11.5px", background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Menunggu</span>
                    ) : so.qcStatus ? (
                      <span style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, color: so.qcStatus === 'Pass' ? "#16A34A" : "#DC2626" }}>
                        {so.qcStatus === 'Pass' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        {so.qcStatus === 'Pass' ? 'Go' : 'NoGo'}
                      </span>
                    ) : <span style={{ fontSize: "11.5px", color: S.border }}>—</span>}
                  </div>
                  <span style={{ color: S.secondary, fontSize: "12.5px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {filtered.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} dari {filtered.length} hasil
            </span>
            
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              
              {Array.from({ length: Math.ceil(filtered.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
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
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))} 
                disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSO && <QCDetailModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
