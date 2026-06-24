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
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  
  const [isEditingBom, setIsEditingBom] = useState(false);
  const [bomItems, setBomItems] = useState<{ inventoryItemId: string; quantity: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = productCatalog.filter(p => 
    p.partNumber.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditBom = (p: ProductDto) => {
    setSelectedProduct(p);
    setBomItems(p.bomItems?.map(b => ({
      inventoryItemId: b.inventoryItemId,
      quantity: String(b.quantity)
    })) || []);
    setIsEditingBom(true);
  };

  const handleAddBomItem = () => {
    setBomItems([...bomItems, { inventoryItemId: '', quantity: '1' }]);
  };

  const handleRemoveBomItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleSaveBom = async () => {
    if (!selectedProduct) return;
    try {
      setIsSaving(true);
      const formattedItems = bomItems
        .filter(b => b.inventoryItemId && Number(b.quantity) > 0)
        .map(b => ({ inventoryItemId: b.inventoryItemId, quantity: Number(b.quantity) }));
      
      await salesApi.updateProductBom(selectedProduct.id, { bomItems: formattedItems });
      await refreshBackendData();
      setIsEditingBom(false);
    } catch (e) {
      alert("Gagal menyimpan BOM");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "20px 32px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: S.slate, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={22} style={{ color: S.primary }} /> Master Produk & BOM
          </h2>
          <p style={{ margin: "4px 0 0", color: S.secondary, fontSize: "14px" }}>
            Kelola daftar Finished Goods dan Standard Bill of Materials (BOM)
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LIST */}
        <div style={{ flex: 1, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, background: "#F8FAFC" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                placeholder="Cari part number atau nama produk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 36px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13px", outline: "none" }}
              />
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F1F5F9", textAlign: "left", color: S.slate }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Part Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Deskripsi Produk</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Satuan</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>BOM Terdaftar</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{p.partNumber}</td>
                    <td style={{ padding: "12px 16px" }}>{p.description}</td>
                    <td style={{ padding: "12px 16px" }}>{p.unit}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.bomItems && p.bomItems.length > 0 ? (
                        <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontSize: "11px", fontWeight: 600 }}>{p.bomItems.length} Item</span>
                      ) : (
                        <span style={{ color: S.secondary, fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button onClick={() => handleEditBom(p)} style={{ background: "transparent", border: "none", color: S.primary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: 600 }}>
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
        </div>

        {/* BOM EDITOR */}
        {isEditingBom && selectedProduct && (
          <div style={{ width: 400, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, background: "#F8FAFC", borderRadius: "12px 12px 0 0" }}>
              <h3 style={{ margin: 0, fontSize: "15px", color: S.slate }}>Kelola Standard BOM</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: S.secondary, fontWeight: 500 }}>{selectedProduct.partNumber} - {selectedProduct.description}</p>
            </div>
            
            <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {bomItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: "#F1F5F9", padding: 12, borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
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
                  <div style={{ width: 60 }}>
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
              ))}
              
              <button onClick={handleAddBomItem} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px dashed ${S.primary}`, color: S.primary, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={16} /> Tambah Material
              </button>
            </div>
            
            <div style={{ padding: 16, borderTop: `1px solid ${S.border}`, display: "flex", gap: 8, justifyContent: "flex-end", background: "#F8FAFC", borderRadius: "0 0 12px 12px" }}>
              <button onClick={() => setIsEditingBom(false)} style={{ padding: "8px 16px", border: `1px solid ${S.border}`, background: "#fff", borderRadius: 6, fontSize: "13px", cursor: "pointer", color: S.secondary }}>Batal</button>
              <button onClick={handleSaveBom} disabled={isSaving} style={{ padding: "8px 16px", border: "none", background: S.primary, color: "#fff", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                {isSaving ? "Menyimpan..." : "Simpan BOM"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
