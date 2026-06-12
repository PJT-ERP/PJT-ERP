import os

path = 'src/app/pages/ProductionPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = 'function MaterialRequestModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {'
end_str = 'function StartProductionModal'

if start_str in content and end_str in content:
    idx1 = content.find(start_str)
    idx2 = content.find(end_str)
    
    old_code = content[idx1:idx2]
    
    new_code = '''function MaterialRequestModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, addPurchasingRequest } = useApp();
  const [formData, setFormData] = useState({
    itemName: "", specification: "", quantity: 1, unit: "PCS", urgency: "Normal" as any, notes: ""
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || formData.quantity <= 0) return;
    
    addPurchasingRequest({
      soId: so.id,
      itemName: formData.itemName,
      specification: formData.specification,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      urgency: formData.urgency,
      notes: formData.notes,
      status: 'Menunggu SPV'
    });

    updateSalesOrder(so.id, { materialRequestStatus: 'requested', materialShortageDetected: true });
    alert("Permintaan material berhasil diajukan dan masuk ke req pembelian.");
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Permintaan Material</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} &mdash; {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Nama Material <span style={{ color: "red" }}>*</span></label>
              <input required name="itemName" value={formData.itemName} onChange={handleChange} placeholder="Contoh: Plat Besi" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px" }} />
            </div>
            <div style={{ flex: 3 }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Spesifikasi</label>
              <input name="specification" value={formData.specification} onChange={handleChange} placeholder="Contoh: SS304 Tebal 5mm" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px" }} />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Jumlah <span style={{ color: "red" }}>*</span></label>
              <input required type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Satuan</label>
              <input name="unit" value={formData.unit} onChange={handleChange} placeholder="PCS / LBR" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", textTransform: "uppercase" }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Urgensi</label>
              <select name="urgency" value={formData.urgency} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px" }}>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan (Opsional)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} placeholder="Keterangan tambahan..." style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px" }} />
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!formData.itemName} style={{ flex: 1, padding: "10px", background: "#C8102E", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: formData.itemName ? 1 : 0.5 }}>
              Ajukan Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
'''
    
    new_full_content = content.replace(old_code, new_code)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_full_content)
    print("Success")
else:
    print("Failed to find boundaries")
