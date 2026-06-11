import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  CheckCircle,
  Shield,
  Trash2,
  Image as ImageIcon } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type SalesOrder,
  getStatusColor
} from "../components/data/mockData";

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

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function QCHistoryModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Riwayat Inspeksi QC</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: "13px", fontWeight: 600,
              background: so.qcStatus === 'Pass' ? "#DCFCE7" : "#FEE2E2",
              color: so.qcStatus === 'Pass' ? "#16A34A" : "#DC2626",
            }}>
              Hasil: {so.qcStatus === 'Pass' ? 'Go' : 'NoGo'}
            </span>
            <span style={{ color: S.secondary, fontSize: "12.5px" }}>{so.qcAt ? new Date(so.qcAt).toLocaleString('id-ID') : '-'}</span>
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

function QCInspectionModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customer = customers.find(c => c.code === so.customerId);

  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'Pass' | 'Fail' | ''>('');
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { name: file.name, url }]);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = () => {
    if (result === 'Pass') {
      updateSalesOrder(so.id, {
        status: 'Completed',
        qcStatus: 'Pass',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        completedAt: new Date().toISOString().split('T')[0],
        qcPhotos: photos.map(p => p.name),
      });
    } else {
      updateSalesOrder(so.id, {
        status: 'Ready for Production',
        qcStatus: 'Fail',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        qcPhotos: photos.map(p => p.name),
        isRework: true,
      });
    }
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: result === 'Pass' ? "#DCFCE7" : "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {result === 'Pass' ? <CheckCircle size={32} style={{ color: "#22C55E" }} /> : <X size={32} style={{ color: "#EF4444" }} />}
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>QC {result === 'Pass' ? 'Go' : 'NoGo'}</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {so.id} — {result === 'Pass' ? 'Status: Completed' : 'Dikembalikan ke produksi untuk rework'}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Selesai
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Inspeksi QC — {so.id}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.partNumber} · {customer?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", maxHeight: "70vh" }}>
          {/* Photo Upload */}
          <div>
            <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Foto Hasil Produksi</p>
            <div 
              style={{ border: `2px dashed ${S.border}`, borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", transition: "border 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = S.cyan}
              onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
              onClick={() => fileInputRef.current?.click()}>
              <Upload size={24} style={{ color: S.secondary, margin: "0 auto 4px" }} />
              <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Klik untuk upload foto</p>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "2px 0 0" }}>JPG, PNG, WEBP — bisa multiple</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />
            </div>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                {photos.map((photo, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: S.bg }}>
                    <img src={photo.url} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 4, right: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); removePhoto(idx); }} style={{ padding: 4, background: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan Hasil Inspeksi</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Temuan defect, kondisi produk, rekomendasi, dll."
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white, resize: "none" }} />
          </div>

          {/* Pass / Fail */}
          <div>
            <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Hasil QC</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button type="button" onClick={() => setResult('Pass')}
                style={{
                  padding: "12px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
                  background: result === 'Pass' ? "#22C55E" : S.white,
                  color: result === 'Pass' ? "#fff" : S.secondary,
                  border: `2px solid ${result === 'Pass' ? "#22C55E" : S.border}`,
                  transition: "all 0.1s"
                }}>
                ✓ Go
              </button>
              <button type="button" onClick={() => setResult('Fail')}
                style={{
                  padding: "12px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
                  background: result === 'Fail' ? "#EF4444" : S.white,
                  color: result === 'Fail' ? "#fff" : S.secondary,
                  border: `2px solid ${result === 'Fail' ? "#EF4444" : S.border}`,
                  transition: "all 0.1s"
                }}>
                ✕ NoGo
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
          <button onClick={handleSubmit} disabled={!result}
            style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: result ? 1 : 0.5 }}>
            Submit Hasil QC
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function EngineeringQCPage() {
  const { salesOrders, customers } = useApp();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);

  const qcQueue = salesOrders.filter(so => so.status === 'QC');
  const recentCompleted = salesOrders.filter(so => so.status === 'Completed').slice(0, 8);
  const passCount = recentCompleted.filter(s => s.qcStatus === 'Pass').length;
  const failCount = recentCompleted.filter(s => s.qcStatus === 'Fail').length;

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Quality Control</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Inspeksi kualitas hasil produksi sebelum pengiriman
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Menunggu Inspeksi</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{qcQueue.length}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
              <Shield size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Go</p>
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
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>NoGo</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{failCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
              <X size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Antrian Inspeksi QC</span>
          </div>
        </div>
        
        {qcQueue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Shield size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada item yang perlu diinspeksi</p>
            <p style={{ color: "#94A3B8", margin: 0, fontSize: "12.5px" }}>Item akan muncul setelah produksi selesai</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {qcQueue.map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const durationHours = so.startTime && so.endTime
                ? Math.round((new Date(so.endTime).getTime() - new Date(so.startTime).getTime()) / (1000 * 60 * 60))
                : null;
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < qcQueue.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(200,16,46,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                    <Shield size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>{customer?.name}</span><span>·</span><span>{so.quantity} {so.unit}</span>
                      {durationHours !== null && <><span>·</span><span>Durasi Produksi: {durationHours} jam</span></>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedSO(so)}
                    style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Mulai Inspeksi
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {recentCompleted.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 80px 1fr 100px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["SO", "Deskripsi", "Foto", "Hasil", "Catatan", "Tanggal"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentCompleted.map((so, idx) => (
              <div key={so.id} onClick={() => setHistoryDetail(so)}
                style={{
                  display: "grid", gridTemplateColumns: "110px 1fr 100px 80px 1fr 100px",
                  padding: "10px 18px", cursor: "pointer",
                  borderBottom: idx < recentCompleted.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{so.id}</span>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.description}</span>
                <div style={{ alignSelf: "center" }}>
                  {(so.qcPhotos?.length ?? 0) > 0
                    ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: S.cyan, fontWeight: 500 }}><ImageIcon size={12} /> {so.qcPhotos!.length} foto</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <div style={{ alignSelf: "center" }}>
                  {so.qcStatus
                    ? <span style={{ fontSize: "12px", fontWeight: 600, color: so.qcStatus === 'Pass' ? "#16A34A" : "#DC2626" }}>{so.qcStatus === 'Pass' ? 'Go' : 'NoGo'}</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.qcNotes || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSO && <QCInspectionModal so={selectedSO} onClose={() => setSelectedSO(null)} />}
      {historyDetail && <QCHistoryModal so={historyDetail} onClose={() => setHistoryDetail(null)} />}
    </div>
  );
}
