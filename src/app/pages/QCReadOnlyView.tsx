import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Search, X, AlertTriangle, Shield, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { useCustomersQuery } from "../services/queries";
import { type SalesOrder } from "../components/data/mockData";
import { toBackendUserId } from "../services/backendIds";
import { productionApi, QcQueuesDto } from "../services/productionApi";
import { BASE_URL } from "../services/apiClient";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { mapSalesOrderDto } from "../components/context/hooks/dataMappers";
import type { SalesOrderDto } from "../services/salesApi";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

const getFullUrl = (url: string) => {
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
};

// eslint-disable-next-line unused-imports/no-unused-vars
function isGo(value?: string | null) {
  return value === 'Go' || value === 'Pass';
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 print-hide p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">Pratinjau Foto QC</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 text-center bg-slate-100/50 overflow-y-auto flex-1">
          <div className="max-w-xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
            <ImageWithFallback src={getFullUrl(src)} alt="Foto QC" className="max-w-full h-auto mx-auto rounded border border-slate-200" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Ini adalah representasi visual foto QC yang diunggah.</p>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function QCDetailModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { data: customers = [] } = useCustomersQuery();
  const customer = customers.find(c => c.code === so.customerId);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

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
              background: so.status === 'QC' ? "#FEF3C7" : so.qcStatus === 'Go' ? "#DCFCE7" : "#FEE2E2",
              color: so.status === 'QC' ? "#D97706" : so.qcStatus === 'Go' ? "#16A34A" : "#DC2626"
            }}>
              {so.status === 'QC' ? (
                <>Menunggu QC</>
              ) : (
                <>{so.qcStatus === 'Go' ? <CheckCircle size={14} /> : <XCircle size={14} />} {so.qcStatus === 'Go' ? 'Go (Lulus QC)' : 'NoGo (Gagal QC)'}</>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {so.productionPhotos && so.productionPhotos.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Hasil Produksi ({so.productionPhotos.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {so.productionPhotos.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`Production Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {so.qcPhotos && so.qcPhotos.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Bukti ({so.qcPhotos.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {so.qcPhotos.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`QC Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingTop: 8 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              Tutup
            </button>
          </div>
        </div>
      </div>
      {previewPhoto && <ImagePreviewModal src={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
    </div>
  );
}

export function QCReadOnlyView() {
  const { data: customers = [] } = useCustomersQuery();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<any | null>(null);
  const [filterResult, setFilterResult] = useState<'all' | 'Go' | 'NoGo' | 'Menunggu'>('all');
  const [qcSearch, setQcSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [qcQueues, setQcQueues] = useState<QcQueuesDto | null>(null);

  useEffect(() => {
    productionApi.getQcQueues().then((queues) => {
      setQcQueues({
        readyForInspection: (queues.readyForInspection || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        inspectionHistory: (queues.inspectionHistory || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
      });
    }).catch(console.error);
  }, []);

  const isSupervisor = currentUser?.role === 'QC' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const isRegularEngineer = currentUser?.role === 'Engineering' && !isSupervisor && currentUser?.username !== 'admin';
  const currentBackendUserId = toBackendUserId(currentUser);

  const pendingQC = qcQueues?.readyForInspection || [];
  const completedHistory = qcQueues?.inspectionHistory || [];
  const allQCBase = [...pendingQC, ...completedHistory];

  const allQC = isRegularEngineer 
    ? allQCBase.filter(so => 
        (currentUser?.id && so.designWorkerUserId === currentUser.id) || 
        (currentBackendUserId && so.designWorkerUserId === currentBackendUserId) ||
        (so.designAssignedTo === currentUser?.id)
      )
    : allQCBase;

  const completed = allQC.filter(so => so.status === 'Completed' || so.status === 'Rejected');

  const passCount = completed.filter(s => s.qcDecision === 'Go' || s.qcStatus === 'Go').length;
  const failCount = completed.filter(s => s.qcDecision === 'NoGo' || s.qcStatus === 'NoGo').length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;
  const lateCount = completed.filter(s => s.completionNote && s.completionNote.toLowerCase().includes('terlambat')).length;

  const filtered = allQC.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    const matchSearch = !qcSearch ||
      so.id.toLowerCase().includes(qcSearch.toLowerCase()) ||
      so.description.toLowerCase().includes(qcSearch.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(qcSearch.toLowerCase());
    const matchFilter =
      filterResult === 'all' ||
      (filterResult === 'Menunggu' && so.status === 'QC') ||
      (filterResult !== 'Menunggu' && (so.qcDecision === filterResult || so.qcStatus === filterResult));
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
            {[
              { value: 'all', label: 'Semua' },
              { value: 'Menunggu', label: `Menunggu (${pendingQC.length})` },
              { value: 'Go', label: `Go (${passCount})` },
              { value: 'NoGo', label: `NoGo (${failCount})` },
            ].map(f => (
              <button key={f.value} onClick={() => { setFilterResult(f.value as any); setCurrentPage(1); }}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
                  background: filterResult === f.value ? S.navy : S.white,
                  color: filterResult === f.value ? S.white : S.secondary,
                  border: `1px solid ${filterResult === f.value ? S.navy : S.border}`
                }}>
                {f.label}
              </button>
            ))}
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
                      {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0)) > 0
                        ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: S.secondary }}><ImageIcon size={11} /> {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0))} foto</span>
                        : <span style={{ fontSize: "11.5px", color: S.border }}>—</span>
                      }
                    </div>
                  )}
                  <div style={{ alignSelf: "center" }}>
                    {so.status === 'QC'
                      ? <span style={{ fontSize: "11.5px", background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Menunggu</span>
                      : so.qcStatus
                        ? <span style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, color: so.qcStatus === 'Go' ? "#16A34A" : "#DC2626" }}>
                            {so.qcStatus === 'Go' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                            {so.qcStatus === 'Go' ? 'Go' : 'NoGo'}
                          </span>
                        : <span style={{ fontSize: "11.5px", color: S.border }}>—</span>
                    }
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
