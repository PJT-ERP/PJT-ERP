import React, { useState } from "react";
import { Send, CheckCircle, ExternalLink, List, Plus, Trash2, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, getStatusColor } from "../components/data/mockData";
import { ApprovalModal, ApprovalItem } from "./OwnerApprovalPage";
import { salesApi } from "../services/salesApi";
import { quotationApi } from "../services/quotationApi";
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

function DesignModal({ qut, onClose }: { qut: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, customers, currentUser } = useApp();
  const [designLink, setDesignLink] = useState(qut.designLink ?? qut.designId ?? '');
  const [materials, setMaterials] = useState<{ id: string; name: string; quantity: number; unit: string; spec?: string }[]>(qut.materials || []);
  const [step, setStep] = useState<'upload' | 'confirm' | 'done' | 'reject' | 'rejected'>('upload');
  const [rejectReason, setRejectReason] = useState('');
  const customer = customers.find(c => c.code === qut.customerId);
  
  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering Worker' && currentUser?.username === 'eng_spv');
  const isPendingSpv = qut.status === 'Waiting Spv Approval' || qut.status === 'design_review';
  const canProcess = isSpv ? isPendingSpv : qut.assignedTo === currentUser?.id && (qut.status === 'Pending Design' || qut.status === 'pending_design');

  const addMaterial = () => setMaterials([...materials, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'pcs', spec: '' }]);
  const removeMaterial = (id: string) => setMaterials(materials.filter(m => m.id !== id));
  const updateMaterial = (id: string, field: string, value: any) => setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForward = async () => {
    if (!canProcess) return;

    try {
      setIsSubmitting(true);
      
      if (qut.isQuotation) {
        // Handle Quotation
        const backendId = qut.backendId || qut.id;
        if (!isSpv) {
          // Engineer submits design
          const engineerId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID());
          await quotationApi.submitDesign(backendId, {
            designLink,
            bomItems: materials.map(m => ({
              itemCode: m.id.length === 36 ? m.id : null,
              name: m.name,
              specification: m.spec || null,
              quantity: Number(m.quantity) || 1,
              unit: m.unit || "pcs",
            })),
            engineerId,
            engineerName: currentUser?.name || "Engineer",
          });
        } else {
          // SPV approves design
          await quotationApi.approveSupervisorDesign(backendId);
        }
        
        updateQuotation(qut.id, {
          designLink,
          designId: designLink,
          materials,
          status: isSpv ? 'waiting_pricing' : 'design_review',
        });
      } else {
        // Handle Sales Order
        const backendId = qut.backendId || qut.id;
        if (isSpv) {
          await salesApi.updateSalesOrderDesignStatus(backendId, {
            designStatus: 'Approved',
            notes: 'Approved by SPV',
            reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
            reviewerName: currentUser?.name || ''
          });
        } else {
          await salesApi.updateSalesOrderItems(backendId, {
            items: qut.items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes,
              unitPrice: i.unitPrice || 0,
              materials: materials.map(m => ({
                materialId: m.id.length === 36 ? m.id : null,
                name: m.name,
                specifications: m.spec,
                quantity: m.quantity,
                unit: m.unit
              }))
            }))
          });

          await salesApi.submitSalesOrderDesign(backendId, {
            designReference: designLink,
            drawingFileUrl: designLink
          });
        }

        updateSalesOrder(qut.id, {
          designLink,
          designId: designLink,
          materials,
          status: isSpv ? 'Menunggu Invoice DP' : 'Waiting Spv Approval',
          backendDesignStatus: isSpv ? 'Approved' : 'WaitingApproval',
        });
      }
      setStep('done');
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate data ke server. Pastikan API backend berjalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setIsSubmitting(true);
      const backendId = qut.backendId || qut.id;
      
      if (qut.isQuotation) {
        await quotationApi.requestDesignRevision(backendId, {
          notes: rejectReason,
        });
        updateQuotation(qut.id, {
          status: 'pending_design',
          notes: rejectReason,
        });
      } else {
        await salesApi.updateSalesOrderDesignStatus(backendId, {
          designStatus: 'Rejected',
          notes: rejectReason,
          reviewedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
          reviewerName: currentUser?.name || ''
        });
        updateSalesOrder(qut.id, {
          status: 'Pending Design',
          backendDesignStatus: 'Rejected',
          notes: rejectReason,
        });
      }
      setStep('rejected');
    } catch (err) {
      console.error(err);
      alert('Gagal mereject desain ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{qut.id}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{qut.productName} - {qut.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px", fontWeight: "bold" }}>&times;</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {!canProcess && !(qut.designLink || qut.designId || qut.materials?.length) ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, background: "#FEF3C7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <UserPlus size={30} style={{ color: "#D97706" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>Belum Bisa Dikerjakan</h3>
              <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
                SO ini harus ditugaskan oleh Engineering Supervisor sebelum Engineer bisa mengirim desain.
              </p>
              <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Tutup</button>
            </div>
          ) : step === 'done' ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={32} style={{ color: "#22C55E" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                {isSpv ? 'Desain Disetujui (Diteruskan ke Finance)' : 'Desain Menunggu Approval Supervisor'}
              </h3>
              <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
                {isSpv ? 'Sales Order dilanjutkan ke Finance untuk penentuan harga dan pembuatan Invoice DP.' : 'Status Sales Order menjadi "Waiting Spv Approval"'}
              </p>
              <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Tutup</button>
            </div>
          ) : step === 'rejected' ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Trash2 size={32} style={{ color: "#EF4444" }} />
              </div>
              <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
                Desain Dikembalikan ke Engineer
              </h3>
              <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
                Status Penawaran kembali menjadi "Pending Design". Engineer harus merevisi dan mengirim ulang desainnya.
              </p>
              <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Tutup</button>
            </div>
          ) : step === 'reject' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 16 }}>
                <p style={{ color: "#991B1B", margin: 0, fontSize: "13.5px", fontWeight: 500 }}>
                  Apakah Anda yakin ingin menolak desain ini?
                </p>
                <p style={{ color: "#B91C1C", margin: "4px 0 0", fontSize: "12.5px" }}>
                  Desain akan dikembalikan ke Engineer untuk direvisi.
                </p>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>
                  Catatan Revisi <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Sebutkan apa yang perlu diperbaiki oleh Engineer..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Kembali</button>
                <button onClick={handleReject} disabled={!rejectReason.trim() || isSubmitting} style={{ flex: 1, padding: "10px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: rejectReason.trim() && !isSubmitting ? 1 : 0.5 }}>
                  <Trash2 size={15} /> {isSubmitting ? 'Memproses...' : 'Tolak Desain'}
                </button>
              </div>
            </div>
          ) : step === 'confirm' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 16 }}>
                <p style={{ color: "#92400E", fontSize: "13.5px", margin: 0 }}>
                  {isSpv ? 'Konfirmasi menyetujui desain dan BOM dari staf? SO akan masuk ke tahap Penentuan Harga oleh Finance.' : 'Konfirmasi meneruskan desain & BOM ke Supervisor untuk di-review?'}
                </p>
              </div>
              <div style={{ background: S.bg, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: "13.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Customer</span><span style={{ color: S.slate, fontWeight: 500 }}>{customer?.name}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: S.secondary }}>Qty</span><span style={{ color: S.slate, fontWeight: 500 }}>{qut.quantity} {qut.unit}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: S.secondary }}>Link Desain</span>
                  <a href={designLink} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "12px", display: "flex", alignItems: "center", gap: 4, fontWeight: 500, textDecoration: "none" }}>Lihat <ExternalLink size={11} /></a>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Kembali</button>
                <button onClick={handleForward} disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.5 : 1 }}>
                  <Send size={15} /> {isSubmitting ? 'Memproses...' : (isSpv ? 'Approve & Forward' : 'Forward ke Supervisor')}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "13.5px" }}>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Qty</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.quantity} {qut.unit}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Deadline</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.deadline}</p></div>
                <div><p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Input SO</p><p style={{ color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{qut.createdAt}</p></div>
              </div>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: "12px", color: "#1D4ED8", margin: 0 }}>Silakan unggah dokumen CAD ke cloud dan masukkan Bill of Materials (BOM) di bawah ini.</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13.5px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Link Desain / Drawing <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="url" value={designLink} onChange={e => setDesignLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  disabled={!canProcess}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", boxSizing: "border-box", backgroundColor: canProcess ? "#fff" : "#f1f5f9" }} />
              </div>
              
              <div style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "13.5px", color: S.slate, fontWeight: 500 }}>Bill of Materials (BOM) <span style={{ color: "#EF4444" }}>*</span></label>
                  <button onClick={addMaterial} style={{ padding: "4px 8px", background: "rgba(200,16,46,0.1)", color: S.cyan, border: "none", borderRadius: 4, fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Tambah Material</button>
                </div>
                {materials.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: S.secondary, fontSize: "13px", background: "#F8FAFC", borderRadius: 8, border: `1px dashed ${S.border}` }}>
                    Daftar material masih kosong. {canProcess && 'Wajib menambahkan minimal 1 material.'}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "200px", overflowY: "auto", paddingRight: 4 }}>
                    {materials.map(m => (
                      <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#F8FAFC", padding: 8, borderRadius: 6, border: `1px solid ${S.border}` }}>
                        <input placeholder="Nama material..." value={m.name} onChange={e => updateMaterial(m.id, 'name', e.target.value)} disabled={!canProcess} style={{ flex: 1.5, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", minWidth: 0, backgroundColor: canProcess ? "#fff" : "transparent" }} />
                        <input placeholder="Spesifikasi..." value={m.spec} onChange={e => updateMaterial(m.id, 'spec', e.target.value)} disabled={!canProcess} style={{ flex: 1, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", minWidth: 0, backgroundColor: canProcess ? "#fff" : "transparent" }} />
                        <input type="number" min="0.1" step="0.1" value={m.quantity || ''} onChange={e => updateMaterial(m.id, 'quantity', Number(e.target.value))} disabled={!canProcess} style={{ width: 60, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", backgroundColor: canProcess ? "#fff" : "transparent" }} />
                        <select value={m.unit} onChange={e => updateMaterial(m.id, 'unit', e.target.value)} disabled={!canProcess} style={{ width: 70, padding: "6px 8px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12px", outline: "none", backgroundColor: canProcess ? "#fff" : "transparent" }}>
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="meter">meter</option>
                          <option value="lembar">lembar</option>
                          <option value="batang">batang</option>
                        </select>
                        {canProcess && <button onClick={() => removeMaterial(m.id)} style={{ padding: 4, background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex" }}><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>{canProcess ? "Batal" : "Tutup"}</button>
                {canProcess && isSpv && isPendingSpv && (
                  <button onClick={() => setStep('reject')} style={{ flex: 1, padding: "10px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Tolak / Revisi
                  </button>
                )}
                {canProcess && (
                  <button onClick={() => setStep('confirm')} disabled={!designLink.trim() || materials.length === 0 || materials.some(m => !m.name.trim() || m.quantity <= 0) || isSubmitting}
                    style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (designLink.trim() && materials.length > 0 && materials.every(m => m.name.trim() && m.quantity > 0) && !isSubmitting) ? 1 : 0.5 }}>
                    <Send size={15} /> {isSpv && isPendingSpv ? 'Review & Approve' : 'Submit & Forward'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignEngineerModal({ qut, onClose }: { qut: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, users } = useApp();
  const engineers = users.filter(user => user.role === 'Engineering Worker' && user.username !== 'eng_spv');

  const handleAssign = (userId: string) => {
    const engineer = engineers.find(user => user.id === userId);
    updateSalesOrder(qut.id, {
      assignedTo: userId,
      assignedName: engineer?.name,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 380, padding: 24, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h2 style={{ color: S.slate, margin: "0 0 4px", fontSize: "18px" }}>Tugaskan Desain</h2>
        <p style={{ color: S.secondary, margin: "0 0 16px", fontSize: "12.5px" }}>{qut.id} - {qut.productName}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {engineers.map(engineer => (
            <button
              key={engineer.id}
              onClick={() => handleAssign(engineer.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.white,
                cursor: "pointer",
              }}
            >
              <p style={{ margin: 0, color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>{engineer.name}</p>
              <p style={{ margin: "2px 0 0", color: S.secondary, fontSize: "12px" }}>{engineer.email}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
      </div>
    </div>
  );
}

export function EngineeringTasksPage() {
  const { salesOrders, quotations, customers, currentUser, users } = useApp();
  const [selectedQUT, setSelectedQUT] = useState<any | null>(null);
  const [assignModalQUT, setAssignModalQUT] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering Worker' && currentUser?.username === 'eng_spv');
  
  const pendingQuotations = quotations
    .filter(q => q.status === 'pending_design' || q.status === 'design_review')
    .map(q => ({ ...q, isQuotation: true } as any));
    
  const pendingSalesOrders = salesOrders
    .filter(so => so.status === 'Pending Design' || so.status === 'Waiting Spv Approval')
    .map(so => ({ ...so, isQuotation: false } as any));

  const allQueue = [...pendingQuotations, ...pendingSalesOrders];
  
  const queue = allQueue
    .filter(q => {
      if (isSpv) {
        return true;
      }
      return q.assignedTo === currentUser?.id;
    })
    .sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Tugas Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola semua antrian desain, revisi, dan status persetujuan
          </p>
        </div>
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Semua Antrian Desain</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "100px 1.2fr 1.5fr 130px 100px 160px 110px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
          {["No. SO", "Pelanggan", "Produk", "Ditugaskan", "Deadline", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
            <p style={{ color: S.slate, margin: 0, fontSize: "13.5px" }}>Semua pesanan sudah selesai didesain.</p>
          </div>
        ) : (
          queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((qut, idx) => {
            const assignedName = qut.assignedName || users.find(user => user.id === qut.assignedTo)?.name || "-";
            const canWork = !isSpv && qut.assignedTo === currentUser?.id && (qut.status === 'Pending Design' || qut.status === 'pending_design');
            const canReview = isSpv && (qut.status === 'Waiting Spv Approval' || qut.status === 'design_review');
            const canAssign = isSpv && (qut.status === 'Pending Design' || qut.status === 'pending_design');

            return (
            <div
              key={qut.id}
              onClick={() => {
                setSelectedQUT(qut);
              }}
              style={{
                display: "grid", gridTemplateColumns: "100px 1.2fr 1.5fr 130px 100px 160px 110px", alignItems: "center",
                padding: "10px 18px", cursor: "pointer",
                borderBottom: idx < queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{qut.id}</span>
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
              </div>
              <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{qut.description || qut.partNumber || "-"}</span>
              <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                {qut.assignedTo ? (
                  <span style={{ fontSize: "11px", background: S.bg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${S.border}`, color: S.slate, display: "inline-block" }}>
                    {assignedName}
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                )}
              </span>
              <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500 }}>{qut.deadline}</span>
              <div>
                <StatusBadge status={qut.status} />
              </div>
              <div>
                {canAssign ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setAssignModalQUT(qut);
                    }}
                    style={{ fontSize: "11px", background: "#C8102E", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    {qut.assignedTo ? "Ganti" : "Tugaskan"}
                  </button>
                ) : canWork ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedQUT(qut);
                    }}
                    style={{ fontSize: "11px", background: "#2563EB", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Kerjakan
                  </button>
                ) : canReview ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedQUT(qut);
                    }}
                    style={{ fontSize: "11px", background: "#2563EB", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Review
                  </button>
                ) : (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedQUT(qut);
                    }}
                    style={{ fontSize: "11px", background: S.white, color: S.slate, border: `1px solid ${S.border}`, padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Detail
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}

        {queue.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, queue.length)} dari {queue.length} hasil
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(queue.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minWidth: 28, height: 28, padding: "0 8px",
                    borderRadius: 8, border: "none",
                    background: p === currentPage ? S.cyan : "transparent",
                    color: p === currentPage ? "#FFFFFF" : "#475569",
                    fontSize: "13.5px", fontWeight: p === currentPage ? 600 : 500,
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(queue.length / itemsPerPage), p + 1))} 
                disabled={currentPage >= Math.ceil(queue.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedQUT && (isSpv && selectedQUT.status === 'Waiting Spv Approval' ? (
        <ApprovalModal item={{ ...selectedQUT, isQuotation: true } as ApprovalItem} onClose={() => setSelectedQUT(null)} />
      ) : (
        <DesignModal qut={selectedQUT} onClose={() => setSelectedQUT(null)} />
      ))}
      {assignModalQUT && <AssignEngineerModal qut={assignModalQUT} onClose={() => setAssignModalQUT(null)} />}
    </div>
  );
}
