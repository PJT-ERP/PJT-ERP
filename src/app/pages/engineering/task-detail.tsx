import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../components/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomersQuery, useProductsQuery, useSalesOrdersQuery } from "../../services/queries";
import { getStatusColor } from "../../components/data/mockData";
import { salesApi } from "../../services/salesApi";
import { masterDataApi, InventoryItemDto } from "../../services/masterDataApi";
import { toBackendUserId, isGuid } from "../../services/backendIds";
import { BomEditor } from "./task-detail/BomEditor";
import { StepDone, StepRejected, StepRejectForm, StepConfirm, InfoBanner } from "./task-detail/StepScreens";
import { FooterActions } from "./task-detail/FooterActions";

const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className="w-[5px] h-[5px] rounded-full shrink-0 bg-current" />
      {status}
    </span>
  );
}

const defaultCategory = 'Project';

export function EngineeringTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomersQuery();
  const { data: productCatalog = [] } = useProductsQuery();

  const { data: localOrders = [] } = useSalesOrdersQuery();
  
  const qut = useMemo(() => localOrders.find((so: any) => so.id === id || so.backendId === id || so.id.replace(/-/g, '') === id), [localOrders, id]);

  const [designLink, setDesignLink] = useState('');
  const [itemMaterials, setItemMaterials] = useState<Record<string, any[]>>({});
  const [step, setStep] = useState<'upload' | 'confirm' | 'done' | 'reject' | 'rejected'>('upload');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedAsSpv, setCompletedAsSpv] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [localRejectionReason, setLocalRejectionReason] = useState<string | undefined>(undefined);

  const isInitialized = useRef(false);

  useEffect(() => {
    masterDataApi.listInventory().then(setInventoryItems).catch(console.error);
  }, []);

  useEffect(() => {
    if (qut && !isInitialized.current) {
      const designRef = qut.designReference !== 'INTERNAL_DESIGN' ? qut.designReference : '';
      const initialDesignLink = designRef || qut.designLink || qut.customerDrawingUrl || qut.items?.find((it: any) => (it as any).customerDrawingUrl)?.customerDrawingUrl || (qut.designId && !['none', 'customer'].includes(qut.designId) ? qut.designId : '') || '';
      setDesignLink(initialDesignLink);
      setIsEditingLink(!initialDesignLink);

      const boms = qut.bomsPerItem || {};
      const initialMaterials: Record<string, any[]> = {};
      if (Object.keys(boms).length === 0 && qut.materials && qut.materials.length > 0 && qut.items && qut.items.length > 0) {
        initialMaterials[qut.items[0].id] = qut.materials.map((m: any) => {
          let name = m.name || '';
          const code = m.code || (name.match(/^([A-Z]+-\d+)/) || [])[1];
          if (code && name.startsWith(`${code} - `)) name = name.slice(code.length + 3);
          return { ...m, name, code: code || m.code };
        });
      } else {
        qut.items?.forEach((item: any) => {
          initialMaterials[item.id] = (boms[item.id] || []).map((m: any) => {
            let name = m.name || '';
            const code = m.code || (name.match(/^([A-Z]+-\d+)/) || [])[1];
            if (code && name.startsWith(`${code} - `)) name = name.slice(code.length + 3);
            return { ...m, name, code: code || m.code };
          });
        });
      }
      setItemMaterials(initialMaterials);
      setLocalRejectionReason(qut.rejectionReason);
      isInitialized.current = true;
    } else if (qut && isInitialized.current) {
      setLocalRejectionReason(qut.rejectionReason);
    }
  }, [qut]);

  const newMaterials = useMemo(() => {
    const result: { name: string; spec: string }[] = [];
    if (!qut) return result;
    const seen = new Set<string>();
    const inventoryItemsById = new Map(inventoryItems.map(ci => [ci.id.toLowerCase(), ci]));
    for (const item of qut.items || []) {
      const mats = itemMaterials[item.id] || [];
      for (const m of mats) {
        if (!m.name?.trim() || m.isCustomerMaterial) continue;
        const key = `${m.name.trim().toLowerCase()}|${(m.spec || '').trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        const mid = (m.inventoryItemId || '').toLowerCase();
        const matchedById = mid ? inventoryItemsById.get(mid) : null;
        const matchedByName = !matchedById ? inventoryItems.find(ci => ci.name.trim().toLowerCase() === m.name.trim().toLowerCase()) : null;
        const matched = matchedById || matchedByName;
        const isNew = !matched || (!!mid && matched.id.toLowerCase() !== mid);
        if (isNew) { seen.add(key); result.push({ name: m.name.trim(), spec: (m.spec || '').trim() }); }
      }
    }
    return result;
  }, [qut, itemMaterials, inventoryItems]);

  const hasDuplicateMaterials = qut?.items?.some((item: any) => {
    const mats = itemMaterials[item.id] || [];
    return mats.some((m, idx) => {
      if (!m.name.trim()) return false;
      return mats.findIndex(x => {
        const isSameItem = (x.inventoryItemId && m.inventoryItemId) ? x.inventoryItemId === m.inventoryItemId : x.name.trim().toLowerCase() === m.name.trim().toLowerCase();
        const isSameSpec = (x.spec || '').trim().toLowerCase() === (m.spec || '').trim().toLowerCase();
        return isSameItem && isSameSpec;
      }) !== idx;
    });
  }) || false;

  const hasCategoryConflict = qut?.items?.some((item: any) => {
    const mats = itemMaterials[item.id] || [];
    return mats.some(m => {
      if (!m.name.trim()) return false;
      return mats.some(x => {
        if (x.id === m.id) return false;
        const isSameItem = (x.inventoryItemId && m.inventoryItemId) ? x.inventoryItemId === m.inventoryItemId : x.name.trim().toLowerCase() === m.name.trim().toLowerCase() && x.name.trim() !== '';
        return isSameItem && x.category !== m.category;
      });
    });
  }) || false;

  const prevDuplicate = useRef(false);
  const prevCategoryConflict = useRef(false);
  const isEditable = qut && (qut.status === 'Pending Design' || qut.status === 'Revision Required' || (qut.status === 'Waiting Pricing' && (currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv'))));

  useEffect(() => {
    if (isEditable) {
      if (hasDuplicateMaterials && !prevDuplicate.current) {
        toast.warning("Terdapat material duplikat dengan spesifikasi yang sama persis di dalam daftar BOM. Mohon periksa kembali.", { duration: Infinity, closeButton: true });
      }
      if (hasCategoryConflict && !prevCategoryConflict.current) {
        toast.warning("Material yang sama tidak boleh memiliki kategori yang berbeda di dalam satu BOM. Mohon samakan kategorinya.", { duration: Infinity, closeButton: true });
      }
    }
    prevDuplicate.current = hasDuplicateMaterials;
    prevCategoryConflict.current = hasCategoryConflict;
  }, [hasDuplicateMaterials, hasCategoryConflict, isEditable]);

  if (!qut) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: S.font }}>
        <h2>Tugas Tidak Ditemukan</h2>
        <p>Sales Order dengan ID {id} tidak ditemukan.</p>
        <button onClick={() => navigate('/erp/engineer-tasks')} style={{ padding: "10px 20px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Kembali ke Daftar</button>
      </div>
    );
  }

  const customer = customers.find(c => c.code === qut.customerId);
  const isSpv = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || (currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv');
  const isPendingSpv = qut.status === 'Waiting Spv Approval' || qut.backendDesignStatus === 'WaitingApproval';

  let canProcess = isSpv && (qut.status === 'Pending Design' || qut.status === 'Revision Required' || qut.status === 'Waiting Spv Approval');
  if (['Waiting Pricing', 'Waiting Finance Approval', 'Waiting Payment', 'Waiting Client Approval', 'In Production', 'Ready for Production', 'QC', 'Completed', 'Closed'].includes(qut.status) || qut.backendDesignStatus === 'Approved' || qut.designApprovedAt) {
    canProcess = false;
  }
  if (!isSpv) canProcess = false;

  const isDoingSpvApproval = isSpv && isPendingSpv;
  const isWaitingCustomerDesign = qut.designId === 'customer' && !qut.customerDrawingUrl;

  const addMaterial = (itemId: string, initial?: Partial<{ name: string; quantity: number; unit: string; spec: string; inventoryItemId: string; code: string }>) => {
    setItemMaterials(prev => ({ ...prev, [itemId]: [...(prev[itemId] || []), { id: Date.now().toString(), name: initial?.name || '', quantity: initial?.quantity || 0, unit: initial?.unit || '', spec: initial?.spec || '', inventoryItemId: initial?.inventoryItemId || '', code: initial?.code, category: defaultCategory }] }));
  };
  const removeMaterial = (itemId: string, mId: string) => {
    setItemMaterials(prev => ({ ...prev, [itemId]: (prev[itemId] || []).filter(m => m.id !== mId) }));
  };
  const updateMaterial = (itemId: string, mId: string, field: string, value: any) => {
    setItemMaterials(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).map(m => {
        if (m.id !== mId) return m;
        if (field === 'name' && m.name !== value && m.inventoryItemId) return { ...m, name: value, inventoryItemId: '' };
        return { ...m, [field]: value };
      })
    }));
  };

  const handleForward = async () => {
    console.log(">>> handleForward CALLED. canProcess:", canProcess, "isDoingSpvApproval:", isDoingSpvApproval);
    if (!canProcess) return;
    setIsSubmitting(true);
    try {
      const backendId = qut.backendId || qut.id;
      console.log(">>> backendId:", backendId, "isGuid:", isGuid(backendId));
      if (!isGuid(backendId)) { alert("Gagal: Dokumen ini belum tersinkronisasi dengan server."); setIsSubmitting(false); return; }

      if (designLink && designLink.trim() !== '') {
        try { await salesApi.submitSalesOrderDesign(backendId, { designReference: designLink, drawingFileUrl: designLink, updatedByName: currentUser?.name || 'Engineering' }); } catch (e) { console.warn("Failed to update design link", e); }
      }

      let currentInv: any[] = [];
      try { currentInv = await masterDataApi.listInventory(); } catch (e) { console.error("Failed to load inventory for submission", e); }
      const updatedItems: any[] = [];
      const allResolvedBoms: Record<string, any[]> = {};
      for (const it of qut.items || []) {
        const mats = itemMaterials[it.id] || [];
        const newMats = [];
        for (const originalM of mats) {
          if (!originalM.name?.trim() || !(originalM.quantity > 0)) continue;
          const m = { ...originalM };
          if (m.isCustomerMaterial) {
            m.inventoryItemId = '';
          } else {
            let invId = m.inventoryItemId;
            if (!invId) {
              const existingItem = currentInv.find(ci => ci.name.trim().toLowerCase() === m.name.trim().toLowerCase());
              if (existingItem) { invId = existingItem.id; m.code = existingItem.code; }
              else {
                try {
                  const created = await masterDataApi.createInventoryItem({ code: "", name: m.name.trim(), category: m.category || 'Engineering', unit: m.unit || 'pcs', currentStock: 0, minStock: 0, maxStock: 0, reorderPoint: 0, location: '', supplierName: '', unitPrice: 0 });
                  invId = created.id; m.code = created.code; currentInv.push(created);
                } catch (err) { console.warn(`Failed to create "${m.name}"`, err); continue; }
              }
            }
            m.inventoryItemId = invId;
          }
          if (!m.code && m.inventoryItemId) { const inv = currentInv.find(ci => ci.id === m.inventoryItemId); if (inv?.code) m.code = inv.code; }
          newMats.push(m);
        }
        updatedItems.push({ salesOrderItemId: it.id, productId: it.productId, qty: it.quantity, unitPrice: (it as any).unitPrice || 0, notes: (newMats && newMats.length > 0) ? JSON.stringify(newMats) : (it.notes || "") });
        allResolvedBoms[it.id] = newMats.filter(m => m.inventoryItemId && m.quantity > 0).map(m => ({ inventoryItemId: m.inventoryItemId, quantity: m.quantity }));
      }
      if (updatedItems.length > 0) {
        try { await salesApi.updateSalesOrderItems(backendId, { items: updatedItems }); } catch (e) { console.warn("Failed to update BOM", e); }
      }

      const bypassSpv = isSpv && (qut.status === 'Pending Design' || qut.status === 'Revision Required');

      if (isDoingSpvApproval || bypassSpv) {
        await salesApi.updateSalesOrderDesignStatus(backendId, { designStatus: 'Approved', notes: bypassSpv ? 'Auto-approved by SPV submitting design' : 'Approved by SPV', reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()), reviewerName: currentUser?.name || '', designReference: designLink });
        setCompletedAsSpv(true);
        await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      } else {
        setStep('done');
      }

      for (const item of qut.items || []) {
        const productInCatalog = productCatalog.find(p => p.id === item.productId);
        if (!productInCatalog?.bomItems?.length) {
          const resolvedBomItems = allResolvedBoms[item.id] || [];
          if (resolvedBomItems.length > 0) {
            try { 
              await salesApi.updateProductBom(item.productId, { bomItems: resolvedBomItems }); 
              
              // Cascade mock state to other pending Sales Orders using this product is omitted since backend updates BOMs.
            } catch (err) { console.warn(`Failed to attach BOM to ${item.productId}`, err); }
          }
        }
      }
      setStep('done');
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mengupdate data ke server. Pesan: ${err?.response?.data?.message || err?.message}. URL: ${err?.config?.url || 'unknown'}`);
    } finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      const backendId = qut.backendId || qut.id;
      if (!isGuid(backendId)) { alert("Gagal: Dokumen belum tersinkronisasi."); setIsSubmitting(false); return; }
      await salesApi.updateSalesOrderDesignStatus(backendId, { designStatus: 'RevisionRequired', notes: rejectReason, reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()), reviewerName: currentUser?.name || '' });
      const updatedItems = qut.items?.map((it: any) => { const mats = itemMaterials[it.id]; return { salesOrderItemId: it.id, productId: it.productId, qty: it.quantity, notes: (mats && mats.length > 0) ? JSON.stringify(mats) : "" }; }) || [];
      if (updatedItems.length > 0) { try { await salesApi.updateSalesOrderItems(backendId, { items: updatedItems }); } catch (e) { console.warn("Failed to update BOM", e); } }
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setStep('rejected');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mereject desain. ' + (err?.response?.data?.message || err?.message || 'Pastikan API backend berjalan.'));
    } finally { setIsSubmitting(false); }
  };

  const isFormIncomplete = !designLink.trim() || Object.values(itemMaterials).flat().some(m => !m.name.trim() || m.quantity <= 0);
  const isSubmitDisabled = isFormIncomplete || isSubmitting || isWaitingCustomerDesign || hasDuplicateMaterials || hasCategoryConflict;

  const backToList = () => navigate('/erp/engineer-tasks');

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: S.font }}>
      <button onClick={backToList}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: S.white, border: `1px solid ${S.border}`, borderRadius: "8px", cursor: "pointer", color: S.slate, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: "8px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s", alignSelf: "flex-start" }}
        onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.borderColor = "#CBD5E1"; }}
        onMouseLeave={e => { e.currentTarget.style.background = S.white; e.currentTarget.style.borderColor = S.border; }}
      >
        <ChevronLeft size={16} /> Kembali ke Daftar Tugas
      </button>

      <div style={{ background: S.white, borderRadius: 12, width: "100%", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ color: S.slate, margin: 0, fontSize: "20px" }}>{qut.id}</h2>
              <StatusBadge status={qut.status} />
            </div>
            <p style={{ color: S.secondary, margin: "6px 0 0", fontSize: "14px" }}>
              {qut.productName ? <span style={{ fontWeight: 600, color: S.slate }}>{qut.productName}</span> : ''} {qut.productName ? "—" : ""} {qut.description}
            </p>
          </div>
        </div>

        <div style={{ padding: "24px", flex: 1 }}>
          {step === 'done' && <StepDone completedAsSpv={completedAsSpv} onBack={backToList} />}
          {step === 'rejected' && <StepRejected onBack={backToList} />}
          {step === 'reject' && <StepRejectForm rejectReason={rejectReason} onReasonChange={setRejectReason} />}
          {step === 'confirm' && (
            <StepConfirm designLink={designLink} customerName={customer?.name || ''} qty={qut.quantity} unit={qut.unit} newMaterials={newMaterials} />
          )}
          {(step === 'upload') && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <InfoBanner order={qut} customer={customer} />

              <div style={{ background: "#FFFFFF", border: `1px solid ${S.border}`, borderRadius: 8, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <p style={{ fontSize: "15px", color: S.slate, fontWeight: 600, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>Instruksi / Referensi dari Sales</p>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 250px" }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Daftar Item / Produk:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {qut.items?.map((item: any, idx: number) => (
                        <div key={idx} style={{ fontSize: "14px", color: S.slate, display: "flex", justifyContent: "space-between", background: "#F8FAFC", padding: "10px 16px", borderRadius: 6, border: `1px solid ${S.border}` }}>
                          <span>{item.productName || "Custom Product"}</span>
                          <span style={{ fontWeight: 600 }}>{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 250px" }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Catatan Pesanan / Spesifikasi:</span>
                    <div style={{ fontSize: "14px", color: S.slate, background: "#F8FAFC", padding: "12px 16px", borderRadius: 6, border: `1px solid ${S.border}`, minHeight: 60, whiteSpace: "pre-wrap" }}>
                      {qut.notes || <span style={{ color: S.secondary, fontStyle: "italic" }}>Tidak ada catatan khusus.</span>}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 250px" }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Link Referensi Desain dari Sales:</span>
                    <div style={{ fontSize: "13.5px", background: "#F8FAFC", padding: "12px 16px", borderRadius: 6, border: `1px solid ${S.border}`, minHeight: 60, display: "flex", alignItems: "center", wordBreak: "break-all" }}>
                      {(qut.customerDrawingUrl || qut.items?.find((it: any) => (it as any).customerDrawingUrl)?.customerDrawingUrl) ? (
                        <a href={qut.customerDrawingUrl || qut.items?.find((it: any) => (it as any).customerDrawingUrl)?.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontWeight: 500, textDecoration: "none" }}>
                          {qut.customerDrawingUrl || qut.items?.find((it: any) => (it as any).customerDrawingUrl)?.customerDrawingUrl}
                        </a>
                      ) : <span style={{ color: S.secondary, fontStyle: "italic" }}>Tidak ada link referensi dari Sales.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {!!localRejectionReason && ['Revision Required', 'Rejected', 'Waiting Pricing', 'Pending Design'].includes(qut.status) && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: "14px", color: "#B91C1C", margin: 0, fontWeight: 700 }}>⚠️ Desain Ditolak / Perlu Revisi</p>
                  <p style={{ fontSize: "13.5px", color: "#991B1B", margin: 0 }}>Catatan Supervisor: {localRejectionReason}</p>
                </div>
              )}

              {canProcess && (isWaitingCustomerDesign ? (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
                  <p style={{ fontSize: "14px", color: "#DC2626", margin: 0, fontWeight: 500 }}>Tidak dapat memproses: Menunggu Link Desain (URL) dari Sales.</p>
                </div>
              ) : (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
                  <p style={{ fontSize: "14px", color: "#1D4ED8", margin: 0, fontWeight: 500 }}>Silakan unggah desain dan masukkan Bill of Materials (BOM) di bawah ini.</p>
                </div>
              ))}

              <div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "14px", color: S.slate, fontWeight: 600 }}>Link Desain / Drawing <span style={{ color: "#EF4444" }}>*</span></label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                    placeholder="https://drive.google.com/..." readOnly={!isEditingLink} disabled={!canProcess || (!isSpv && (isDoingSpvApproval || isWaitingCustomerDesign))}
                    style={{ flex: 1, padding: "14px 16px", border: `1px solid ${isEditingLink ? S.cyan : S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", boxSizing: "border-box", backgroundColor: (!isEditingLink || !canProcess || (!isSpv && (isDoingSpvApproval || isWaitingCustomerDesign))) ? "#F8FAFC" : "#fff", color: !isEditingLink ? S.secondary : S.slate, cursor: !isEditingLink ? "default" : "text", transition: "all 0.2s" }} />
                  {designLink && !isEditingLink && (
                    <a href={designLink} target="_blank" rel="noreferrer" style={{ padding: "0 16px", background: S.cyan, color: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap" }}>Buka Link</a>
                  )}
                  {canProcess && (
                    <button type="button" onClick={() => setIsEditingLink(!isEditingLink)}
                      style={{ padding: "0 16px", background: isEditingLink ? "#F8FAFC" : "#fff", color: isEditingLink ? S.slate : S.cyan, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                      {isEditingLink ? "Selesai Edit" : "Edit Link"}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 16, marginTop: 24 }}>
                  <label style={{ fontSize: "14px", color: S.slate, fontWeight: 600 }}>Bill of Materials (BOM) <span style={{ color: "#EF4444" }}>*</span></label>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {qut.items?.map((item: any) => {
                    const mats = itemMaterials[item.id] || [];
                    const productInCatalog = productCatalog.find(p => p.id === item.productId);
                    const isStandardProduct = !!productInCatalog?.bomItems?.length;
                    const canEdit = canProcess && (isSpv || (!isDoingSpvApproval && !isWaitingCustomerDesign));

                    return (
                      <BomEditor
                        key={item.id}
                        itemId={item.id}
                        itemName={item.productName || item.partNumber || "Custom Product"}
                        itemQty={item.quantity}
                        itemUnit={item.unit}
                        materials={mats}
                        standardBomItems={productInCatalog?.bomItems || []}
                        isStandardProduct={isStandardProduct}
                        canEdit={canEdit}
                        inventoryItems={inventoryItems}
                        onAddMaterial={addMaterial}
                        onRemoveMaterial={removeMaterial}
                        onUpdateMaterial={updateMaterial}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {step !== 'done' && step !== 'rejected' && (
          <FooterActions
            step={step}
            canProcess={canProcess}
            isDoingSpvApproval={isDoingSpvApproval}
            isSubmitDisabled={isSubmitDisabled}
            rejectReason={rejectReason}
            isSubmitting={isSubmitting}
            hasDuplicateMaterials={hasDuplicateMaterials}
            hasCategoryConflict={hasCategoryConflict}
            onBack={() => setStep('upload')}
            onReject={handleReject}
            onForward={step === 'confirm' ? handleForward : () => setStep('confirm')}
            onGoReject={() => setStep('reject')}
          />
        )}
      </div>
    </div>
  );
}
