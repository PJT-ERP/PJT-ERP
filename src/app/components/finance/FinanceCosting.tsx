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
import { SalesOrder, SOStatus } from "../data/mockData";
import { StatusBadge } from "../shared/StatusBadge";
import { salesApi } from "../../services/salesApi";

export function FinanceCosting() {
  const { salesOrders, customers, updateSalesOrder } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  // Status that indicates SO is ready for Costing (after SPV Engineering approval)
  const waitingPricingSO = salesOrders.filter(so => so.status === "Waiting Pricing").map(so => ({
    ...so,
    isQuotation: false
  }));

  const historyStatuses = [
    'Menunggu Invoice DP',
    'Waiting Payment',
    'Waiting Client Approval',
    'Ready for Production',
    'In Production',
    'QC',
    'Completed'
  ];

  const historySO = salesOrders.filter(so => 
    historyStatuses.includes(so.status)
  ).map(so => ({
    ...so,
    isQuotation: false
  })).sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());

  const activeList = activeTab === 'queue' ? waitingPricingSO : historySO;

  const filteredList = activeList.filter(item => 
    (item.id || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.customerId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // State for costing
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [costingNotes, setCostingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate initial prices when an SO is selected
  React.useEffect(() => {
    if (selectedItem) {
      const initialPrices: Record<string, number> = {};
      selectedItem.items?.forEach((item: any) => {
        initialPrices[item.productId] = item.unitPrice || 0;
      });
      setItemPrices(initialPrices);
      setCostingNotes(selectedItem.material || selectedItem.notes || "");
    }
  }, [selectedItem]);

  const handleSubmitCosting = () => {
    if (!selectedItem || !selectedItem.items) return;
    setIsSubmitting(true);
    
    setTimeout(async () => {
      // Handle SO logic
      const updatedItems = selectedItem.items!.map((item: any) => ({
        ...item,
        unitPrice: itemPrices[item.productId] || 0
      }));

      try {
        // Backend integration
        await salesApi.updateSalesOrderPricing(selectedItem.backendId || selectedItem.id, {
          items: updatedItems.map((item: any) => ({
            salesOrderItemId: item.id,
            unitPrice: item.unitPrice
          }))
        });

        // Local state update for smooth UX
        updateSalesOrder(selectedItem.id, { 
          items: updatedItems,
          status: "Menunggu Invoice DP" 
        });
      } catch (error) {
        console.error("Failed to update pricing to backend", error);
        alert("Gagal menyimpan ke backend. Menjalankan secara lokal.");
        updateSalesOrder(selectedItem.id, { 
          items: updatedItems,
          status: "Menunggu Invoice DP" 
        });
      }
      
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 800);
  };

  const calculateTotal = () => {
    if (!selectedItem || !selectedItem.items) return 0;
    return selectedItem.items.reduce((total: number, item: any) => {
      return total + (itemPrices[item.productId] || 0) * item.quantity;
    }, 0);
  };

  const isAllPriced = selectedItem?.items?.every((item: any) => (itemPrices[item.productId] || 0) > 0);
  const isReadOnly = selectedItem && activeTab === 'history' && selectedItem.status !== "Menunggu Invoice DP";

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
        <div style={{ display: "flex", background: S.bg, padding: 4, borderRadius: 8, border: `1px solid ${S.border}` }}>
          <button
            onClick={() => setActiveTab('queue')}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "none",
              background: activeTab === 'queue' ? S.white : "transparent",
              color: activeTab === 'queue' ? S.slate : S.secondary,
              fontWeight: activeTab === 'queue' ? 600 : 500, fontSize: "13px", cursor: "pointer",
              boxShadow: activeTab === 'queue' ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <List size={14} /> Antrean ({waitingPricingSO.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "none",
              background: activeTab === 'history' ? S.white : "transparent",
              color: activeTab === 'history' ? S.slate : S.secondary,
              fontWeight: activeTab === 'history' ? 600 : 500, fontSize: "13px", cursor: "pointer",
              boxShadow: activeTab === 'history' ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <History size={14} /> Riwayat
          </button>
        </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "130px 1.2fr 1.3fr 110px 180px 120px", padding: "12px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
          {["No. SO", "Pelanggan", "Produk (Items)", "Deadline", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {filteredList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: S.secondary, fontSize: "14px" }}>
            {activeTab === 'queue' ? "Tidak ada antrean pesanan yang menunggu penetapan harga." : "Riwayat costing masih kosong."}
          </div>
        ) : (
          filteredList.map((so, idx) => {
            const itemCount = so.items?.length || 0;
            return (
              <div 
                key={so.id}
                style={{ 
                  display: "grid", gridTemplateColumns: "130px 1.2fr 1.3fr 110px 180px 120px", alignItems: "center",
                  padding: "12px 18px", 
                  borderBottom: idx < filteredList.length - 1 ? `1px solid ${S.border}` : "none"
                }}
              >
                <span style={{ color: S.cyan, fontSize: "13px", fontWeight: 600, fontFamily: "monospace" }}>{so.soNumber || so.id}</span>
                <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500 }}>{customers?.find(c => c.code === so.customerId)?.name || so.customerName || so.customerId}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500 }}>{so.productName || so.description || "-"}</span>
                  <span style={{ color: S.secondary, fontSize: "11px" }}>{itemCount} items</span>
                </div>
                <span style={{ color: S.secondary, fontSize: "13px" }}>{so.deadline || "-"}</span>
                <div style={{ alignSelf: "center" }}>
                  <StatusBadge status={so.status as SOStatus} />
                </div>
                <div>
                  <button 
                    onClick={() => setSelectedItem(so)}
                    style={{ fontSize: "11px", background: activeTab === 'queue' ? S.cyan : S.white, color: activeTab === 'queue' ? "#fff" : S.slate, border: activeTab === 'queue' ? "none" : `1px solid ${S.border}`, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    {activeTab === 'queue' ? "Set Harga" : "Detail / Revisi"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Dialog Detail Costing */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 800, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
              <div>
                <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Costing & Pricing - {selectedItem.soNumber || selectedItem.id}</h2>
                <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "13px" }}>
                  Pelanggan: {selectedItem.customerName || selectedItem.customerId}
                </p>
              </div>
              <button onClick={() => { setSelectedItem(null); setSubmitSuccess(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px", fontWeight: "bold" }}>&times;</button>
            </div>
            
            {submitSuccess ? (
              <div style={{ padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CheckCircle size={50} style={{ color: "#10B981", margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "20px", fontWeight: 600, color: S.slate, margin: "0 0 8px" }}>Harga Berhasil Ditetapkan!</h3>
                <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 32px", maxWidth: 400 }}>
                  Data harga untuk pesanan ini telah berhasil disimpan. Pesanan akan segera diproses ke tahap selanjutnya.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button 
                    onClick={() => {
                      setSubmitSuccess(false);
                      setSelectedItem(null);
                    }}
                    style={{ background: S.white, color: S.slate, border: `1px solid ${S.border}`, padding: "10px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                  >
                    Tutup & Kembali
                  </button>
                  <button 
                    onClick={() => {
                      const soId = selectedItem.backendId || selectedItem.id;
                      window.location.href = `/erp/finance/create-invoice?so=${soId}`;
                    }}
                    style={{ background: S.cyan, color: S.white, border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                  >
                    Buat Invoice Sekarang
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              {isReadOnly && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <p style={{ color: "#991B1B", margin: 0, fontSize: "13.5px", fontWeight: 500 }}>
                    ⚠️ Data bersifat Read-Only
                  </p>
                  <p style={{ color: "#B91C1C", margin: "4px 0 0", fontSize: "12.5px" }}>
                    Pesanan ini sudah dibuatkan Invoice / dilanjutkan prosesnya, sehingga harga tidak bisa diubah lagi.
                  </p>
                </div>
              )}
              
              {/* Cek apakah ini produk standar yang melompati fase desain */}
              {selectedItem.backendDesignStatus === "Approved" && !selectedItem.designApprovedAt ? (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "#1D4ED8", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                    🏷️ Pemrosesan Produk Standar
                  </h3>
                  <p style={{ color: "#1E3A8A", margin: 0, fontSize: "12.5px", lineHeight: "1.5" }}>
                    Pesanan ini menggunakan produk standar perusahaan. Anda dapat langsung menentukan Harga Jual tanpa perlu menunggu rincian HPP / BOM dari tim Engineering.
                  </p>
                </div>
              ) : (
                /* Info Dokumen Desain untuk Produk Custom */
                <div style={{ background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}><List size={14} /> Dokumen Desain & BOM</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: 8 }}>
                    <span style={{ color: S.secondary }}>URL File Desain / BOM:</span>
                    {selectedItem.designLink || selectedItem.customerDrawingUrl ? (
                      <a href={selectedItem.designLink || selectedItem.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                        Lihat Dokumen <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: S.slate }}>Tidak tersedia</span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: S.secondary, margin: "8px 0 0" }}>
                    Silakan tinjau BOM untuk menghitung HPP Material, estimasi biaya Mesin (Produksi), dan overhead sebelum menentukan harga jual untuk masing-masing item.
                  </p>
                  {selectedItem.materials && selectedItem.materials.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 600, color: S.slate, margin: "0 0 8px" }}>Daftar Material (BOM):</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left", background: S.white, border: `1px solid ${S.border}` }}>
                        <thead style={{ background: "#F1F5F9", borderBottom: `1px solid ${S.border}` }}>
                          <tr>
                            <th style={{ padding: "6px 10px", fontWeight: 600, color: S.secondary }}>Material</th>
                            <th style={{ padding: "6px 10px", fontWeight: 600, color: S.secondary }}>Spesifikasi</th>
                            <th style={{ padding: "6px 10px", fontWeight: 600, color: S.secondary, width: "80px" }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.materials.map((m: any, i: number) => (
                            <tr key={m.id || i} style={{ borderBottom: i < selectedItem.materials.length - 1 ? `1px solid ${S.border}` : "none" }}>
                              <td style={{ padding: "6px 10px", color: S.slate }}>{m.name}</td>
                              <td style={{ padding: "6px 10px", color: S.secondary }}>{m.spec || m.specification || "-"}</td>
                              <td style={{ padding: "6px 10px", color: S.slate }}>{m.quantity} {m.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Rincian Items */}
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}><List size={14} /> Rincian Item SO</h3>
              <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead style={{ background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
                    <tr>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: S.secondary }}>Produk</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: S.secondary, width: "100px" }}>Qty</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: S.secondary, width: "200px" }}>Harga Jual (Rp)</th>
                      <th style={{ padding: "10px 14px", fontWeight: 600, color: S.secondary, width: "150px", textAlign: "right" }}>Subtotal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.items?.map((item: any, idx: number) => {
                      const price = itemPrices[item.productId] || 0;
                      const subtotal = price * item.quantity;
                      return (
                        <tr key={item.productId || idx} style={{ borderBottom: idx < (selectedItem.items?.length || 0) - 1 ? `1px solid ${S.border}` : "none" }}>
                          <td style={{ padding: "12px 14px", color: S.slate, fontWeight: 500 }}>{item.productName}</td>
                          <td style={{ padding: "12px 14px", color: S.secondary }}>{item.quantity} {item.unit}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: S.secondary, fontSize: "12px" }}>Rp</span>
                              <input 
                                type="number"
                                min="0"
                                value={price || ""}
                                disabled={isReadOnly}
                                onChange={(e) => setItemPrices({ ...itemPrices, [item.productId]: Number(e.target.value) })}
                                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 30px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", backgroundColor: isReadOnly ? "#F8FAFC" : "#fff" }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", color: S.slate, fontWeight: 600, textAlign: "right" }}>
                            {subtotal.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "#FAFAFA", borderTop: `2px solid ${S.border}` }}>
                      <td colSpan={3} style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: S.slate }}>Total Keseluruhan:</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: S.cyan, fontSize: "14px" }}>
                        Rp {calculateTotal().toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Catatan Costing */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: S.slate, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> Catatan / Rincian Modal (HPP)</h3>
                <textarea 
                  rows={4}
                  placeholder="Misal: Material A: 50.000, Material B: 30.000, Ongkos Produksi: 20.000. Total Modal: 100.000. Margin: 20%"
                  value={costingNotes}
                  disabled={isReadOnly}
                  onChange={(e) => setCostingNotes(e.target.value)}
                  style={{ width: "100%", padding: "12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "vertical", boxSizing: "border-box", backgroundColor: isReadOnly ? "#F8FAFC" : "#fff" }}
                />
              </div>

            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${S.border}`, background: "#FAFAFA", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                onClick={() => { setSelectedItem(null); setSubmitSuccess(false); }}
                style={{ padding: "10px 20px", border: `1px solid ${S.border}`, background: S.white, color: S.slate, borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "13.5px" }}
              >
                Batal
              </button>
              {!isReadOnly && (
                <button 
                  onClick={handleSubmitCosting}
                  disabled={isSubmitting || !isAllPriced}
                  style={{ 
                    padding: "10px 24px", border: "none", 
                    background: isAllPriced ? S.cyan : "#E2E8F0", 
                    color: isAllPriced ? "#fff" : "#94A3B8", 
                    borderRadius: 6, cursor: isAllPriced ? "pointer" : "not-allowed", 
                    fontWeight: 600, fontSize: "13.5px",
                    display: "flex", alignItems: "center", gap: 8
                  }}
                >
                  {isSubmitting ? "Menyimpan..." : (
                    <>
                      <CheckCircle size={16} /> Simpan & Tetapkan Harga
                    </>
                  )}
                </button>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
