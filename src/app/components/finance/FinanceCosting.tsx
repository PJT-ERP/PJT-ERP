import React, { useState } from "react";
import { DollarSign, CheckCircle, Calculator, ChevronDown, List, X, ExternalLink, Save, History } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Quotation, getQuotationStatusColor } from "../data/mockData";

const S = {
  font: "Inter, sans-serif",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
  cyan: "#C8102E",
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getQuotationStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {cfg.label}
    </span>
  );
}

export function FinanceCosting() {
  const { quotations, customers, updateQuotation } = useApp();
  const [selectedQUT, setSelectedQUT] = useState<Quotation | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [costingNotes, setCostingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const waitingPricingList = quotations.filter(q => q.status === "waiting_pricing");

  const handleSelect = (q: Quotation) => {
    setSelectedQUT(q);
    setEstimatedAmount(q.estimatedAmount ? q.estimatedAmount.toString() : "");
    setCostingNotes("");
  };

  const handleSubmitCosting = () => {
    if (!selectedQUT || !estimatedAmount || isSubmitting) return;

    setIsSubmitting(true);
    const amount = Number(estimatedAmount);
    
    // Add revision history
    const prevRevisions = selectedQUT.revisions || [];
    const newRevNumber = prevRevisions.length + 1;
    
    const newRevision = {
      revNumber: newRevNumber,
      amount,
      date: new Date().toISOString().split("T")[0],
      notes: costingNotes,
    };

    updateQuotation(selectedQUT.id, {
      estimatedAmount: amount,
      revisions: [...prevRevisions, newRevision],
      status: "client_price_approval", // send back to sales/client
    });

    setSelectedQUT(null);
    setIsSubmitting(false);
  };

  return (
    <div style={{ padding: "20px 24px", fontFamily: S.font, display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ color: S.slate, margin: 0, fontSize: "20px", fontWeight: 600 }}>Costing & Pricing</h1>
        <p style={{ color: S.secondary, fontSize: "13px", marginTop: 4 }}>
          Hitung HPP dan tetapkan penawaran harga untuk desain yang telah disetujui
        </p>
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calculator size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Antrian Penentuan Harga</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px", padding: "10px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["No. QUT", "Pelanggan", "Produk", "Qty", "Status"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {waitingPricingList.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
            <p style={{ color: S.slate, margin: 0, fontSize: "14px", fontWeight: 500 }}>Tidak ada antrian costing saat ini.</p>
          </div>
        ) : (
          waitingPricingList.map((qut, idx) => {
            const customer = customers.find(c => c.code === qut.customerId);
            return (
              <div
                key={qut.id}
                onClick={() => handleSelect(qut)}
                style={{
                  display: "grid", gridTemplateColumns: "130px 1fr 1fr 100px 130px",
                  padding: "12px 18px", cursor: "pointer",
                  borderBottom: idx < waitingPricingList.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ color: S.cyan, fontSize: "13px", fontWeight: 500, fontFamily: "monospace" }}>{qut.id}</span>
                <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500 }}>{customer?.name || "-"}</span>
                <span style={{ color: S.slate, fontSize: "13px" }}>{qut.productName}</span>
                <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500 }}>{qut.quantity} {qut.unit}</span>
                <div style={{ alignSelf: "center" }}>
                  <StatusBadge status={qut.status} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Dialog Detail Costing */}
      {selectedQUT && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 600, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
              <div>
                <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Costing & Pricing - {selectedQUT.id}</h2>
                <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "13px" }}>
                  {selectedQUT.productName} ({selectedQUT.quantity} {selectedQUT.unit})
                </p>
              </div>
              <button onClick={() => setSelectedQUT(null)} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px", fontWeight: "bold" }}>&times;</button>
            </div>
            
            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              {/* Info Dokumen Desain */}
              <div style={{ background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}><List size={14} /> Dokumen Desain & BOM</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: 8 }}>
                  <span style={{ color: S.secondary }}>URL File Desain / BOM:</span>
                  {selectedQUT.designLink || selectedQUT.designId ? (
                    <a href={selectedQUT.designLink || selectedQUT.designId} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      Lihat Dokumen <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: S.slate }}>Tidak tersedia</span>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "8px 0 0" }}>
                  Silakan tinjau BOM untuk menghitung HPP Material, estimasi biaya Mesin (Produksi), dan overhead sebelum menentukan harga jual.
                </p>
              </div>

              {/* History Revisi Harga Jika Ada */}
              {(selectedQUT.revisions && selectedQUT.revisions.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><History size={14} /> Riwayat Harga</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedQUT.revisions.map((rev, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", background: S.bg, padding: "8px 12px", borderRadius: 6, border: `1px solid ${S.border}`, fontSize: "13px" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: S.slate }}>Rev {rev.revNumber}</span>
                          <span style={{ color: S.secondary, marginLeft: 8 }}>{rev.date}</span>
                          {rev.notes && <p style={{ fontSize: "11px", color: S.secondary, margin: "4px 0 0" }}>{rev.notes}</p>}
                        </div>
                        <span style={{ fontWeight: 600, color: S.slate }}>{formatIDR(rev.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input Costing */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>
                    Harga Penawaran Total (Rp) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary, fontWeight: 500 }}>Rp</div>
                    <input 
                      type="number" 
                      value={estimatedAmount} 
                      onChange={e => setEstimatedAmount(e.target.value)}
                      placeholder="Contoh: 15000000"
                      style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", fontWeight: 500 }} 
                    />
                  </div>
                  {estimatedAmount && (
                    <p style={{ fontSize: "12px", color: S.cyan, marginTop: 6, fontWeight: 500 }}>
                      Terbilang format: {formatIDR(Number(estimatedAmount))}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan Pricing (Opsional)</label>
                  <textarea 
                    value={costingNotes}
                    onChange={e => setCostingNotes(e.target.value)}
                    placeholder="Catatan HPP, Margin, atau Penjelasan Revisi..."
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 12, background: "#F8FAFC", borderRadius: "0 0 12px 12px" }}>
              <button onClick={() => setSelectedQUT(null)} style={{ padding: "10px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                Batal
              </button>
              <button 
                disabled={!estimatedAmount || isSubmitting}
                onClick={handleSubmitCosting} 
                style={{ padding: "10px 20px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: estimatedAmount && !isSubmitting ? 1 : 0.5 }}
              >
                <Save size={15} /> 
                {isSubmitting ? 'Menyimpan...' : (selectedQUT.revisions && selectedQUT.revisions.length > 0) ? 'Kirim Revisi Harga' : 'Tetapkan Harga'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
