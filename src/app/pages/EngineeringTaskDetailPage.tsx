import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Send, CheckCircle, ExternalLink, Plus, Trash2, UserPlus, ChevronLeft } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, getStatusColor } from "../components/data/mockData";
import { salesApi } from "../services/salesApi";
import { toBackendUserId, isGuid } from "../services/backendIds";

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
    (p.partNumber + ' ' + p.description).toLowerCase().includes((value || '').toLowerCase())
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
        placeholder="Nama material (pilih atau ketik sendiri)..."
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
              onClick={() => {
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
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: S.slate }}>{p.description}</div>
              <div style={{ fontSize: "11.5px", color: S.secondary, marginTop: 4 }}>{p.partNumber}</div>
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
  const [materials, setMaterials] = useState<{ id: string; name: string; quantity: number; unit: string; spec?: string }[]>([]);
  const [step, setStep] = useState<'upload' | 'confirm' | 'done' | 'reject' | 'rejected'>('upload');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedAsSpv, setCompletedAsSpv] = useState(false);

  useEffect(() => {
    if (qut) {
      setDesignLink(qut.designLink ?? qut.designId ?? '');
      setMaterials(qut.materials || []);
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
  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering Worker' && currentUser?.username === 'eng_spv');
  const isPendingSpv = qut.status === 'Waiting Spv Approval' || qut.backendDesignStatus === 'WaitingApproval';
  
  const currentUserBackendId = toBackendUserId(currentUser);
  const isAssignedToCurrentUser = 
    qut.designAssignedTo === currentUser?.id || 
    (currentUserBackendId && qut.designAssignedTo === currentUserBackendId) ||
    qut.designAssignedTo === currentUser?.name ||
    qut.designAssignedName === currentUser?.name;
  const isDoingWorkerSubmission = isAssignedToCurrentUser && (qut.status === 'Pending Design' || qut.status === 'Revision Required' || qut.status === 'Waiting Pricing' || qut.status === 'Waiting Payment');
  const isDoingSpvApproval = isSpv && isPendingSpv;

  let canProcess = isDoingWorkerSubmission || isDoingSpvApproval;
  
  // Strictly prevent any processing if it has moved past the engineering phase
  if (['In Production', 'Ready for Production', 'QC', 'Completed'].includes(qut.status)) {
    canProcess = false;
  }
  if (qut.backendDesignStatus === 'Approved' && !isDoingWorkerSubmission) {
    canProcess = false;
  }

  const addMaterial = () => setMaterials([...materials, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'pcs', spec: '' }]);
  const removeMaterial = (id: string) => setMaterials(materials.filter(m => m.id !== id));
  const updateMaterial = (mId: string, field: string, value: any) => setMaterials(materials.map(m => m.id === mId ? { ...m, [field]: value } : m));

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

      if (isDoingSpvApproval) {
        await salesApi.updateSalesOrderDesignStatus(backendId, {
          designStatus: 'Approved',
          notes: 'Approved by SPV',
          reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
          reviewerName: currentUser?.name || ''
        });
      } else if (isDoingWorkerSubmission) {
        await salesApi.submitSalesOrderDesign(backendId, {
          designReference: designLink,
          drawingFileUrl: designLink
        });
        
        if (materials && materials.length > 0) {
          try {
             const serializedMaterials = JSON.stringify(materials);
             const updatedItems = qut.items?.map((it, idx) => ({
                salesOrderItemId: it.id,
                productId: it.productId,
                qty: it.quantity,
                notes: idx === 0 ? serializedMaterials : it.notes
             })) || [];
             if (updatedItems.length > 0) {
                await salesApi.updateSalesOrderItems(backendId, { items: updatedItems });
             }
          } catch(e) {
             console.warn("Failed to update BOM on backend", e);
          }
        }
      }

      if (isDoingSpvApproval) {
        setCompletedAsSpv(true);
        const localUpdates = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
        localUpdates[qut.id] = { ...localUpdates[qut.id], designLink, materials };
        localStorage.setItem('soLocalUpdates', JSON.stringify(localUpdates));
        await refreshBackendData();
      } else if (isDoingWorkerSubmission) {
        updateSalesOrder(qut.id, {
          designLink,
          designId: designLink,
          materials,
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
      if (materials && materials.length > 0) {
        try {
           const serializedMaterials = JSON.stringify(materials);
           const updatedItems = qut.items?.map((it, idx) => ({
              salesOrderItemId: it.id,
              productId: it.productId,
              qty: it.quantity,
              notes: idx === 0 ? serializedMaterials : it.notes
           })) || [];
           if (updatedItems.length > 0) {
              await salesApi.updateSalesOrderItems(backendId, { items: updatedItems });
           }
        } catch(e) {
           console.warn("Failed to update BOM on backend", e);
        }
      }

      updateSalesOrder(qut.id, {
        status: 'Revision Required',
        backendDesignStatus: 'RevisionRequired',
        notes: rejectReason,
        materials: materials, // Ensure local context keeps the materials
      });
      if (isDoingSpvApproval) {
        const localUpdates = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
        // Do not delete localUpdates[qut.id] entirely, just update it so the BOM is preserved locally as fallback
        localUpdates[qut.id] = { ...localUpdates[qut.id], materials, designLink };
        localStorage.setItem('soLocalUpdates', JSON.stringify(localUpdates));
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
                {qut.customerDrawingUrl && (
                  <div style={{ marginBottom: 20, padding: "10px 16px", background: "#F1F5F9", borderRadius: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "12px", color: S.secondary }}>Referensi Desain Customer</span>
                    <a href={qut.customerDrawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "13px", fontWeight: 500, textDecoration: "none", wordBreak: "break-all" }}>
                      {qut.customerDrawingUrl}
                    </a>
                  </div>
                )}
                <div style={{ display: "flex", gap: 32 }}>
                  <div style={{ flex: 1 }}>
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
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "13px", color: S.secondary, display: "block", marginBottom: 8 }}>Catatan Pesanan / Spesifikasi:</span>
                    <div style={{ fontSize: "14px", color: S.slate, background: "#F8FAFC", padding: "12px 16px", borderRadius: 6, border: `1px solid ${S.border}`, minHeight: 60, whiteSpace: "pre-wrap" }}>
                      {qut.notes || <span style={{color: S.secondary, fontStyle: "italic"}}>Tidak ada catatan khusus.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              {canProcess && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px 20px" }}>
                  <p style={{ fontSize: "14px", color: "#1D4ED8", margin: 0, fontWeight: 500 }}>💡 Silakan unggah dokumen CAD ke cloud dan masukkan Bill of Materials (BOM) di bawah ini.</p>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "14px", color: S.slate, fontWeight: 600, marginBottom: 8 }}>Link Desain / Drawing <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  disabled={!canProcess || isDoingSpvApproval}
                  style={{ width: "100%", padding: "14px 16px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", boxSizing: "border-box", backgroundColor: (!canProcess || isDoingSpvApproval) ? "#F8FAFC" : "#fff", transition: "border 0.2s" }}
                  onFocus={e => e.currentTarget.style.borderColor = S.cyan}
                  onBlur={e => e.currentTarget.style.borderColor = S.border}
                />
              </div>
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <label style={{ fontSize: "14px", color: S.slate, fontWeight: 600 }}>Bill of Materials (BOM) <span style={{ color: "#EF4444" }}>*</span></label>
                  {canProcess && !isDoingSpvApproval && (
                    <button onClick={addMaterial} style={{ padding: "8px 16px", background: "rgba(200,16,46,0.05)", color: S.cyan, border: `1px solid rgba(200,16,46,0.1)`, borderRadius: 6, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(200,16,46,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(200,16,46,0.05)"}>
                      <Plus size={16} /> Tambah Material
                    </button>
                  )}
                </div>
                {materials.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: S.secondary, fontSize: "14px", background: "#F8FAFC", borderRadius: 8, border: `1px dashed #CBD5E1` }}>
                    Daftar material masih kosong. {canProcess && 'Wajib menambahkan minimal 1 material.'}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {materials.map(m => (
                      <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "#FFFFFF", padding: 16, borderRadius: 8, border: `1px solid ${S.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <input 
                          placeholder="Nama Material (Ketik manual)..." 
                          value={m.name} 
                          onChange={e => updateMaterial(m.id, 'name', e.target.value)} 
                          disabled={!canProcess} 
                          style={{ flex: 2, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: canProcess ? "#fff" : "#F8FAFC", minWidth: 0 }} 
                        />
                        <input placeholder="Spesifikasi / Ukuran..." value={m.spec} onChange={e => updateMaterial(m.id, 'spec', e.target.value)} disabled={!canProcess} style={{ flex: 1.5, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", minWidth: 0, backgroundColor: canProcess ? "#fff" : "#F8FAFC" }} />
                        <input type="number" min="0" step="any" value={m.quantity || ''} onChange={e => updateMaterial(m.id, 'quantity', Number(e.target.value))} disabled={!canProcess} style={{ width: 80, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: canProcess ? "#fff" : "#F8FAFC", textAlign: "right" }} />
                        <select value={m.unit} onChange={e => updateMaterial(m.id, 'unit', e.target.value)} disabled={!canProcess} style={{ width: 100, padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "14px", outline: "none", backgroundColor: canProcess ? "#fff" : "#F8FAFC" }}>
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="meter">meter</option>
                          <option value="lembar">lembar</option>
                          <option value="batang">batang</option>
                        </select>
                        {canProcess && (
                          <button onClick={() => removeMaterial(m.id)} style={{ padding: 8, background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", borderRadius: 4, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'done' && step !== 'rejected' && (
          <div style={{ padding: "20px 24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 16, flexShrink: 0, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
            {step === 'reject' ? (
              <>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "14px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Batal Kembali</button>
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
                  <button onClick={() => setStep('confirm')} disabled={(!designLink.trim() || materials.length === 0 || materials.some(m => !m.name.trim() || m.quantity <= 0)) || isSubmitting}
                    style={{ flex: 2, padding: "14px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s, transform 0.1s", opacity: ((designLink.trim() && materials.length > 0 && materials.every(m => m.name.trim() && m.quantity > 0)) && !isSubmitting) ? 1 : 0.5 }}
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
