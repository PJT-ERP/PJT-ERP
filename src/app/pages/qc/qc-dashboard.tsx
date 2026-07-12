import React, { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon, Search, X } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { SalesOrder } from "../../components/data/mockData";
import { qcApi } from "../../services/qcApi";
import type { QcInspectionDto } from "../../services/qcApi";
import { mapInspectionToSalesOrder } from "./components/utils";

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
  const { customers } = useApp();
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
  const { salesOrders, customers, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [qcSearch, setQcSearch] = useState('');
  const [inspections, setInspections] = useState<QcInspectionDto[]>([]);

  useEffect(() => {
    qcApi.listInspections().then(setInspections).catch(console.error);
  }, []);

  const hasBackendInspections = inspections.length > 0;

  const completed = hasBackendInspections
    ? inspections
        .filter(i => isGo(i.decision || i.status) || isNoGo(i.decision || i.status))
        .map(i => mapInspectionToSalesOrder(i, salesOrders))
    : salesOrders.filter(so => so.status === 'Completed');

  const pendingQC = hasBackendInspections
    ? inspections.filter(i => i.status === "ReadyForInspection").map(i => mapInspectionToSalesOrder(i, salesOrders))
    : salesOrders.filter(so => so.status === 'QC');

  const passCount = completed.filter(s => isGo(s.qcStatus)).length;
  const failCount = completed.filter(s => isNoGo(s.qcStatus)).length;
  const passRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0;
  const lateCount = completed.filter(s => s.lateReason).length;

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <p style={{ color: S.secondary, fontSize: "13px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Selesai</p>
          <p style={{ color: S.slate, fontSize: "32px", fontWeight: 800, margin: "8px 0 2px", lineHeight: 1 }}>{completed.length}</p>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <p style={{ color: S.secondary, fontSize: "13px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total <span style={{ color: "#16A34A" }}>Go</span></p>
          <p style={{ color: "#16A34A", fontSize: "32px", fontWeight: 800, margin: "8px 0 2px", lineHeight: 1 }}>{passCount}</p>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <p style={{ color: S.secondary, fontSize: "13px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total <span style={{ color: "#DC2626" }}>NoGo</span></p>
          <p style={{ color: "#DC2626", fontSize: "32px", fontWeight: 800, margin: "8px 0 2px", lineHeight: 1 }}>{failCount}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", borderRadius: 12, padding: "20px", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)", color: "white" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.9 }}>Go Rate Keseluruhan</p>
          <p style={{ fontSize: "32px", fontWeight: 800, margin: "8px 0 2px", lineHeight: 1 }}>{passRate}%</p>
        </div>
      </div>

      {/* Progress Bar Detail */}
      {completed.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
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

      {/* Search Bar */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
            <input type="text" value={qcSearch} onChange={e => setQcSearch(e.target.value)} placeholder="Cari SO yang menunggu inspeksi..."
              style={{ width: "100%", padding: "10px 14px 10px 40px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} 
              onFocus={e => e.currentTarget.style.borderColor = S.navy}
              onBlur={e => e.currentTarget.style.borderColor = S.border}
            />
          </div>
          <div style={{ padding: "8px 16px", background: "#EFF6FF", color: "#1D4ED8", borderRadius: 8, fontSize: "13px", fontWeight: 600 }}>
            {filtered.length} Menunggu Inspeksi
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "120px 150px 1fr 100px 120px 100px 100px" : "120px 150px 1fr 100px 120px 70px 100px 100px", padding: "12px 20px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["SO", "Customer", "Deskripsi", "Deadline", "Status Produksi", ...(!isAdmin ? ["Foto"] : []), "Antrean", "Tanggal"].map((h) => (
            <span key={h} style={{ color: "#64748B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</span>
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
                    display: "grid", gridTemplateColumns: isAdmin ? "120px 150px 1fr 100px 120px 100px 100px" : "120px 150px 1fr 100px 120px 70px 100px 100px",
                    padding: "16px 20px", cursor: "pointer",
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${S.border}` : "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: S.slate, fontSize: "13px", fontWeight: 600, alignSelf: "center" }}>{so.id}</span>
                  <span style={{ color: S.secondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{customer?.name}</span>
                  <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10, alignSelf: "center" }}>{so.description}</span>
                  <span style={{ color: S.secondary, fontSize: "13px", alignSelf: "center" }}>{so.deadline}</span>
                  <div style={{ alignSelf: "center" }}>
                    {isLate ? <span style={{ fontSize: "12px", color: "#B45309", background: "#FEF3C7", padding: "4px 8px", borderRadius: 6, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> Terlambat</span> : <span style={{ fontSize: "12px", color: "#15803D", background: "#DCFCE7", padding: "4px 8px", borderRadius: 6, fontWeight: 500 }}>Tepat Waktu</span>}
                  </div>
                  {!isAdmin && (
                    <div style={{ alignSelf: "center" }}>
                      {(so.qcPhotos?.length ?? 0) > 0
                        ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: S.secondary, fontWeight: 500 }}><ImageIcon size={14} color="#3B82F6" /> {so.qcPhotos!.length}</span>
                        : <span style={{ fontSize: "12px", color: S.border }}>—</span>
                      }
                    </div>
                  )}
                  <div style={{ alignSelf: "center" }}>
                    <span style={{ fontSize: "12px", background: "#F1F5F9", color: "#475569", padding: "4px 10px", borderRadius: 20, border: "1px solid #E2E8F0", fontWeight: 600, display: "inline-block", textAlign: "center" }}>
                      Menunggu
                    </span>
                  </div>
                  <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSO && <QCDetailModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
    </div>
  );
}
