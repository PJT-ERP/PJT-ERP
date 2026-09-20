import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { PurchasingUrgency, SalesOrder } from "../../data/mockData";
import { productionApi } from "../../../services/productionApi";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { S, SystemMessage, getBackendSalesOrderId, getMaterialOptions } from "../ProductionHelpers";
import { MaterialAutocomplete } from "./MaterialAutocomplete";

export function MaterialRequestModal({
  so,
  onClose,
  onSubmitted,
  onMessage,
}: {
  so: SalesOrder;
  onClose: () => void;
  onSubmitted: () => void;
  onMessage: (message: SystemMessage) => void;
}) {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const materialOptions = getMaterialOptions(so);
  const firstMaterial = materialOptions[0];
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    masterDataApi.listInventory().then(setInventoryItems).catch(console.error);
  }, []);
  const [items, setItems] = useState([
    {
      materialKey: firstMaterial?.key || "",
      itemName: firstMaterial?.itemName || "",
      specification: firstMaterial?.specification || "",
      quantity: "1",
      unit: "PCS",
      urgency: "Urgent" as PurchasingUrgency,
      purchaseCategory: "Project",
    },
  ]);

  const updateItem = (index: number, key: keyof typeof items[number], value: string) => {
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      materialKey: "",
      itemName: "",
      specification: "",
      quantity: "1",
      unit: "PCS",
      urgency: "Normal",
      purchaseCategory: "Project",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  // eslint-disable-next-line unused-imports/no-unused-vars
  const selectMaterial = (index: number, materialKey: string) => {
    const selected = materialOptions.find(option => option.key === materialKey);
    setItems(prev => prev.map((item, itemIndex) => itemIndex === index
      ? {
          ...item,
          materialKey,
          itemName: selected?.itemName || "",
          specification: selected?.specification || "",
        }
      : item));
  };

  const parsedItems = items.map(item => ({
    itemName: item.itemName.trim(),
    specification: item.specification.trim(),
    quantity: Number.parseInt(item.quantity, 10),
    unit: item.unit.trim() || "PCS",
    urgency: item.urgency,
    purchaseCategory: item.purchaseCategory,
  }));

  const canSubmit = parsedItems.every(item => item.itemName && Number.isFinite(item.quantity) && item.quantity > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isSubmitting) return;

    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const requesterId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId)) {
      onMessage({
        tone: "error",
        title: "MR Tidak Bisa Diajukan",
        message: "Data backend Sales Order belum lengkap. Refresh data atau pastikan SO sudah tersinkron ke backend.",
      });
      return;
    }

    if (!requesterId) {
      onMessage({
        tone: "error",
        title: "Operator Tidak Ditemukan",
        message: "ID operator tidak ditemukan. Silakan login ulang dengan akun Engineering yang ditugaskan.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Auto confirm the Sales Order silently before making the MR API call
      try {
        const { salesApi } = await import("../../../services/salesApi");
        await salesApi.confirmSalesOrder(salesOrderId, requesterId);
      } catch (e) {
        console.warn("Auto-confirm SO silently failed or already confirmed", e);
      }

      await productionApi.submitMaterialRequest(salesOrderId, {
        requestedByUserId: requesterId,
        requesterName: currentUser?.name || so.assignedName || "Engineering",
        notes: notes || null,
        items: parsedItems.map(item => ({
          materialRequirementId: null,
          salesOrderItemId: null,
          itemName: item.itemName,
          size: item.specification || null,
          qty: item.quantity,
          urgency: item.urgency,
          suggestedSupplier: null,
          notes: notes || null,
          purchaseCategory: item.purchaseCategory,
        })),
      });
      const isSpvUser = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner' || currentUser?.username === 'eng_spv';
      if (isSpvUser) {
        try {
          const { purchasingApi } = await import("../../../services/purchasingApi");
          const reqs = await purchasingApi.listPurchaseRequests({ salesOrderId });
          for (const req of reqs || []) {
            if (req.status === 'Submitted' || req.status === 'Pending') {
              await purchasingApi.supervisorReviewPurchaseRequest(req.id, {
                reviewedByUserId: requesterId,
                decision: 'Accept',
              });
            }
          }
        } catch (e) {
          console.warn("Auto review MR by SPV failed", e);
        }
      }
      onSubmitted();
      await queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchasingData'] });
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
      }, 1500);
      onMessage({
        tone: "success",
        title: isSpvUser ? "MR Dikirim ke Purchasing" : "MR Diajukan ke Supervisor",
        message: isSpvUser 
          ? `Material Request untuk ${so.id} berhasil disimpan dan langsung masuk ke antrian Purchasing.`
          : `Material Request untuk ${so.id} sudah dibuat dan menunggu approval Engineering Supervisor.`,
      });
      onClose();
    } catch (error: unknown) {
      console.warn("Failed to submit production material request to backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      onMessage({
        tone: "error",
        title: "Gagal Mengajukan MR",
        message: backendMsg || "MR gagal dikirim ke backend. Cek koneksi API atau data operator.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, fontFamily: S.font, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Permintaan Material</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Isi daftar item untuk MR. Pengajuan ini memerlukan approval Supervisor sebelum diteruskan ke Purchasing.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item, index) => (
              <div key={index} style={{ position: "relative", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 600 }}>Item #{index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} style={{ border: "none", background: "transparent", color: S.secondary, cursor: "pointer", display: "flex" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <MaterialAutocomplete
                  value={item.itemName}
                  onChange={(val) => updateItem(index, "itemName", val)}
                  onSelectProduct={(p) => {
                    updateItem(index, "materialKey", p.id);
                    updateItem(index, "itemName", p.name);
                    updateItem(index, "unit", p.unit);
                    if (p.category) updateItem(index, "purchaseCategory", p.category);
                  }}
                  options={inventoryItems}
                  disabled={false}
                />
                <textarea
                  value={item.specification}
                  onChange={e => updateItem(index, "specification", e.target.value)}
                  placeholder="Spesifikasi / ukuran"
                  rows={2}
                  style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", resize: "none" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, "quantity", e.target.value)}
                    placeholder="Qty"
                    required
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <input
                    value={item.unit}
                    onChange={e => updateItem(index, "unit", e.target.value)}
                    placeholder="Unit"
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none" }}
                  />
                  <select
                    value={item.urgency}
                    onChange={e => updateItem(index, "urgency", e.target.value)}
                    style={{ width: "100%", padding: "9px 10px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", background: S.white }}
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ padding: "10px", border: `1px dashed ${S.border}`, background: S.white, color: S.secondary, borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Tambah Item
            </button>
          </div>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Catatan MR"
            rows={2}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!canSubmit || isSubmitting} style={{ flex: 1, padding: "10px", background: "#EAB308", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Mengajukan..." : "Ajukan MR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
