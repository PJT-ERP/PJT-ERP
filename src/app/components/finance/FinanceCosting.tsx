import React, { useState } from "react";
import { formatIDR } from "./mockData";

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
import { Search, Save, FileText, CheckCircle, ExternalLink, List, History } from "lucide-react";
import { useApp } from "../context/AppContext";
import { SalesOrder } from "../data/mockData";

export function FinanceCosting() {
  const { salesOrders, updateSalesOrder } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  // Status that indicates SO is ready for Costing (after SPV Engineering approval)
  const waitingPricingList = salesOrders.filter(so => so.status === "Menunggu Invoice DP");

  const filteredList = waitingPricingList.filter(so => 
    so.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    so.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    so.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // State for costing
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [costingNotes, setCostingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate initial prices when an SO is selected
  React.useEffect(() => {
    if (selectedSO) {
      const initialPrices: Record<string, number> = {};
      selectedSO.items?.forEach(item => {
        initialPrices[item.productId] = item.unitPrice || 0;
      });
      setItemPrices(initialPrices);
      setCostingNotes(selectedSO.material || "");
    }
  }, [selectedSO]);

  const handleSubmitCosting = () => {
    if (!selectedSO || !selectedSO.items) return;
    setIsSubmitting(true);
    
    // Simulating backend call delay
    setTimeout(() => {
      // Update local state: save unitPrices into items
      const updatedItems = selectedSO.items!.map(item => ({
        ...item,
        unitPrice: itemPrices[item.productId] || 0
      }));

      updateSalesOrder(selectedSO.id, { 
        items: updatedItems,
        // Since it's done costing, we can move it to a status that CreateInvoice picks up,
        // or just keep it as 'Menunggu Invoice DP' because CreateInvoice looks for it anyway.
        status: "Menunggu Invoice DP" 
      });
      
      setIsSubmitting(false);
      setSelectedSO(null);
      alert("Harga berhasil ditetapkan untuk SO ini!");
    }, 800);
  };

  const calculateTotal = () => {
    if (!selectedSO || !selectedSO.items) return 0;
    return selectedSO.items.reduce((total, item) => {
      return total + (itemPrices[item.productId] || 0) * item.quantity;
    }, 0);
  };

  const isAllPriced = selectedSO?.items?.every(item => (itemPrices[item.productId] || 0) > 0);

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      {/* Header */}
      <div>
        <h1 style={{ color: S.slate, margin: "0 0 8px 0", fontSize: "24px" }}>Costing & Pricing</h1>
        <p style={{ color: S.secondary, margin: 0, fontSize: "14px" }}>
          Tentukan harga modal (HPP) dan tetapkan harga jual berdasarkan BOM dari tim Engineering.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ position: "relative", width: 300 }}>
          <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
          <input 
            type="text" 
            placeholder="Cari No. SO atau Pelanggan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 38px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none" }}
          />
        </div>
      </div>

      {/* List / Table SO */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px 1.5fr 1.5fr 100px 150px", padding: "12px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["No. SO", "Pelanggan", "Produk (Items)", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {filteredList.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: S.secondary, fontSize: "14px" }}>
            Tidak ada Sales Order yang menunggu penetapan harga.
          </div>
        ) : (
          filteredList.map((so, idx) => {
            const itemCount = so.items?.length || 0;
            return (
              <div 
                key={so.id}
                style={{ 
                  display: "grid", gridTemplateColumns: "130px 1.5fr 1.5fr 100px 150px", alignItems: "center",
                  padding: "12px 18px", 
                  borderBottom: idx < filteredList.length - 1 ? `1px solid ${S.border}` : "none"
                }}
              >
                <span style={{ color: S.cyan, fontSize: "13px", fontWeight: 600, fontFamily: "monospace" }}>{so.soNumber || so.id}</span>
                <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500 }}>{so.customerId}</span>
                <span style={{ color: S.slate, fontSize: "13px" }}>{itemCount} Items</span>
                <div style={{ alignSelf: "center" }}>
                  <span style={{ fontSize: "11px", background: "#FEF3C7", color: "#D97706", padding: "4px 8px", borderRadius: 12, fontWeight: 500 }}>Waiting Pricing</span>
                </div>
                <div>
                  <button 
                    onClick={() => setSelectedSO(so)}
                    style={{ fontSize: "11px", background: S.cyan, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Set Harga
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Dialog Detail Costing */}
      {selectedSO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 800, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
              <div>
                <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Costing & Pricing - {selectedSO.soNumber || selectedSO.id}</h2>
                <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "13px" }}>
                  Pelanggan: {selectedSO.customerId}
                </p>
              </div>
              <button onClick={() => setSelectedSO(null)} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px", fontWeight: "bold" }}>&times;</button>
            </div>
            
            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              {/* Info Dokumen Desain */}
              <div style={{ background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}><List size={14} /> Dokumen Desain & BOM</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: 8 }}>
                  <span style={{ color: S.secondary }}>URL File Desain / BOM:</span>
                  {selectedSO.designLink || selectedSO.customerDrawingUrl ? (
                    <a href={selectedSO.designLink || selectedSO.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      Lihat Dokumen <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: S.slate }}>Tidak tersedia</span>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "8px 0 0" }}>
                  Silakan tinjau BOM untuk menghitung HPP Material, estimasi biaya Mesin (Produksi), dan overhead sebelum menentukan harga jual untuk masing-masing item.
                </p>
              </div>

              {/* Form Input Costing per Item */}
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 12px" }}>Daftar Item & Penetapan Harga</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: 16 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: `2px solid ${S.border}` }}>
                      <th style={{ textAlign: "left", padding: "10px", color: S.slate, fontWeight: 600 }}>Produk</th>
                      <th style={{ textAlign: "right", padding: "10px", color: S.slate, fontWeight: 600 }}>Qty</th>
                      <th style={{ textAlign: "right", padding: "10px", color: S.slate, fontWeight: 600 }}>Harga Satuan (Rp)</th>
                      <th style={{ textAlign: "right", padding: "10px", color: S.slate, fontWeight: 600 }}>Total Harga (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSO.items?.map((item, idx) => {
                      const unitPrice = itemPrices[item.productId] || 0;
                      const lineTotal = unitPrice * item.quantity;
                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${S.border}` }}>
                          <td style={{ padding: "12px 10px", color: S.slate }}>
                            <div style={{ fontWeight: 500 }}>{item.productPartNumber || item.productId}</div>
                            {item.productDescription && <div style={{ fontSize: "11px", color: S.secondary, marginTop: 2 }}>{item.productDescription}</div>}
                          </td>
                          <td style={{ padding: "12px 10px", color: S.slate, textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ padding: "12px 10px", textAlign: "right" }}>
                            <input 
                              type="number" 
                              value={unitPrice || ''} 
                              onChange={e => setItemPrices(prev => ({ ...prev, [item.productId]: Number(e.target.value) }))}
                              placeholder="Harga Satuan"
                              style={{ width: "120px", padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "13px", fontFamily: S.font, outline: "none", textAlign: "right" }} 
                            />
                          </td>
                          <td style={{ padding: "12px 10px", color: S.slate, textAlign: "right", fontWeight: 600 }}>
                            {formatIDR(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#F8FAFC" }}>
                      <td colSpan={3} style={{ padding: "12px 10px", textAlign: "right", fontWeight: 600, color: S.slate }}>Grand Total:</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, color: S.cyan, fontSize: "14px" }}>
                        {formatIDR(calculateTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan Pricing (Opsional)</label>
                  <textarea 
                    value={costingNotes}
                    onChange={e => setCostingNotes(e.target.value)}
                    placeholder="Catatan HPP, Margin, atau Penjelasan..."
                    rows={2}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 12, background: "#F8FAFC", borderRadius: "0 0 12px 12px" }}>
              <button onClick={() => setSelectedSO(null)} style={{ padding: "10px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                Batal
              </button>
              <button 
                disabled={!isAllPriced || isSubmitting}
                onClick={handleSubmitCosting} 
                style={{ padding: "10px 20px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: isAllPriced && !isSubmitting ? 1 : 0.5 }}
              >
                <Save size={15} /> 
                {isSubmitting ? 'Menyimpan...' : 'Tetapkan Harga'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
