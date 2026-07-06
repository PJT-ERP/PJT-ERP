import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Send, CheckCircle, ExternalLink, Plus, Trash2, UserPlus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../components/context/AppContext";
import { SalesOrder, getStatusColor } from "../../components/data/mockData";
import { salesApi } from "../../services/salesApi";
import { masterDataApi, InventoryItemDto } from "../../services/masterDataApi";
import { toBackendUserId, isGuid } from "../../services/backendIds";

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

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}

function MaterialAutocomplete({
  value,
  onChange,
  onSelectProduct,
  options,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: any) => void;
  options: any[];
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  const filtered = options.filter(p => 
    (p.code + ' ' + p.name).toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 2, display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => setIsFocused(false)}
        placeholder="Pilih dari Master Data atau ketik manual..."
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 14px", 
          border: `1px solid ${isFocused ? S.cyan : S.border}`, 
          borderRadius: 6, fontSize: "14px", outline: "none", 
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(200, 16, 46, 0.1)` : "none"
        }}
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, zIndex: 50,
          ...(direction === 'down' ? { top: "100%", marginTop: 4 } : { bottom: "100%", marginBottom: 4 }),
          background: "#fff", border: `1px solid ${S.border}`,
          borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 280, overflowY: "auto", overflowX: "hidden"
        }}>
          {filtered.map(p => (
            <div 
              key={p.id}
              onMouseDown={e => {
                e.preventDefault(); // Prevent blur
                onSelectProduct(p);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${S.bg}`,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: S.slate }}>{p.name}</div>
              <div style={{ fontSize: "11.5px", color: S.secondary, marginTop: 4 }}>{p.code} | Stok: {p.currentStock} {p.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EngineeringTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { salesOrders, updateSalesOrder, customers, currentUser, refreshBackendData, productCatalog } = useApp();
  
  const qut = salesOrders.find(so => so.id === id);

  const [designLink, setDesignLink] = useState('');
  const [itemMaterials, setItemMaterials] = useState<Record<string, any[]>>({});
  const [step, setStep] = useState<'upload' | 'confirm' | 'done' | 'reject' | 'rejected'>('upload');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedAsSpv, setCompletedAsSpv] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);

  useEffect(() => {
    masterDataApi.listInventory().then(setInventoryItems).catch(console.error);
  }, []);

  const [localRejectionReason, setLocalRejectionReason] = useState<string | undefined>(undefined);
  const [isEditingLink, setIsEditingLink] = useState(false);

  const isInitialized = React.useRef(false);
  
  useEffect(() => {
    if (qut && !isInitialized.current) {
      const salesInputtedUrl = qut.customerDrawingUrl || qut.designLink || qut.items?.find(it => (it as any).customerDrawingUrl)?.customerDrawingUrl || (qut.designId && !['none', 'customer'].includes(qut.designId) ? qut.designId : '') || '';
      setDesignLink(salesInputtedUrl);
      setIsEditingLink(!salesInputtedUrl);
      
      const boms = qut.bomsPerItem || {};
      const initialMaterials: Record<string, any[]> = {};
      
      if (Object.keys(boms).length === 0 && qut.materials && qut.materials.length > 0 && qut.items && qut.items.length > 0) {
        initialMaterials[qut.items[0].id] = qut.materials; // Fallback for old SOs
      } else {
        qut.items?.forEach(item => {
          initialMaterials[item.id] = boms[item.id] || [];
        });
      }
      
      setItemMaterials(initialMaterials);
      setLocalRejectionReason(qut.rejectionReason);
      isInitialized.current = true;
    } else if (qut && isInitialized.current) {
      setLocalRejectionReason(qut.rejectionReason);
    }
  }, [qut]);

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
  
  const currentUserBackendId = toBackendUserId(currentUser);
  const isAssignedToCurrentUser = 
    qut.designAssignedTo === currentUser?.id || 
    (currentUserBackendId && qut.designAssignedTo === currentUserBackendId) ||
    qut.designAssignedTo === currentUser?.name ||
    qut.designAssignedName === currentUser?.name;
  const isDoingWorkerSubmission = (isAssignedToCurrentUser || isSpv) && (qut.status === 'Pending Design' || qut.status === 'Revision Required' || qut.status === 'Waiting Pricing' || qut.status === 'Waiting Payment');
  const isDoingSpvApproval = isSpv && isPendingSpv;

  let canProcess = isDoingWorkerSubmission || isDoingSpvApproval || isSpv;
  
  // Strictly prevent any processing if it has moved past the engineering phase
  if (['Waiting Pricing', 'Waiting Finance Approval', 'Waiting Payment', 'Waiting Client Approval', 'In Production', 'Ready for Production', 'QC', 'Completed', 'Closed'].includes(qut.status) || qut.backendDesignStatus === 'Approved' || qut.designApprovedAt) {
    canProcess = false;
  }
  if (qut.backendDesignStatus === 'Approved' && !isDoingWorkerSubmission && !isSpv) {
    canProcess = false;
  }

  const isWaitingCustomerDesign = qut.designId === 'customer' && !qut.customerDrawingUrl;

  const addMaterial = (itemId: string) => {
    setItemMaterials(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { id: Date.now().toString(), name: '', quantity: 0, unit: '', spec: '', inventoryItemId: '' }]
    }));
  };
  const removeMaterial = (itemId: string, mId: string) => {
    setItemMaterials(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(m => m.id !== mId)
    }));
  };
  const updateMaterial = (itemId: string, mId: string, field: string, value: any) => {
    setItemMaterials(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).map(m => m.id === mId ? { ...m, [field]: value } : m)
    }));
  };

  const handleForward = async () => {
    if (!canProcess) return;

    try {
      setIsSubmitting(true);
      
      const backendId = qut.backendId || qut.id;
      if (!isGuid(backendId)) {
        alert("Gagal: Dokumen ini belum tersinkronisasi dengan server atau memiliki ID yang tidak valid. Silakan coba refresh halaman.");
        setIsSubmitting(false);
        return;
      }

      // Always save drawing URL and BOM items to backend first!
      if (designLink && designLink.trim() !== '') {
        try {
          await salesApi.submitSalesOrderDesign(backendId, {
            designReference: designLink,
            drawingFileUrl: designLink
          });
          await salesApi.updateCustomerDrawing(backendId, {
            customerDrawingUrl: designLink,
            updatedByName: currentUser?.name || 'Engineering'
          });
        } catch (e) {
          console.warn("Failed to update design link on backend", e);
        }
      }

      const updatedItems = qut.items?.map(it => {
        const mats = itemMaterials[it.id];
        const hasMats = mats && mats.length > 0;
        return {
          salesOrderItemId: it.id,
          productId: it.productId,
          qty: it.quantity,
          notes: hasMats ? JSON.stringify(mats) : (it.notes || "")
        };
      }) || [];

      if (updatedItems.length > 0) {
        try {
          await salesApi.updateSalesOrderItems(backendId, { items: updatedItems });
        } catch (e) {
          console.warn("Failed to update BOM on backend", e);
        }
      }

      if (isDoingSpvApproval) {
        await salesApi.updateSalesOrderDesignStatus(backendId, {
          designStatus: 'Approved',
          notes: 'Approved by SPV',
          reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
          reviewerName: currentUser?.name || ''
        });
      }

      if (isDoingSpvApproval) {
        setCompletedAsSpv(true);
        await refreshBackendData();
        
        // Save BOM to Master Data for Custom Products after SPV APPROVAL
        for (const item of qut.items || []) {
          const productInCatalog = productCatalog.find(p => p.id === item.productId);
          const isStandardProduct = !!productInCatalog?.bomItems?.length;
          if (!isStandardProduct) {
            const mats = itemMaterials[item.id] || [];
            if (mats.length === 0) continue;

            // Auto-create any manually-typed materials as inventory items first
            const resolvedBomItems: { inventoryItemId: string; quantity: number }[] = [];
            for (const m of mats) {
              if (!m.name?.trim() || !(m.quantity > 0)) continue;
              let invId = m.inventoryItemId;
              if (!invId) {
                try {
                  const created = await masterDataApi.createInventoryItem({
                    code: `MAT-${m.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 16)}`,
                    name: m.name.trim(),
                    category: 'Engineering',
                    unit: m.unit || 'pcs',
                    currentStock: 0,
                    minStock: 0,
                    maxStock: 0,
                    reorderPoint: 0,
                    location: '',
                    supplierName: '',
                    unitPrice: 0,
                  });
                  invId = created.id;
                } catch (err) {
                  console.warn(`Failed to auto-create inventory item for "${m.name}"`, err);
                  continue;
                }
              }
              resolvedBomItems.push({ inventoryItemId: invId, quantity: m.quantity });
            }

            if (resolvedBomItems.length > 0) {
              try {
                await salesApi.updateProductBom(item.productId, { bomItems: resolvedBomItems });
              } catch (err) {
                console.warn(`Failed to attach BOM to custom product ${item.productId}`, err);
              }
            }
          }
        }
        updateSalesOrder(qut.id, {
          designLink,
          designId: designLink,
          customerDrawingUrl: designLink,
          materials: Object.values(itemMaterials).flat(),
          bomsPerItem: itemMaterials,
          status: 'Waiting Pricing',
          backendDesignStatus: 'Approved',
          designApprovedAt: new Date().toISOString().split('T')[0]
        });
      } else if (isDoingWorkerSubmission || isSpv) {
        updateSalesOrder(qut.id, {
          designLink,
          designId: designLink,
          customerDrawingUrl: designLink,
          materials: Object.values(itemMaterials).flat(),
          bomsPerItem: itemMaterials,
          status: 'Waiting Spv Approval',
          backendDesignStatus: 'WaitingApproval',
        });
      }
      setStep('done');
    } catch (err: any) {
      console.error(err);
      const url = err?.config?.url || 'unknown';
      alert(`Gagal mengupdate data ke server. Pesan: ${err?.response?.data?.message || err?.message}. URL: ${url}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setIsSubmitting(true);
      const backendId = qut.backendId || qut.id;
      if (!isGuid(backendId)) {
        alert("Gagal: Dokumen ini belum tersinkronisasi dengan server atau memiliki ID yang tidak valid. Silakan coba refresh halaman.");
        setIsSubmitting(false);
        return;
      }
      
      await salesApi.updateSalesOrderDesignStatus(backendId, {
        designStatus: 'RevisionRequired',
        notes: rejectReason,
        reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
        reviewerName: currentUser?.name || ''
      });

      // Save BOM to backend so it's not lost when rejected
      const updatedItems = qut.items?.map(it => {
          const mats = itemMaterials[it.id];
          const hasMats = mats && mats.length > 0;
          return {
              salesOrderItemId: it.id,
              productId: it.productId,
              qty: it.quantity,
              notes: hasMats ? JSON.stringify(mats) : ""
          };
      }) || [];
      if (updatedItems.length > 0) {
        try {
           await salesApi.updateSalesOrderItems(backendId, { items: updatedItems });
        } catch(e) {
           console.warn("Failed to update BOM on backend", e);
        }
      }

      // Save BOM and rejection reason via standard global state instead of local storage
      updateSalesOrder(qut.id, {
        status: 'Revision Required',
        backendDesignStatus: 'RevisionRequired',
        notes: rejectReason,
        rejectionReason: rejectReason,
        materials: Object.values(itemMaterials).flat(),
        bomsPerItem: itemMaterials,
        designLink
      });
      if (isDoingSpvApproval) {
        await refreshBackendData();
      }
      setStep('rejected');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mereject desain ke server. Pesan: ' + (err?.response?.data?.message || err?.message || 'Pastikan API backend berjalan.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDuplicateMaterials = qut.items?.some(item => {
    const mats = itemMaterials[item.id] || [];
    const productInCatalog = productCatalog.find(p => p.id === item.productId);
    const isStandardProduct = !!productInCatalog?.bomItems?.length;
    const standardBomItems = productInCatalog?.bomItems || [];
    
    // Check duplicates inside mats
    const hasInternalDupe = mats.some((m, idx) => {
      return mats.findIndex(x => {
        if (x.inventoryItemId && m.inventoryItemId) return x.inventoryItemId === m.inventoryItemId;
        return x.name.trim().toLowerCase() === m.name.trim().toLowerCase() && x.name.trim() !== '';
      }) !== idx;
    });
    
    // Check duplicates against standard BOM
    const hasStandardDupe = isStandardProduct && mats.some(m => standardBomItems.some(bom => bom.inventoryItemId === m.inventoryItemId));
    
    return hasInternalDupe || hasStandardDupe;
  }) || false;

  const isFormIncomplete = !designLink.trim() || Object.values(itemMaterials).flat().some(m => !m.name.trim() || m.quantity <= 0);
  const isSubmitDisabled = isFormIncomplete || isSubmitting || isWaitingCustomerDesign || hasDuplicateMaterials;

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: S.font }}>
      <button 
        onClick={() => navigate('/erp/engineer-tasks')} 
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: S.white, border: `1px solid ${S.border}`, borderRadius: "8px", cursor: "pointer", color: S.slate, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: "8px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s", alignSelf: "flex-start" }}
        onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.borderColor = "#CBD5E1"; }}
        onMouseLeave={e => { e.currentTarget.style.background = S.white; e.currentTarget.style.borderColor = S.border; }}
      >
        <ChevronLeft size={16} /> Kembali ke Daftar Tugas
      </button>

      <div style={{ background: S.white, borderRadius: 12, width: "100%", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ color: S.slate, margin: 0, fontSize: "20px" }}>{qut.id}</h2>
              <StatusBadge status={qut.status} />
            </div>
            <p style={{ color: S.secondary, margin: "6px 0 0", fontSize: "14px" }}>
              {qut.productName ? <span style={{fontWeight: 600, color: S.slate}}>{qut.productName}</span> : ''} {qut.productName ? "—" : ""} {qut.description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", flex: 1 }}>
          {step === 'done' ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={32} style={{ color: "#22C55E" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                {completedAsSpv ? 'Desain Disetujui (Diteruskan ke Finance)' : 'Desain Menunggu Approval Supervisor'}
              </h3>
              <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
                {completedAsSpv ? 'Sales Order dilanjutkan ke Finance untuk penentuan harga dan pembuatan Invoice DP.' : 'Status Sales Order menjadi "Waiting Spv Approval"'}
              </p>
              <button onClick={() => navigate('/erp/engineer-tasks')} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Daftar</button>
            </div>
          ) : step === 'rejected' ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 64, height: 64, background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Trash2 size={32} style={{ color: "#EF4444" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                Desain Dikembalikan ke Engineer
              </h3>
              <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
                Status Penawaran kembali menjadi "Pending Design". Engineer harus merevisi dan mengirim ulang desainnya.
              </p>
              <button onClick={() => navigate('/erp/engineer-tasks')} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Daftar</button>
            </div>
          ) : step === 'reject' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 20 }}>
                <p style={{ color: "#991B1B", margin: 0, fontSize: "14px", fontWeight: 500 }}>
                  Apakah Anda yakin ingin menolak desain ini?
                </p>
                <p style={{ color: "#B91C1C", margin: "6px 0 0", fontSize: "13px" }}>
                  Desain akan dikembalikan ke Engineer untuk direvisi.
                </p>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "14px", color: S.slate, fontWeight: 500, marginBottom: 8 }}>
                  Catatan Revisi <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={5} placeholder="Sebutkan apa yang perlu diperbaiki oleh Engineer..."
                  style={{ width: "100%", padding: "16px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>
          ) : step === 'confirm' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 20 }}>
                <p style={{ color: "#92400E", fontSize: "14px", margin: 0 }}>
                  {isDoingSpvApproval ? 'Konfirmasi menyetujui desain dan BOM dari staf? SO akan masuk ke tahap Penentuan Harga oleh Finance.' : 'Konfirmasi meneruskan desain & BOM ke Supervisor untuk di-review?'}
                </p>
              </div>
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 16, fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${S.border}`, paddingBottom: 12 }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customer?.name}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${S.border}`, paddingBottom: 12 }}><span style={{ color: S.secondary }}>Qty</span><span style={{ color: S.slate, fontWeight: 500 }}>{qut.quantity} {qut.unit}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ color: S.secondary }}>Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "13px", fontWeight: 500, textDecoration: "none", wordBreak: "break-all" }}>
                    {designLink}
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, background: S.bg, padding: 20, borderRadius: 8, border: `1px solid ${S.border}` }}>
                <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Customer</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{customer?.name || "-"}</p></div>
                <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Qty Total</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{qut.quantity} {qut.unit}</p></div>
                <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Deadline</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{qut.deadline}</p></div>
                <div><p style={{ fontSize: "13px", color: S.secondary, margin: 0 }}>Input SO</p><p style={{ color: S.slate, margin: "6px 0 0", fontWeight: 600, fontSize: "14px" }}>{qut.createdAt.substring(0, 10)}</p></div>
              </div>
              
              {/* Referensi Sales */}
              <div style={{ background: "#FFFFFF", border: `1px solid ${S.border}`, borderRadius: 8, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <p style={{ fontSize: "15px", color: S.slate, fontWeight: 600, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>Instruksi / Referensi dari Sales</p>


                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 250px" }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Daftar Item / Produk:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {qut.items?.map((item, idx) => (
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
                      {qut.notes || <span style={{color: S.secondary, fontStyle: "italic"}}>Tidak ada catatan khusus.</span>}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 250px" }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Link Referensi Desain dari Sales:</span>
                    <div style={{ fontSize: "13.5px", background: "#F8FAFC", padding: "12px 16px", borderRadius: 6, border: `1px solid ${S.border}`, minHeight: 60, display: "flex", alignItems: "center", wordBreak: "break-all" }}>
                      {(qut.customerDrawingUrl || qut.designLink || qut.items?.find(it => (it as any).customerDrawingUrl)?.customerDrawingUrl) ? (
                        <a href={qut.customerDrawingUrl || qut.designLink || qut.items?.find(it => (it as any).customerDrawingUrl)?.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontWeight: 500, textDecoration: "none" }}>
                          ↗️ {qut.customerDrawingUrl || qut.designLink || qut.items?.find(it => (it as any).customerDrawingUrl)?.customerDrawingUrl}
                        </a>
                      ) : (
                        <span style={{color: S.secondary, fontStyle: "italic"}}>Tidak ada link referensi dari Sales.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Rejection Banner */}
              {!!localRejectionReason && ['Revision Required', 'Rejected', 'Waiting Pricing', 'Pending Design'].includes(qut.status) && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: "14px", color: "#B91C1C", margin: 0, fontWeight: 700 }}>⚠️ Desain Ditolak / Perlu Revisi</p>
                  <p style={{ fontSize: "13.5px", color: "#991B1B", margin: 0 }}>Catatan Supervisor: {localRejectionReason}</p>
                </div>
              )}

              {/* Action Area */}
              {canProcess && (
                isWaitingCustomerDesign ? (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
                    <p style={{ fontSize: "14px", color: "#DC2626", margin: 0, fontWeight: 500 }}>⚠️ Tidak dapat memproses: Menunggu Link Desain (URL) dari Sales.</p>
                  </div>
                ) : (
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
                    <p style={{ fontSize: "14px", color: "#1D4ED8", margin: 0, fontWeight: 500 }}>💡 Silakan unggah dokumen CAD ke cloud dan masukkan Bill of Materials (BOM) di bawah ini.</p>
                  </div>
                )
              )}

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "14px", color: S.slate, fontWeight: 600 }}>Link Desain / Drawing <span style={{ color: "#EF4444" }}>*</span></label>
                  {canProcess && (
                    <button
                      type="button"
                      onClick={() => setIsEditingLink(!isEditingLink)}
                      style={{
                        padding: "6px 12px",
                        background: isEditingLink ? "#F8FAFC" : "#EFF6FF",
                        color: isEditingLink ? S.slate : S.cyan,
                        border: `1px solid ${isEditingLink ? S.border : "#BFDBFE"}`,
                        borderRadius: 6,
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s"
                      }}
                    >
                      {isEditingLink ? "🔒 Selesai Edit / Readonly" : "✏️ Edit Link"}
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    readOnly={!isEditingLink}
                    disabled={!canProcess || (!isSpv && (isDoingSpvApproval || isWaitingCustomerDesign))}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      border: `1px solid ${isEditingLink ? S.cyan : S.border}`,
                      borderRadius: 8,
                      fontSize: "14px",
                      fontFamily: S.font,
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: (!isEditingLink || !canProcess || (!isSpv && (isDoingSpvApproval || isWaitingCustomerDesign))) ? "#F8FAFC" : "#fff",
                      color: !isEditingLink ? S.secondary : S.slate,
                      cursor: !isEditingLink ? "default" : "text",
                      transition: "all 0.2s"
                    }}
                    onFocus={e => { if (isEditingLink) e.currentTarget.style.borderColor = S.cyan; }}
                    onBlur={e => { if (isEditingLink) e.currentTarget.style.borderColor = S.border; }}
                  />
                  {designLink && !isEditingLink && (
                    <a
                      href={designLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "0 16px",
                        background: S.cyan,
                        color: "#fff",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}
                    >
                      ↗️ Buka Link
                    </a>
                  )}
                </div>
                {!isEditingLink && designLink && (
                  <p style={{ fontSize: "12px", color: S.secondary, margin: "6px 0 0", fontStyle: "italic" }}>
                    * Link ini dimunculkan dalam mode abu-abu (readonly) dari Sales/Customer. Klik tombol <strong>"✏️ Edit Link"</strong> di sebelah kanan atas jika ingin mengubahnya.
                  </p>
                )}
              </div>
              
              <div>
                <div style={{ marginBottom: 16, marginTop: 24 }}>
                  <label style={{ fontSize: "14px", color: S.slate, fontWeight: 600 }}>Bill of Materials (BOM) <span style={{ color: "#EF4444" }}>*</span></label>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {qut.items?.map(item => {
                    const mats = itemMaterials[item.id] || [];
                    const productInCatalog = productCatalog.find(p => p.id === item.productId);
                    const isStandardProduct = !!productInCatalog?.bomItems?.length;
                    const standardBomItems = productInCatalog?.bomItems || [];
                    
                    return (
                      <div key={item.id} style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
                          <span style={{ fontSize: "13.5px", color: S.slate, fontWeight: 600 }}>
                            {item.productName || item.partNumber || "Custom Product"} <span style={{ color: S.secondary, fontWeight: 400 }}>({item.quantity} {item.unit})</span>
                          </span>
                          {canProcess && (isSpv || (!isDoingSpvApproval && !isWaitingCustomerDesign)) && (
                            <button onClick={() => addMaterial(item.id)} style={{ padding: "6px 12px", background: "#fff", color: S.cyan, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.color = S.cyan; }} onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.cyan; }}>
                              <Plus size={14} /> {isStandardProduct ? "Tambahan Khusus" : "Tambah Material"}
                            </button>
                          )}
                        </div>
                        
                        <div style={{ padding: 16, background: "#fff" }}>
                          {isStandardProduct && standardBomItems.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: mats.length > 0 ? 16 : 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                BOM Master Data (Otomatis)
                              </div>
                              {standardBomItems.map((bom, idx) => (
                                <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", background: "#F8FAFC", padding: "10px 12px", borderRadius: 6, border: `1px solid ${S.border}` }}>
                                  <div style={{ flex: 1.5, fontSize: "13.5px", color: S.slate, fontWeight: 500 }}>
                                    {bom.inventoryItemName || bom.inventoryItemCode}
                                  </div>
                                  <div style={{ width: 80, fontSize: "13.5px", color: S.slate, textAlign: "right", fontWeight: 600 }}>
                                    {bom.quantity}
                                  </div>
                                  <div style={{ width: 100, fontSize: "13.5px", color: S.secondary, textAlign: "center" }}>
                                    {bom.unit}
                                  </div>
                                  <div style={{ width: 34 }}></div>
                                </div>
                              ))}
                              {mats.length === 0 && (isSpv || !isDoingSpvApproval) && (
                                <div style={{ fontSize: "12.5px", color: S.secondary, marginTop: 8, fontStyle: "italic" }}>
                                  * Tekan "Tambahan Khusus" jika ada material ekstra di luar BOM Master Data ini.
                                </div>
                              )}
                            </div>
                          )}

                          {mats.length === 0 ? (
                            !isStandardProduct && (
                              <div style={{ textAlign: "center", padding: "30px 20px", color: S.secondary, fontSize: "13.5px", background: "#fff", borderRadius: 8 }}>
                                {(isDoingSpvApproval && !isSpv) ? "BOM kosong." : "BOM kosong. Silakan tambahkan material."}
                              </div>
                            )
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: -4, marginTop: isStandardProduct ? 8 : 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {isStandardProduct ? "Material Tambahan (Khusus SO Ini)" : "BOM Custom"}
                              </div>
                              {mats.map(m => (
                                <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "#FFFFFF", padding: 12, borderRadius: 8, border: `1px solid ${S.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                                  <MaterialAutocomplete 
                                    value={m.name} 
                                    onChange={val => updateMaterial(item.id, m.id, 'name', val)}
                                    onSelectProduct={p => {
                                      const isDuplicateInCustom = mats.some(mat => mat.id !== m.id && mat.inventoryItemId === p.id);
                                      const isDuplicateInStandard = isStandardProduct && standardBomItems.some(bom => bom.inventoryItemId === p.id);
                                      
                                      if (isDuplicateInCustom || isDuplicateInStandard) {
                                        toast.warning(`Material "${p.name}" sudah ada di dalam daftar BOM. Mohon periksa kembali agar tidak terjadi duplikasi.`, {
                                          duration: 5000,
                                        });
                                      }
                                      
                                      updateMaterial(item.id, m.id, 'name', p.name);
                                      updateMaterial(item.id, m.id, 'unit', p.unit);
                                      updateMaterial(item.id, m.id, 'inventoryItemId', p.id);
                                    }}
                                    options={inventoryItems}
                                    disabled={!canProcess || (!isSpv && (isWaitingCustomerDesign || isDoingSpvApproval))} 
                                  />
                                  <input placeholder="Spesifikasi / Ukuran..." value={m.spec} onChange={e => updateMaterial(item.id, m.id, 'spec', e.target.value)} disabled={!canProcess || (!isSpv && (isWaitingCustomerDesign || isDoingSpvApproval))} style={{ flex: 1.5, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", minWidth: 0, backgroundColor: (canProcess && (isSpv || (!isWaitingCustomerDesign && !isDoingSpvApproval))) ? "#fff" : "#F8FAFC" }} />
                                  <input type="number" min="0" step="any" value={m.quantity || ''} onChange={e => updateMaterial(item.id, m.id, 'quantity', Number(e.target.value))} disabled={!canProcess || (!isSpv && (isWaitingCustomerDesign || isDoingSpvApproval))} style={{ width: 80, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: (canProcess && (isSpv || (!isWaitingCustomerDesign && !isDoingSpvApproval))) ? "#fff" : "#F8FAFC", textAlign: "right" }} />
                                  <input
                                    type="text"
                                    value={m.unit}
                                    readOnly
                                    style={{ width: 100, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: "#F8FAFC", color: S.secondary, cursor: "not-allowed", textAlign: "center" }}
                                  />
                                  {canProcess && (isSpv || (!isWaitingCustomerDesign && !isDoingSpvApproval)) && (
                                    <button onClick={() => removeMaterial(item.id, m.id)} style={{ padding: 8, background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", borderRadius: 4, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'done' && step !== 'rejected' && (
          <div style={{ padding: "20px 24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 16, flexShrink: 0, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
            {step === 'reject' ? (
              <>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "14px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Batal</button>
                <button onClick={handleReject} disabled={!rejectReason.trim() || isSubmitting} style={{ flex: 1, padding: "14px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: rejectReason.trim() && !isSubmitting ? 1 : 0.5 }}>
                  <Trash2 size={18} /> {isSubmitting ? 'Memproses...' : 'Tolak Desain'}
                </button>
              </>
            ) : step === 'confirm' ? (
              <>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "14px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali</button>
                <button onClick={handleForward} disabled={isSubmitting} style={{ flex: 1, padding: "14px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.5 : 1 }}>
                  <Send size={18} /> {isSubmitting ? 'Memproses...' : (isDoingSpvApproval ? 'Approve & Forward' : 'Forward ke Supervisor')}
                </button>
              </>
            ) : (
              <>
                {canProcess && isDoingSpvApproval && (
                  <button onClick={() => setStep('reject')} style={{ flex: 1, padding: "14px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}>
                    Tolak / Revisi
                  </button>
                )}
                {canProcess && (
                  <button onClick={() => setStep('confirm')} disabled={isSubmitDisabled}
                    style={{ flex: 2, padding: "14px", background: isSubmitDisabled ? "#FCA5A5" : S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: isSubmitDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s, transform 0.1s", opacity: !isSubmitDisabled ? 1 : 0.5 }}
                    title={hasDuplicateMaterials ? "Terdapat material duplikat di dalam BOM. Mohon periksa kembali." : ""}
                    onMouseDown={e => { if(!e.currentTarget.disabled) e.currentTarget.style.transform = "scale(0.98)" }}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <Send size={18} /> {isDoingSpvApproval ? 'Review & Approve' : 'Submit & Forward'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
