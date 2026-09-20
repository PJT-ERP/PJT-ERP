import React, { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon, X, CheckSquare, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../../components/context/AppContext";
import { useCustomersQuery } from "../../services/queries";
import { SalesOrder } from "../../components/data/mockData";
import { qcApi } from "../../services/qcApi";
import type { QcInspectionDto } from "../../services/qcApi";
import { mapInspectionToSalesOrder } from "./components/utils";
import { productionApi } from "../../services/productionApi";
import { mapSalesOrderDto } from "../../components/context/hooks/dataMappers";
import type { SalesOrderDto } from "../../services/salesApi";
import { QcQueuesDto } from "../../services/productionApi";

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

import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

function CustomBadge({ text, type }: { text: string, type: 'menunggu' | 'tepat' | 'terlambat' }) {
  const styles = {
    menunggu: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    tepat: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    terlambat: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };
  const cfg = styles[type];
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {text}
    </span>
  );
}

function isGo(value?: string | null) {
  return value === 'Go' || value === 'Pass';
}

function isNoGo(value?: string | null) {
  return value === 'NoGo' || value === 'Fail';
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
            <ImageWithFallback src={src} alt="Foto QC" className="max-w-full h-auto mx-auto rounded border border-slate-200" />
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
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              background: so.status === 'QC' ? "#FEF3C7" : (isGo(so.qcStatus) ? "#DCFCE7" : "#FEE2E2"),
              color: so.status === 'QC' ? "#D97706" : (isGo(so.qcStatus) ? "#16A34A" : "#DC2626"),
            }}>
              {so.status === 'QC' ? (
                <>Menunggu QC</>
              ) : (
                <>{isGo(so.qcStatus) ? <CheckCircle size={14} /> : <XCircle size={14} />} {isGo(so.qcStatus) ? 'Go' : 'NoGo'}</>
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
                      <ImageWithFallback src={p} alt={`Production Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                      <ImageWithFallback src={p} alt={`QC Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

export function QCPage() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomersQuery();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [qcSearch] = useState('');
  const [inspections, setInspections] = useState<QcInspectionDto[]>([]);
  const [qcQueues, setQcQueues] = useState<QcQueuesDto | null>(null);

  useEffect(() => {
    qcApi.listInspections().then(setInspections).catch(console.error);
    productionApi.getQcQueues().then((queues) => {
      setQcQueues({
        readyForInspection: (queues.readyForInspection || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        inspectionHistory: (queues.inspectionHistory || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
      });
    }).catch(console.error);
  }, []);

  const hasBackendInspections = inspections.length > 0;
  const readyForInspection = qcQueues?.readyForInspection || [];
  const inspectionHistory = qcQueues?.inspectionHistory || [];

  const completed = (hasBackendInspections
    ? inspections
        .filter(i => isGo(i.decision || i.status) || isNoGo(i.decision || i.status))
        .map(i => mapInspectionToSalesOrder(i, inspectionHistory as any))
    : inspectionHistory)
    .sort((a: any, b: any) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime()) as SalesOrder[];

  const pendingQC = (hasBackendInspections
    ? inspections.filter(i => i.status === "ReadyForInspection" && !i.decision).map(i => mapInspectionToSalesOrder(i, readyForInspection as any))
    : readyForInspection)
    .sort((a: any, b: any) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime()) as SalesOrder[];

  const passCount = completed.filter((s: any) => isGo(s.qcDecision || s.qcStatus)).length;
  const failCount = completed.filter((s: any) => isNoGo(s.qcDecision || s.qcStatus)).length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;
  const lateCount = completed.filter(s => s.completionNote && s.completionNote.toLowerCase().includes('terlambat')).length;

  const filtered = pendingQC.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    return !qcSearch ||
      so.id.toLowerCase().includes(qcSearch.toLowerCase()) ||
      so.description.toLowerCase().includes(qcSearch.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(qcSearch.toLowerCase());
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Total Selesai</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{completed.length}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(100,116,139,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.slate, flexShrink: 0 }}>
              <CheckSquare size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Total Go</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E", flexShrink: 0 }}>
              <CheckCircle size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Total NoGo</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{failCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
              <X size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Go Rate</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passRate}%</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(124,58,237,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C3AED", flexShrink: 0 }}>
              <Activity size={18} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Progress Bar Detail */}
          {completed.length > 0 && (
            <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, fontSize: "14px", fontWeight: 600 }}>
                <span style={{ color: S.slate }}>Kesehatan Quality Control</span>
                <span style={{ color: passRate >= 80 ? "#16A34A" : passRate >= 60 ? "#D97706" : "#DC2626" }}>{passRate >= 80 ? "Baik" : passRate >= 60 ? "Cukup" : "Buruk"}</span>
              </div>
              <div style={{ height: 14, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${passRate}%`, background: passRate >= 80 ? "#10B981" : passRate >= 60 ? "#F59E0B" : "#EF4444", transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
              </div>
              {lateCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 0", padding: "12px", background: "#FEF2F2", borderRadius: 8 }}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <p style={{ fontSize: "13px", color: "#991B1B", margin: 0, fontWeight: 500 }}>
                    Terdapat <strong>{lateCount} order</strong> yang selesai melewati batas waktu deadline produksi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Banner */}
          {filtered.length > 0 && (
            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 6,
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: "#FEE2E2", color: "#C8102E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#991B1B", fontSize: "13.5px", fontWeight: 700 }}>
                      {filtered.length} pesanan siap diinspeksi
                    </p>
                    <p style={{ margin: "2px 0 0", color: "#DC2626", fontSize: "12px" }}>
                      Proses produksi telah selesai. Tim QC dapat segera memulai proses inspeksi.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/erp/qc/inspections')}
                  style={{
                    border: "1px solid #FCA5A5",
                    background: "#fff",
                    color: "#C8102E",
                    borderRadius: 4,
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Lihat Antrean
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={14} style={{ color: S.cyan }} />
                <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Antrean Inspeksi QC</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1.2fr 2fr 3fr 1.2fr 1.5fr 1.5fr 1.2fr" : "1.2fr 2fr 3fr 1.2fr 1.5fr 1fr 1.5fr 1.2fr", padding: "12px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
              {["SO", "Customer", "Deskripsi", "Deadline", "Status Produksi", ...(!isAdmin ? ["Foto"] : []), "Antrean", "Tanggal"].map((h) => (
                <span key={h} style={{ color: "#64748B", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <Shield size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
                <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Belum ada data QC</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((so, idx) => {
                  const customer = customers.find(c => c.code === so.customerId);
                  const isLate = !!so.lateReason;
                  return (
                      <div key={so.id} onClick={() => setSelectedSO(so)}
                      style={{
                        display: "grid", gridTemplateColumns: isAdmin ? "1.2fr 2fr 3fr 1.2fr 1.5fr 1.5fr 1.2fr" : "1.2fr 2fr 3fr 1.2fr 1.5fr 1fr 1.5fr 1.2fr",
                        padding: "12px 18px", cursor: "pointer",
                        borderBottom: idx < filtered.length - 1 ? `1px solid ${S.border}` : "none",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 600, alignSelf: "center" }}>{so.id}</span>
                      <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{customer?.name}</span>
                      <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{so.description}</span>
                      <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.deadline}</span>
                      <div style={{ alignSelf: "center" }}>
                        {isLate ? <CustomBadge text="Terlambat" type="terlambat" /> : <CustomBadge text="Tepat Waktu" type="tepat" />}
                      </div>
                      {!isAdmin && (
                        <div style={{ alignSelf: "center" }}>
                          {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0)) > 0
                            ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: S.secondary, fontWeight: 500 }}><ImageIcon size={12} color="#3B82F6" /> {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0))} foto</span>
                            : <span style={{ fontSize: "11px", color: S.border }}>—</span>
                          }
                        </div>
                      )}
                      <div style={{ alignSelf: "center" }}>
                        <CustomBadge text="Menunggu" type="menunggu" />
                      </div>
                      <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {selectedSO && <QCDetailModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
