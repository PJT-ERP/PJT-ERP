import React, { useState } from "react";
import {
  Pencil,
  Send,
  Clock,
  CheckCircle,
  ExternalLink,
  List,
  AlertTriangle,
  Search,
  ChevronDown,
  Plus,
  Trash2 } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { type Quotation,
  type QuotationStatus,
  getQuotationStatusColor
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
  const cfg = getQuotationStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {cfg.label}
    </span>
  );
}

function DesignModal({ qut, onClose }: { qut: Quotation; onClose: () => void }) {
  const { updateQuotation, customers, currentUser } = useApp();
  const [designLink, setDesignLink] = useState(qut.designLink ?? '');
  const [materials, setMaterials] = useState<{ id: string; name: string; quantity: number; unit: string; spec?: string }[]>(qut.materials || []);
  const [step, setStep] = useState<'upload' | 'confirm' | 'done'>('upload');
  const customer = customers.find(c => c.code === qut.customerId);
  
  const isSpv = currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv';
  const isPendingSpv = qut.status === 'design_review';

  const addMaterial = () => setMaterials([...materials, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'pcs', spec: '' }]);
  const removeMaterial = (id: string) => setMaterials(materials.filter(m => m.id !== id));
  const updateMaterial = (id: string, field: string, value: any) => setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));

  const handleForward = () => {
    updateQuotation(qut.id, {
      designLink,
      materials,
      status: isSpv ? 'client_design_approval' : 'design_review',
    });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{qut.id}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{qut.productName} - {qut.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px", fontWeight: "bold" }}>&times;</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {step === 'done' ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={32} style={{ color: "#22C55E" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                {isSpv ? 'Desain Disetujui (Diteruskan ke Sales)' : 'Desain Menunggu Approval Supervisor'}
              </h3>
              <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
                {isSpv ? 'Status Penawaran dikembalikan ke Sales untuk Validasi Klien.' : 'Status Penawaran menjadi "Design Review"'}
              </p>
              <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Tutup</button>
            </div>
          ) : step === 'confirm' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: 16 }}>
                <p style={{ color: "#92400E", margin: 0, fontSize: "13.5px" }}>
                  {isSpv ? 'Konfirmasi menyetujui desain dan BOM dari staf? Dokumen akan masuk ke tahap Validasi Klien.' : 'Konfirmasi meneruskan desain & BOM ke Supervisor untuk di-review?'}
                </p>
              </div>
              <div style={{ background: S.bg, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: "13.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customer?.name}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Qty</span><span style={{ color: S.slate, fontWeight: 500 }}>{qut.quantity} {qut.unit}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: S.secondary }}>Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "12px", display: "flex", alignItems: "center", gap: 4, fontWeight: 500, textDecoration: "none" }}>Lihat <ExternalLink size={11} /></a>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Kembali</button>
                <button onClick={handleForward} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Send size={15} /> {isSpv ? 'Approve & Forward' : 'Forward ke Supervisor'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "13.5px" }}>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Qty</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.quantity} {qut.unit}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Deadline</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.deadline}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Input SO</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.createdAt}</p></div>
              </div>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: "12px", color: "#1D4ED8", margin: 0 }}>Silakan unggah dokumen CAD ke cloud dan masukkan Bill of Materials (BOM) di bawah ini.</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13.5px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Link Desain / Drawing <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
              </div>
              
              <div style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "13.5px", color: S.slate, fontWeight: 500 }}>Bill of Materials (BOM) <span style={{ color: "#EF4444" }}>*</span></label>
                  <button onClick={addMaterial} style={{ padding: "4px 8px", background: "rgba(200,16,46,0.1)", color: S.cyan, border: "none", borderRadius: 4, fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Tambah Material</button>
                </div>
                {materials.length === 0 ? (
                  <div style={{ padding: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: "12.5px", color: "#991B1B" }}>
                    Daftar material masih kosong. Wajib menambahkan minimal 1 material.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "200px", overflowY: "auto", paddingRight: 4 }}>
                    {materials.map(m => (
                      <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#F8FAFC", padding: 8, borderRadius: 6, border: `1px solid ${S.border}` }}>
                        <input placeholder="Nama material..." value={m.name} onChange={e => updateMaterial(m.id, 'name', e.target.value)} style={{ flex: 1.5, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", minWidth: 0 }} />
                        <input placeholder="Spesifikasi..." value={m.spec} onChange={e => updateMaterial(m.id, 'spec', e.target.value)} style={{ flex: 1, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", minWidth: 0 }} />
                        <input type="number" min="0.1" step="0.1" value={m.quantity || ''} onChange={e => updateMaterial(m.id, 'quantity', Number(e.target.value))} style={{ width: 60, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none" }} />
                        <select value={m.unit} onChange={e => updateMaterial(m.id, 'unit', e.target.value)} style={{ width: 70, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none" }}>
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="meter">meter</option>
                          <option value="lembar">lembar</option>
                          <option value="batang">batang</option>
                        </select>
                        <button onClick={() => removeMaterial(m.id)} style={{ padding: 4, background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex" }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
                <button onClick={() => setStep('confirm')} disabled={!designLink.trim() || materials.length === 0 || materials.some(m => !m.name.trim() || m.quantity <= 0)}
                  style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (designLink.trim() && materials.length > 0 && materials.every(m => m.name.trim() && m.quantity > 0)) ? 1 : 0.5 }}>
                  <Send size={15} /> {isSpv && isPendingSpv ? 'Review & Approve' : 'Submit & Forward'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EngineeringTasksPage() {
  const { quotations, customers } = useApp();
  const [selectedQUT, setSelectedQUT] = useState<Quotation | null>(null);

  const STATUS_ORDER = ['pending_design', 'design_review'];
  const queue = quotations
    .filter(q => STATUS_ORDER.includes(q.status))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Tugas Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola semua antrian desain, revisi, dan status persetujuan
          </p>
        </div>
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Semua Antrian Desain</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["No. QUT", "Pelanggan", "Produk", "Deadline", "Status"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
            <p style={{ color: S.slate, margin: 0, fontSize: "13.5px" }}>Semua pesanan sudah selesai didesain.</p>
          </div>
        ) : (
          queue.map((qut, idx) => (
            <div
              key={qut.id}
              onClick={() => setSelectedQUT(qut)}
              style={{
                display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px",
                padding: "10px 18px", cursor: "pointer",
                borderBottom: idx < queue.length - 1 ? `1px solid ${S.border}` : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{qut.id}</span>
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
              </div>
              <span style={{ color: S.slate, fontSize: "12.5px", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{qut.productName}</span>
              <span style={{ color: S.slate, fontSize: "12.5px", alignSelf: "center", fontWeight: 500 }}>{qut.deadline}</span>
              <div style={{ alignSelf: "center" }}>
                <StatusBadge status={qut.status} />
              </div>
            </div>
          ))
        )}
      </div>

      {selectedQUT && <DesignModal qut={selectedQUT} onClose={() => setSelectedQUT(null)} />}
    </div>
  );
}
