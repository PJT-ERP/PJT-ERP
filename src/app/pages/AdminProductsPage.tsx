import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { useApp } from '../components/context/AppContext';
import { salesApi, ProductDto } from '../services/salesApi';
import { usePurchasingData } from '../components/purchasing/usePurchasingData';

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  secondary: "#64748b",
  slate: "#1e293b",
  border: "#e2e8f0",
  white: "#ffffff",
};

export function AdminProductsPage() {
  const { productCatalog, refreshBackendData } = useApp();
  const { inventoryItems } = usePurchasingData();
  const [search, setSearch] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  const [partNumberPreview, setPartNumberPreview] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newSpec, setNewSpec] = useState(''); 
  const [bomItems, setBomItems] = useState<{ inventoryItemId: string; quantity: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAdding && !isEditingId) {
      let maxNum = 0;
      productCatalog.forEach(p => {
        if (p.partNumber.startsWith("PRD-")) {
          const num = parseInt(p.partNumber.split("-")[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      setPartNumberPreview(`PRD-${nextNum}`);
      setBomItems([]);
    }
  }, [isAdding, isEditingId, productCatalog]);

  const filtered = productCatalog.filter(p => 
    p.partNumber.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (p: ProductDto) => {
    setIsEditingId(p.id);
    setPartNumberPreview(p.partNumber);
    setNewDesc(p.description);
    setNewUnit(p.unit);
    setNewSpec(p.materialSpec || '');
    setBomItems((p.bomItems || []).map(b => ({ inventoryItemId: b.inventoryItemId, quantity: b.quantity.toString() })));
    setIsAdding(true);
  };

  const handleDelete = async (id: string, partNumber: string) => {
    if (confirm(`Yakin ingin menghapus produk ${partNumber}?`)) {
      try {
        await salesApi.deleteProduct(id);
        await refreshBackendData();
      } catch (e) {
        alert("Gagal menghapus produk");
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!newDesc) return alert("Deskripsi wajib diisi");
    try {
      setIsSaving(true);
      
      const formattedBom = bomItems
        .filter(b => b.inventoryItemId && Number(b.quantity) > 0)
        .map(b => ({ inventoryItemId: b.inventoryItemId, quantity: Number(b.quantity) }));

      if (isEditingId) {
        // Mock update for now since backend might not have updateProduct yet
        // In a real app we'd call salesApi.updateProduct(isEditingId, {...})
        alert("Fungsi edit segera tersedia (membutuhkan update API backend)");
      } else {
        await salesApi.createProduct({
          partNumber: partNumberPreview,
          description: newDesc,
          unit: newUnit,
          materialSpec: newSpec,
          bomItems: formattedBom
        });
      }
      
      await refreshBackendData();
      setIsAdding(false);
      setIsEditingId(null);
      setNewDesc('');
      setNewUnit('pcs');
      setNewSpec('');
    } catch (e) {
      alert("Gagal menyimpan produk");
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsAdding(false);
    setIsEditingId(null);
    setNewDesc('');
    setNewUnit('pcs');
    setNewSpec('');
    setBomItems([]);
  };

  return (
    <div style={{ padding: "20px 32px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: S.slate, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={22} style={{ color: S.primary }} /> Master Produk
          </h2>
          <p style={{ margin: "4px 0 0", color: S.secondary, fontSize: "14px" }}>
            Kelola daftar Finished Goods (Produk) yang ditawarkan ke pelanggan.
          </p>
        </div>
        <button onClick={() => setIsAdding(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: S.primary, color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 5px rgba(200,16,46,0.2)" }}>
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div style={{ background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
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
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Spesifikasi Material</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: S.primary }}>{p.partNumber}</td>
                  <td style={{ padding: "12px 16px" }}>{p.description}</td>
                  <td style={{ padding: "12px 16px" }}>{p.unit}</td>
                  <td style={{ padding: "12px 16px" }}>{p.materialSpec || "-"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => handleEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, padding: 4 }} title="Edit"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(p.id, p.partNumber)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }} title="Hapus"><Trash2 size={15} /></button>
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

      {isAdding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: S.white, width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 12, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: S.slate }}>{isEditingId ? "Edit Produk" : "Tambah Produk Baru"}</h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.slate, marginBottom: 6 }}>ID Produk / Part Number</label>
                <input disabled value={partNumberPreview} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", background: "#F1F5F9", color: S.secondary, fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.slate, marginBottom: 6 }}>Deskripsi / Nama Produk *</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Contoh: Gearbox Assembly" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.slate, marginBottom: 6 }}>Satuan *</label>
                  <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }}>
                    <option value="pcs">Pcs</option>
                    <option value="unit">Unit</option>
                    <option value="set">Set</option>
                    <option value="kg">Kg</option>
                    <option value="meter">Meter</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: S.slate, marginBottom: 6 }}>Catatan Spesifikasi (Opsional)</label>
                  <input value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Contoh: Baja ST37, Aluminium A356" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px" }} />
                </div>
              </div>
              
              <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16, marginTop: 4 }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: S.slate, marginBottom: 8 }}>Daftar Material (BOM)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bomItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: "#F8FAFC", padding: 8, borderRadius: 8, border: `1px solid ${S.border}` }}>
                      <div style={{ flex: 1 }}>
                        <select
                          value={item.inventoryItemId}
                          onChange={e => {
                            const newItems = [...bomItems];
                            newItems[idx].inventoryItemId = e.target.value;
                            setBomItems(newItems);
                          }}
                          style={{ width: "100%", padding: "8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px" }}
                        >
                          <option value="">-- Pilih Material --</option>
                          {inventoryItems.map((inv: any) => (
                            <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: 70 }}>
                        <input 
                          type="number" min="0" step="any" placeholder="Qty"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...bomItems];
                            newItems[idx].quantity = e.target.value;
                            setBomItems(newItems);
                          }}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", textAlign: "center" }}
                        />
                      </div>
                      <button onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))} style={{ padding: "8px", background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 4, cursor: "pointer", flexShrink: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setBomItems([...bomItems, { inventoryItemId: '', quantity: '1' }])} style={{ padding: "8px", background: "transparent", border: `1px dashed ${S.primary}`, color: S.primary, borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Plus size={14} /> Tambah Material (BOM)
                  </button>
                </div>
              </div>

            </div>
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${S.border}`, background: "#F8FAFC", borderRadius: "0 0 12px 12px", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              <button onClick={closeModal} style={{ padding: "10px 16px", border: `1px solid ${S.border}`, background: "#fff", borderRadius: 6, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", color: S.secondary }}>Batal</button>
              <button onClick={handleSaveProduct} disabled={isSaving || !newDesc} style={{ padding: "10px 16px", border: "none", background: !newDesc ? S.secondary : S.primary, color: "#fff", borderRadius: 6, fontSize: "13.5px", fontWeight: 600, cursor: !newDesc ? "not-allowed" : "pointer" }}>
                {isSaving ? "Menyimpan..." : (isEditingId ? "Simpan Perubahan" : "Simpan Produk")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
