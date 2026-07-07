import { useState, useEffect } from "react";
import { CheckCircle, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../../components/context/AppContext";
import { PurchasingRequest, PurchasingItem, PurchasingUrgency } from "../../../components/data/mockData";
import { purchasingApi } from "../../../services/purchasingApi";
import { toBackendUserId } from "../../../services/backendIds";
import { S } from "./constants";
import { SOCombobox } from "./SOCombobox";
import { PCMaterialAutocomplete } from "./PCMaterialAutocomplete";

export interface ItemDraft {
  itemId?: string;
  materialRequirementId?: string | null;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  purchaseCategory?: string | null;
  itemName: string;
  specification: string;
  quantity: string;
  unit: string;
}

export function PurchasingFormModal({ onClose, editRequest, onSuccess }: { onClose: () => void; editRequest?: PurchasingRequest | null, onSuccess?: (items?: PurchasingItem[]) => void }) {
  const { salesOrders, currentUser, refreshBackendData } = useApp();
  const [soId, setSoId] = useState(editRequest?.soId || '');
  const [urgency, setUrgency] = useState<PurchasingUrgency>(editRequest?.urgency || 'Normal');
  const [notes, setNotes] = useState(editRequest?.notes || '');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    import('../../../services/masterDataApi').then(({ masterDataApi }) => {
      masterDataApi.listInventory().then(invs => {
        setInventoryItems(invs);
        if (editRequest) {
          setItems(prev => prev.map(item => {
            const master = invs.find(i => i.name === item.itemName || i.id === item.itemId);
            if (master && master.unit && master.unit.toUpperCase() !== item.unit.toUpperCase()) {
              return { ...item, unit: master.unit };
            }
            return item;
          }));
        }
      }).catch(console.error);
    });
  }, [editRequest]);

  const [items, setItems] = useState<ItemDraft[]>(() => {
    const sourceItems = editRequest?.items && editRequest.items.length > 0
      ? editRequest.items
      : editRequest
        ? [{ itemName: editRequest.itemName, specification: editRequest.specification, quantity: editRequest.quantity, unit: editRequest.unit }]
        : [];

    return sourceItems.length > 0
      ? sourceItems.map(item => ({
          itemId: item.itemId,
          materialRequirementId: item.materialRequirementId,
          salesOrderId: item.salesOrderId,
          salesOrderNumber: item.salesOrderNumber,
          projectName: item.projectName,
          purchaseCategory: item.purchaseCategory,
          itemName: item.itemName,
          specification: item.specification,
          quantity: String(item.quantity || ''),
          unit: item.unit || 'PCS',
        }))
      : [{ itemName: '', specification: '', quantity: '', unit: 'PCS' }];
  });
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateItem = (idx: number, field: keyof ItemDraft, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { itemName: '', specification: '', quantity: '', unit: 'PCS' }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const validItems = items.filter(it => it.itemName.trim());
  const hasDuplicates = new Set(validItems.map(it => it.itemName.trim().toLowerCase())).size !== validItems.length;
  const canSubmit = items.every(it => it.itemName.trim() && it.purchaseCategory && it.quantity && parseInt(it.quantity) > 0) && !hasDuplicates;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    const parsedItems: PurchasingItem[] = items.map(it => ({
      itemId: it.itemId,
      materialRequirementId: it.materialRequirementId,
      salesOrderId: it.salesOrderId,
      salesOrderNumber: it.salesOrderNumber,
      projectName: it.projectName,
      purchaseCategory: it.purchaseCategory,
      itemName: it.itemName.trim(),
      specification: it.specification.trim(),
      quantity: parseInt(it.quantity),
      unit: it.unit,
    }));
    const selectedSo = salesOrders.find(order => order.id === soId || order.soNumber === soId);
    const requesterId = toBackendUserId(currentUser);

    if (!requesterId) {
      alert("User lokal belum punya mapping backend untuk membuat pengajuan.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        requestDate: new Date().toISOString().split("T")[0],
        requestedByUserId: editRequest?.requestedByUserId || requesterId,
        requesterName: editRequest?.requestedBy || currentUser?.name || "Engineering",
        salesOrderId: selectedSo?.backendId || null,
        salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || null,
        projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : "General Engineering Request",
        items: parsedItems.map(item => ({
          id: item.itemId,
          materialRequirementId: item.materialRequirementId || null,
          salesOrderId: selectedSo?.backendId || item.salesOrderId || null,
          salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || item.salesOrderNumber || null,
          projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : item.projectName || "General Engineering Request",
          itemName: item.itemName,
          size: item.specification || null,
          qty: item.quantity,
          notes: notes || null,
          urgency,
          purchaseCategory: selectedSo ? "Project" : item.purchaseCategory || "Consumable",
        })),
        requireSupervisorApproval: true,
      };

      if (editRequest?.backendId) {
        await purchasingApi.updatePurchaseRequest(editRequest.backendId, payload);
        await refreshBackendData();
        onSuccess?.(parsedItems);
        onClose();
        return;
      } else {
        await purchasingApi.createPurchaseRequest(payload);
        await refreshBackendData();
        setDone(true);
      }
    } catch (error: any) {
      console.warn("Failed to submit backend purchase request.", error);
      const message = error?.response?.data?.message
        || error?.response?.data?.title
        || error?.message
        || "Cek response API untuk detail.";
      alert(`Gagal ${editRequest ? "memperbarui" : "membuat"} pengajuan di backend: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} style={{ color: "#22C55E" }} />
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>{editRequest ? "Pengajuan Berhasil Diperbarui" : "Pengajuan Berhasil Dikirim"}</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {items.length > 1 ? `${items.length} item` : 'Permintaan'} berhasil disimpan dan akan diproses ke tahap selanjutnya.
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  const soOptions = salesOrders
    .filter(s => ['Ready for Production', 'In Production', 'Pending Design', 'Revision Required', 'Waiting Approval'].includes(s.status))
    .map(s => ({ id: s.id, label: `${s.id} — ${s.description.slice(0, 40)}` }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{editRequest ? `Edit ${editRequest.id}` : "Pengajuan Purchasing Baru"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Referensi SO (Opsional)</label>
                <SOCombobox value={soId} onChange={setSoId} options={soOptions} disabled={currentUser?.role === 'Engineering Supervisor'} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Urgensi</label>
                <select value={urgency} onChange={e => setUrgency(e.target.value as PurchasingUrgency)}
                  disabled={currentUser?.role === 'Engineering Supervisor'}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: currentUser?.role === 'Engineering Supervisor' ? "#F8FAFC" : S.white, cursor: currentUser?.role === 'Engineering Supervisor' ? "not-allowed" : "pointer", appearance: currentUser?.role === 'Engineering Supervisor' ? "none" : "auto", WebkitAppearance: currentUser?.role === 'Engineering Supervisor' ? "none" : "auto" } as any}>
                  <option>Normal</option><option>Urgent</option><option>Critical</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan Tambahan</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Supplier preferensi, dll."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <label style={{ fontSize: "13.5px", color: S.slate, fontWeight: 600 }}>
                  Daftar Item / Material <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <span style={{ fontSize: "12px", color: S.secondary }}>{items.length} item</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ background: S.bg, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12.5px", color: S.secondary, fontWeight: 500 }}>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, padding: 4, display: "flex" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <PCMaterialAutocomplete
                      value={item.itemName}
                      onChange={(val) => updateItem(idx, 'itemName', val)}
                      onSelectProduct={(p) => {
                        const isDuplicate = items.some((it, i) => i !== idx && (it.itemId === p.id || it.itemName.trim().toLowerCase() === p.name.trim().toLowerCase()));
                        if (isDuplicate) {
                          toast.warning(`Material "${p.name}" sudah ada di dalam daftar. Mohon periksa kembali agar tidak terjadi duplikasi.`, {
                            position: "top-center",
                            duration: 4000,
                          });
                          return;
                        }
                        updateItem(idx, 'itemId', p.id);
                        updateItem(idx, 'itemName', p.name);
                        updateItem(idx, 'unit', p.unit);
                        if (p.category) updateItem(idx, 'purchaseCategory', p.category);
                      }}
                      options={inventoryItems}
                      disabled={false}
                    />

                    <textarea
                      value={item.specification}
                      onChange={e => updateItem(idx, 'specification', e.target.value)}
                      rows={2}
                      placeholder="Spesifikasi: grade, dimensi, standar, dll."
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white, resize: "none" }}
                    />

                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        value={item.purchaseCategory || ""}
                        onChange={e => updateItem(idx, 'purchaseCategory', e.target.value)}
                        required
                        style={{ flex: 1, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}
                      >
                        <option value="" disabled>Kategori *</option>
                        {["Asset", "Consumable", "Tools", "Project", "Maintenance"].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty *"
                        style={{ width: 100, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}
                      />
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        style={{ width: 80, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: "#F8FAFC", color: S.secondary, cursor: "not-allowed", textAlign: "center" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                style={{
                  marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent",
                  color: S.secondary, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font
                }}
              >
                <Plus size={14} /> Tambah Item
              </button>
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, color: S.slate, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font }}>
              Batal
            </button>
            <button type="submit" disabled={!canSubmit || isSubmitting} style={{ padding: "10px 24px", background: "#EAB308", border: "none", borderRadius: 8, color: "#fff", fontSize: "13.5px", fontWeight: 600, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", fontFamily: S.font, opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Menyimpan..." : (editRequest ? "Simpan Perubahan" : "Ajukan ke Supervisor")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
