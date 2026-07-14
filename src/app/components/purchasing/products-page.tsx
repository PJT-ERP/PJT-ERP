import React, { useState } from 'react';
import { Package, Search, Plus, Trash2, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { salesApi, ProductDto } from '../../services/salesApi';
import { usePurchasingData } from './usePurchasingData';

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  secondary: "#64748b",
  slate: "#1e293b",
  border: "#e2e8f0",
  white: "#ffffff",
};

export function ProductsPage() {
  const { productCatalog, refreshBackendData } = useApp();
  const { inventoryItems } = usePurchasingData();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Force reload
  
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [isEditingBom, setIsEditingBom] = useState(false);
  const [bomItems, setBomItems] = useState<{ inventoryItemId: string; quantity: string; specification?: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = productCatalog.filter(p => 
    p.partNumber.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditBom = (p: ProductDto) => {
    setSelectedProduct(p);
    setBomItems(p.bomItems?.map(b => ({
      inventoryItemId: b.inventoryItemId,
      quantity: String(b.quantity),
      specification: b.specification || b.spec || ""
    })) || []);
    setIsEditingBom(true);
  };

  const handleAddBomItem = () => {
    setBomItems([...bomItems, { inventoryItemId: '', quantity: '1', specification: '' }]);
  };

  const handleRemoveBomItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const getDuplicateIndices = () => {
    const seenKeys = new Map<string, number>();
    const dupes = new Set<number>();
    for (let i = 0; i < bomItems.length; i++) {
      const b = bomItems[i];
      if (!b.inventoryItemId) continue;
      const specKey = (b.specification || "").trim().toLowerCase();
      const key = `${b.inventoryItemId}|${specKey}`;
      if (seenKeys.has(key)) {
        dupes.add(i);
        dupes.add(seenKeys.get(key)!);
      } else {
        seenKeys.set(key, i);
      }
    }
    return dupes;
  };
  const duplicateIndices = getDuplicateIndices();
  const hasDuplicateMaterial = duplicateIndices.size > 0;

  const handleSaveBom = async () => {
    if (!selectedProduct || hasDuplicateMaterial) return;
    try {
      setIsSaving(true);
      const parsedItems = bomItems.filter(b => b.inventoryItemId && Number(b.quantity) > 0).map(b => ({
        inventoryItemId: b.inventoryItemId,
        quantity: Number(b.quantity),
        specification: (b.specification || "").trim(),
        spec: (b.specification || "").trim()
      }));
      await salesApi.updateProductBom(selectedProduct.id, { bomItems: parsedItems });
      await refreshBackendData();
      setIsEditingBom(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save BOM");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", fontFamily: S.font }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: S.slate, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 12 }}>
          <Package style={{ color: S.primary }} />
          Master Produk & BOM
        </h1>
        <p style={{ margin: 0, color: S.secondary, fontSize: "14px" }}>
          Kelola daftar Finished Goods dan Standard Bill of Materials (BOM)
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* LIST */}
        <div style={{ flex: 1, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${S.border}` }}>
            <div style={{ position: "relative", maxWidth: 400 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input 
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Cari part number atau nama produk..."
                style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none" }}
              />
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: S.slate }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `2px solid ${S.border}`, color: S.secondary, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px 12px 24px", fontWeight: 600, textAlign: "left", width: "20%" }}>Part Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "left", width: "35%" }}>Deskripsi Produk</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "left", width: "15%" }}>Satuan</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "left", width: "15%" }}>BOM Terdaftar</th>
                  <th style={{ padding: "12px 24px 12px 16px", fontWeight: 600, textAlign: "left", width: "15%" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: "12px 16px 12px 24px", fontWeight: 500 }}>{p.partNumber}</td>
                    <td style={{ padding: "12px 16px" }}>{p.description}</td>
                    <td style={{ padding: "12px 16px" }}>{p.unit}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.bomItems && p.bomItems.length > 0 ? (
                        <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontSize: "11px", fontWeight: 600 }}>{p.bomItems.length} Item</span>
                      ) : (
                        <span style={{ color: S.secondary, fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 24px 12px 16px", textAlign: "left" }}>
                      <button 
                        onClick={() => handleEditBom(p)} 
                        style={{ 
                          background: "#FEF2F2", 
                          border: `1px solid #FECACA`, 
                          color: S.primary, 
                          borderRadius: 6,
                          padding: "6px 12px",
                          cursor: "pointer", 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: 6, 
                          fontSize: "12px", 
                          fontWeight: 600,
                          transition: "all 0.12s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.borderColor = "#FCA5A5"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.borderColor = "#FECACA"; }}
                      >
                        <Edit2 size={12} /> Kelola BOM
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: "center", color: S.secondary }}>Tidak ada data produk</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: S.secondary }}>
              <span>Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} dari {filtered.length} produk</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: "6px 12px", border: `1px solid ${S.border}`, borderRadius: 6, background: currentPage === 1 ? "#F8FAFC" : S.white, cursor: currentPage === 1 ? "not-allowed" : "pointer", color: S.slate }}
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: "6px 12px", border: `1px solid ${S.border}`, borderRadius: 6, background: currentPage === totalPages ? "#F8FAFC" : S.white, cursor: currentPage === totalPages ? "not-allowed" : "pointer", color: S.slate }}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOM EDITOR */}
        {isEditingBom && selectedProduct && (
          <div style={{ width: 540, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, background: "#F8FAFC", borderRadius: "12px 12px 0 0" }}>
              <h3 style={{ margin: 0, fontSize: "15px", color: S.slate }}>Kelola Standard BOM</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: S.secondary, fontWeight: 500 }}>{selectedProduct.partNumber} - {selectedProduct.description}</p>
            </div>
            
            <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {hasDuplicateMaterial && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: "12px", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                  <span>⚠️ Material dengan spesifikasi yang sama sudah ada di daftar BOM! Spesifikasi untuk material yang sama wajib berbeda.</span>
                </div>
              )}

              {bomItems.map((item, idx) => {
                const isDup = duplicateIndices.has(idx);
                return (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: isDup ? "#FEE2E2" : "#F1F5F9", padding: 12, borderRadius: 8, border: isDup ? "1px solid #F87171" : "1px solid transparent" }}>
                    <div style={{ flex: 1.2 }}>
                      <label style={{ display: "block", fontSize: "11px", color: S.secondary, marginBottom: 4 }}>Material</label>
                      <select
                        value={item.inventoryItemId}
                        onChange={e => {
                          const newItems = [...bomItems];
                          newItems[idx].inventoryItemId = e.target.value;
                          setBomItems(newItems);
                        }}
                        style={{ width: "100%", padding: "6px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px" }}
                      >
                        <option value="">-- Pilih Material --</option>
                        {inventoryItems.map((inv: any) => (
                          <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "11px", color: S.secondary, marginBottom: 4 }}>Spesifikasi</label>
                      <input 
                        type="text"
                        placeholder="Contoh: 100x50mm / 2mm"
                        value={item.specification || ""}
                        onChange={e => {
                          const newItems = [...bomItems];
                          newItems[idx].specification = e.target.value;
                          setBomItems(newItems);
                        }}
                        style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px" }}
                      />
                    </div>
                    <div style={{ width: 65 }}>
                      <label style={{ display: "block", fontSize: "11px", color: S.secondary, marginBottom: 4 }}>Qty</label>
                      <input 
                        type="number" min="0" step="any"
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...bomItems];
                          newItems[idx].quantity = e.target.value;
                          setBomItems(newItems);
                        }}
                        style={{ width: "100%", boxSizing: "border-box", padding: "6px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", textAlign: "right" }}
                      />
                    </div>
                    <button onClick={() => handleRemoveBomItem(idx)} style={{ alignSelf: "flex-end", padding: "7px", background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 4, cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              
              <button onClick={handleAddBomItem} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px dashed ${S.primary}`, color: S.primary, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={16} /> Tambah Material
              </button>
            </div>
            
            <div style={{ padding: 16, borderTop: `1px solid ${S.border}`, display: "flex", gap: 8, justifyContent: "flex-end", background: "#F8FAFC", borderRadius: "0 0 12px 12px" }}>
              <button onClick={() => setIsEditingBom(false)} style={{ padding: "8px 16px", border: `1px solid ${S.border}`, background: "#fff", borderRadius: 6, fontSize: "13px", cursor: "pointer", color: S.secondary }}>Batal</button>
              <button onClick={handleSaveBom} disabled={isSaving || hasDuplicateMaterial} style={{ padding: "8px 16px", border: "none", background: (isSaving || hasDuplicateMaterial) ? S.secondary : S.primary, color: "#fff", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: (isSaving || hasDuplicateMaterial) ? "not-allowed" : "pointer" }}>
                {isSaving ? "Menyimpan..." : "Simpan BOM"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
