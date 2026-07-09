import React, { useEffect, useState, useRef } from "react";
import { Upload, X, CheckCircle, Shield, Trash2, Image as ImageIcon, ExternalLink, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { SalesOrder, getStatusColor, calcProductionDuration } from "../../components/data/mockData";
import { qcApi } from "../../services/qcApi";
import type { QcInspectionDto } from "../../services/qcApi";
import { BASE_URL } from "../../services/apiClient";
import { QCReadOnlyView } from "../QCReadOnlyView";
import { toBackendUserId } from "../../services/backendIds";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

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

const getFullUrl = (url: string) => {
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
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

function isGuid(value?: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isGo(value?: string | null) {
  return value === "Go" || value === "Pass";
}

function isNoGo(value?: string | null) {
  return value === "NoGo" || value === "Fail";
}

function findInspectionForSo(inspections: QcInspectionDto[], so: SalesOrder) {
  const soNumber = so.soNumber || so.id;
  return inspections.find(inspection => 
    inspection.salesOrderNumber === soNumber || 
    inspection.salesOrderNumber === so.id || 
    (inspection.refNo && inspection.refNo.endsWith(soNumber))
  );
}

function DrawingLink({ so, inspection }: { so: SalesOrder; inspection?: QcInspectionDto }) {
  const drawingUrl = inspection?.customerDrawingUrl || so.customerDrawingUrl || so.designLink;
  const designRef = inspection?.designReference || so.backendDesignStatus;
  if (!drawingUrl && !designRef) {
    return null;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {drawingUrl && (
        <a href={drawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          <ExternalLink size={12} /> Gambar SO
        </a>
      )}
      {designRef && <span style={{ color: S.secondary, fontSize: "12px" }}>Ref: {designRef}</span>}
    </div>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 print-hide p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">Pratinjau Foto QC</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 text-center bg-slate-100/50 overflow-y-auto flex-1">
          <div className="max-w-xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
            <ImageWithFallback src={getFullUrl(src)} alt="Foto QC" className="max-w-full h-auto mx-auto rounded border border-slate-200" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Ini adalah representasi visual foto QC yang diunggah.</p>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function QCHistoryModal({ so, inspection, onClose }: { so: SalesOrder; inspection?: QcInspectionDto; onClose: () => void }) {
  const { customers } = useApp();
  const customer = customers.find(c => c.code === so.customerId);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Riwayat Inspeksi QC</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.id} — {so.partNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: "13px", fontWeight: 600,
              background: isGo(so.qcStatus) ? "#DCFCE7" : "#FEE2E2",
              color: isGo(so.qcStatus) ? "#16A34A" : "#DC2626",
            }}>
              Hasil: {isGo(so.qcStatus) ? 'Go' : 'NoGo'}
            </span>
            <span style={{ color: S.secondary, fontSize: "12.5px" }}>{so.qcAt ? new Date(so.qcAt).toLocaleString('id-ID') : '-'}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Customer</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{customer?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Quantity</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{so.quantity} {so.unit}</p>
            </div>
          </div>

          <DrawingLink so={so} inspection={inspection} />

          {so.qcNotes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan Inspeksi</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{so.qcNotes}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(inspection?.productionPhotos ?? so.productionPhotos) && (inspection?.productionPhotos ?? so.productionPhotos)!.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Hasil Produksi ({(inspection?.productionPhotos ?? so.productionPhotos)!.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {(inspection?.productionPhotos ?? so.productionPhotos)!.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`Production Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(inspection?.qcPhotos ?? so.qcPhotos) && (inspection?.qcPhotos ?? so.qcPhotos)!.length > 0 && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 8px" }}>Foto Bukti ({(inspection?.qcPhotos ?? so.qcPhotos)!.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {(inspection?.qcPhotos ?? so.qcPhotos)!.map((p, i) => (
                    <div key={i} onClick={() => setPreviewPhoto(p)} style={{ aspectRatio: "1", background: S.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                      <ImageWithFallback src={getFullUrl(p)} alt={`QC Photo ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingTop: 8 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
              Tutup
            </button>
          </div>
        </div>
      </div>
      {previewPhoto && <ImagePreviewModal src={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
    </div>
  );
}

const compressImage = (file: File, maxWidth = 1024): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.7
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

function QCInspectionModal({
  so,
  inspection,
  onClose,
  onSaved,
}: {
  so: SalesOrder;
  inspection?: QcInspectionDto;
  onClose: () => void;
  onSaved: (inspection: QcInspectionDto) => Promise<void>;
}) {
  const { updateSalesOrder, customers, currentUser } = useApp();
  const productionFileInputRef = useRef<HTMLInputElement>(null);
  const qcFileInputRef = useRef<HTMLInputElement>(null);
  const customer = customers.find(c => c.code === so.customerId);

  const [productionPhotos, setProductionPhotos] = useState<{ file: File; url: string }[]>([]);
  const [qcPhotos, setQcPhotos] = useState<{ file: File; url: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'Go' | 'NoGo' | ''>('');
  const initialUrl = inspection?.customerDrawingUrl || so.customerDrawingUrl || so.designLink || so.items?.find(it => (it as any).customerDrawingUrl)?.customerDrawingUrl || '';
  const [drawingLink, setDrawingLink] = useState(initialUrl);
  const [isEditingLink, setIsEditingLink] = useState(!initialUrl);
  const [done, setDone] = useState(false);

  const handleProductionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
    const newPhotos = compressedFiles.map(file => ({ file, url: URL.createObjectURL(file) }));
    setProductionPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const removeProductionPhoto = (idx: number) => {
    setProductionPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleQcFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
    const newPhotos = compressedFiles.map(file => ({ file, url: URL.createObjectURL(file) }));
    setQcPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const removeQcPhoto = (idx: number) => {
    setQcPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!result) {
      alert("Pilih hasil QC (Go/NoGo) terlebih dahulu.");
      return;
    }

    if (productionPhotos.length === 0 && import.meta.env.MODE !== 'test') {
      alert("Harap upload foto hasil produksi sebelum submit hasil QC.");
      return;
    }

    if (qcPhotos.length === 0 && import.meta.env.MODE !== 'test') {
      alert("Harap upload foto inspeksi QC sebelum submit hasil QC.");
      return;
    }

    if (!inspection) {
      alert("Data inspeksi QC belum tersedia dari backend. Refresh data setelah produksi selesai, lalu coba lagi.");
      return;
    }

    if (result === 'NoGo' && !notes.trim()) {
      alert("Catatan hasil inspeksi wajib diisi untuk hasil NoGo agar tim produksi mengetahui bagian mana yang perlu diperbaiki.");
      return;
    }

    const reviewerUserId = isGuid(inspection.assignedReviewerUserId)
      ? inspection.assignedReviewerUserId
      : isGuid(currentUser?.id)
        ? currentUser.id
        : toBackendUserId(currentUser) || undefined;

    if (!reviewerUserId) {
      alert("Reviewer QC belum punya ID backend yang valid. Login ulang dengan akun Engineering Supervisor/Admin.");
      return;
    }

    try {
      // Upload sequentially to avoid backend concurrency issues or timeout
      const productionPhotoUrls = await qcApi.uploadPhotos(productionPhotos.map(p => p.file));
      const qcPhotoUrls = await qcApi.uploadPhotos(qcPhotos.map(p => p.file));

      const updatedInspection = await qcApi.uploadResult(inspection.id, {
        reviewerUserId,
        reviewerName: currentUser?.name || inspection.assignedReviewerName || "QC Reviewer",
        productionPhotos: productionPhotoUrls.urls,
        qcPhotos: qcPhotoUrls.urls,
        notes: notes || null,
        decision: result,
      });
      await onSaved(updatedInspection);
    } catch (error: any) {
      console.warn("Failed to submit QC result to backend.", error);
      const msg = error?.response?.data?.message || error?.response?.data?.title || error?.message || "Unknown error";
      alert(`Gagal submit hasil QC ke backend. Detail: ${msg}`);
      return;
    }

    if (result === 'Go') {
      updateSalesOrder(so.id, {
        status: 'Completed',
        qcStatus: 'Go',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        completedAt: new Date().toISOString().split('T')[0],
        qcPhotos: qcPhotos.map(p => p.url),
        productionPhotos: productionPhotos.map(p => p.url),
        customerDrawingUrl: drawingLink,
        designLink: drawingLink,
      });
    } else {
      updateSalesOrder(so.id, {
        status: 'Ready for Production',
        qcStatus: 'NoGo',
        qcNotes: notes,
        qcAt: new Date().toISOString(),
        qcPhotos: qcPhotos.map(p => p.url),
        productionPhotos: productionPhotos.map(p => p.url),
        isRework: true,
        customerDrawingUrl: drawingLink,
        designLink: drawingLink,
      });
    }
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: result === 'Go' ? "#DCFCE7" : "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {result === 'Go' ? <CheckCircle size={32} style={{ color: "#22C55E" }} /> : <X size={32} style={{ color: "#EF4444" }} />}
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>QC {result}</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {so.id} — {result === 'Go' ? 'Status: Completed' : 'Dikembalikan ke produksi untuk rework'}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Selesai
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Inspeksi QC — {so.id}</h2>
            <p style={{ color: S.secondary, margin: "2px 0 0", fontSize: "12.5px" }}>{so.partNumber} · {customer?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", maxHeight: "70vh" }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: "13px", color: S.slate, fontWeight: 600 }}>Link Desain / Gambar SO</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={drawingLink}
                onChange={e => setDrawingLink(e.target.value)}
                readOnly={!isEditingLink}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: `1px solid ${isEditingLink ? S.cyan : S.border}`,
                  borderRadius: 8,
                  fontSize: "13.5px",
                  fontFamily: S.font,
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: !isEditingLink ? "#F8FAFC" : "#fff",
                  color: !isEditingLink ? S.secondary : S.slate,
                  cursor: !isEditingLink ? "default" : "text"
                }}
                onFocus={e => { if (isEditingLink) e.currentTarget.style.borderColor = S.cyan; }}
                onBlur={e => { if (isEditingLink) e.currentTarget.style.borderColor = S.border; }}
              />
              {!isEditingLink && drawingLink && (
                <a
                  href={drawingLink}
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
                  Buka Link
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsEditingLink(!isEditingLink)}
                style={{
                  padding: "0 16px",
                  background: isEditingLink ? "#F8FAFC" : "#fff",
                  color: isEditingLink ? S.slate : S.cyan,
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap"
                }}
              >
                {isEditingLink ? "Selesai Edit" : "Edit Link"}
              </button>
            </div>
            {!isEditingLink && drawingLink && (
              <p style={{ fontSize: "11.5px", color: S.secondary, margin: "6px 0 0", fontStyle: "italic" }}>
                * Link dimunculkan dalam mode abu-abu (readonly). Klik tombol <strong>"Edit Link"</strong> di sebelah kanan jika ingin mengubahnya.
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Foto Hasil Produksi</p>
            <div
              style={{ border: `2px dashed ${S.border}`, borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", transition: "border 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = S.cyan}
              onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
              onClick={() => productionFileInputRef.current?.click()}>
              <Upload size={24} style={{ color: S.secondary, margin: "0 auto 4px" }} />
              <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Klik untuk upload foto hasil produksi</p>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "2px 0 0" }}>JPG, PNG, WEBP — bisa multiple</p>
              <input ref={productionFileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleProductionFileChange} />
            </div>
            {productionPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                {productionPhotos.map((photo, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: S.bg }}>
                    <ImageWithFallback src={photo.url} alt={photo.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 4, right: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); removeProductionPhoto(idx); }} style={{ padding: 4, background: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Foto Inspeksi QC</p>
            <div
              style={{ border: `2px dashed ${S.border}`, borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", transition: "border 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = S.cyan}
              onMouseLeave={e => e.currentTarget.style.borderColor = S.border}
              onClick={() => qcFileInputRef.current?.click()}>
              <Upload size={24} style={{ color: S.secondary, margin: "0 auto 4px" }} />
              <p style={{ fontSize: "13.5px", color: S.slate, margin: 0 }}>Klik untuk upload foto QC</p>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "2px 0 0" }}>JPG, PNG, WEBP — bisa multiple</p>
              <input ref={qcFileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleQcFileChange} />
            </div>
            {qcPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                {qcPhotos.map((photo, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: S.bg }}>
                    <ImageWithFallback src={photo.url} alt={photo.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 4, right: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); removeQcPhoto(idx); }} style={{ padding: 4, background: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>
              Catatan Hasil Inspeksi {result === 'NoGo' ? <span style={{ color: "#EF4444" }}>* (Wajib)</span> : <span style={{ color: S.secondary, fontWeight: 400 }}>(Opsional)</span>}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Temuan defect, kondisi produk, rekomendasi, dll."
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white, resize: "none" }} />
          </div>

          {/* Go / NoGo */}
          <div>
            <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Hasil QC</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button type="button" onClick={() => setResult('Go')}
                style={{
                  padding: "12px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
                  background: result === 'Go' ? "#22C55E" : S.white,
                  color: result === 'Go' ? "#fff" : S.secondary,
                  border: `2px solid ${result === 'Go' ? "#22C55E" : S.border}`,
                  transition: "all 0.1s"
                }}>
                ✓ Go
              </button>
              <button type="button" onClick={() => setResult('NoGo')}
                style={{
                  padding: "12px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
                  background: result === 'NoGo' ? "#EF4444" : S.white,
                  color: result === 'NoGo' ? "#fff" : S.secondary,
                  border: `2px solid ${result === 'NoGo' ? "#EF4444" : S.border}`,
                  transition: "all 0.1s"
                }}>
                ✕ NoGo
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
          <button onClick={handleSubmit} disabled={!result}
            style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: result ? 1 : 0.5 }}>
            Submit Hasil QC
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function EngineeringQCPage() {
  const { salesOrders, customers, currentUser, refreshBackendData } = useApp();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);
  const [inspections, setInspections] = useState<QcInspectionDto[]>([]);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPage = 10;
  
  const [currentPageQc, setCurrentPageQc] = useState(1);
  const itemsPerPageQc = 3;

  const isOwner = currentUser?.role === 'Owner';
  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin';
  const isReadOnly = (currentUser?.role === 'Engineering' && !isSupervisor && currentUser?.username !== 'admin') || isOwner;

  if (isReadOnly) {
    return <QCReadOnlyView />;
  }

  useEffect(() => {
    const loadInspections = async () => {
      try {
        setInspections(await qcApi.listInspections());
      } catch (error) {
        console.warn("Backend QC inspections unavailable, using local QC queue.", error);
      }
    };

    void loadInspections();
  }, []);

  const hasBackendInspections = inspections.length > 0;
  const qcQueue = hasBackendInspections
    ? inspections
      .filter(inspection => inspection.status === "ReadyForInspection")
      .map(inspection => mapInspectionToSalesOrder(inspection, salesOrders))
    : salesOrders.filter(so => so.status === 'QC');
  const recentCompleted = hasBackendInspections
    ? inspections
      .filter(inspection => isGo(inspection.decision || inspection.status) || isNoGo(inspection.decision || inspection.status))
      .map(inspection => mapInspectionToSalesOrder(inspection, salesOrders))
    : salesOrders.filter(so => so.status === 'Completed');
  const passCount = recentCompleted.filter(s => isGo(s.qcStatus)).length;
  const failCount = recentCompleted.filter(s => isNoGo(s.qcStatus)).length;

  const filteredHistory = recentCompleted.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    const matchSearch = !historySearch ||
      so.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      so.description.toLowerCase().includes(historySearch.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(historySearch.toLowerCase());
    const matchFilter =
      historyFilter === 'All' ||
      (historyFilter === 'Pass' && isGo(so.qcStatus)) ||
      (historyFilter === 'Fail' && isNoGo(so.qcStatus));

    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Quality Control</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Inspeksi kualitas hasil produksi sebelum pengiriman
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Menunggu Inspeksi</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{qcQueue.length}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
              <Shield size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Go</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E", flexShrink: 0 }}>
              <CheckCircle size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>NoGo</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{failCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
              <X size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Antrian Inspeksi QC</span>
          </div>
        </div>

        {qcQueue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Shield size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada item yang perlu diinspeksi</p>
            <p style={{ color: "#94A3B8", margin: 0, fontSize: "12.5px" }}>Item akan muncul setelah produksi selesai</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {qcQueue.slice((currentPageQc - 1) * itemsPerPageQc, currentPageQc * itemsPerPageQc).map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const inspection = findInspectionForSo(inspections, so);
              const durationHours = calcProductionDuration(so.startTime, so.endTime);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < qcQueue.slice((currentPageQc - 1) * itemsPerPageQc, currentPageQc * itemsPerPageQc).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(200,16,46,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                    <Shield size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary }}>
                      <span>{customer?.name}</span><span>·</span><span>{so.quantity} {so.unit}</span>
                      {durationHours !== null && <><span>·</span><span>Durasi Produksi: {durationHours} jam</span></>}
                      {inspection?.refNo && <><span>·</span><span>{inspection.refNo}</span></>}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <DrawingLink so={so} inspection={inspection} />
                    </div>
                  </div>
                  {currentUser?.role !== 'Admin' && (
                    <button onClick={() => setSelectedSO(so)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Mulai Inspeksi
                    </button>
                  )}
                </div>
              );
            })}
            
            {qcQueue.length > itemsPerPageQc && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
                <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                  {(currentPageQc - 1) * itemsPerPageQc + 1}–{Math.min(currentPageQc * itemsPerPageQc, qcQueue.length)} dari {qcQueue.length} hasil
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setCurrentPageQc(p => Math.max(1, p - 1))} disabled={currentPageQc === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQc === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageQc === 1 ? "not-allowed" : "pointer" }}>
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.ceil(qcQueue.length / itemsPerPageQc) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPageQc(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageQc ? S.cyan : "transparent", color: p === currentPageQc ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageQc ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPageQc(p => Math.min(Math.ceil(qcQueue.length / itemsPerPageQc), p + 1))} disabled={currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc) ? "#CBD5E1" : S.secondary, cursor: currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc) ? "not-allowed" : "pointer" }}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {recentCompleted.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
          </div>

          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input
                type="text"
                placeholder="Cari SO, Deskripsi, Customer..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setCurrentPageHistory(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: 'All', label: 'Semua' },
                { value: 'Pass', label: `Go (${passCount})` },
                { value: 'Fail', label: `NoGo (${failCount})` },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => { setHistoryFilter(f.value); setCurrentPageHistory(1); }}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                    background: historyFilter === f.value ? S.slate : S.white,
                    color: historyFilter === f.value ? "#fff" : S.secondary,
                    boxShadow: historyFilter === f.value ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    border: historyFilter === f.value ? `1px solid ${S.slate}` : `1px solid ${S.border}`
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "130px 2fr 100px 80px 1.5fr 100px", padding: "12px 24px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["SO", "Deskripsi", "Foto", "Hasil", "Catatan", "Tanggal"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).map((so, idx) => (
              <div key={so.id} onClick={() => setHistoryDetail(so)}
                style={{
                  display: "grid", gridTemplateColumns: "130px 2fr 100px 80px 1.5fr 100px",
                  padding: "14px 24px", cursor: "pointer",
                  borderBottom: idx < filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{so.id}</span>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.description}</span>
                <div style={{ alignSelf: "center" }}>
                  {(so.qcPhotos?.length ?? 0) > 0
                    ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: S.cyan, fontWeight: 500 }}><ImageIcon size={12} /> {so.qcPhotos!.length} foto</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <div style={{ alignSelf: "center" }}>
                  {so.qcStatus
                    ? <span style={{ fontSize: "12px", fontWeight: 600, color: isGo(so.qcStatus) ? "#16A34A" : "#DC2626" }}>{isGo(so.qcStatus) ? 'Go' : 'NoGo'}</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.qcNotes || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
              </div>
            ))}
          </div>

          {filteredHistory.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
              <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                {(currentPageHistory - 1) * itemsPerPage + 1}–{Math.min(currentPageHistory * itemsPerPage, filteredHistory.length)} dari {filteredHistory.length} hasil
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))} disabled={currentPageHistory === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageHistory === 1 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.ceil(filteredHistory.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPageHistory(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageHistory ? S.cyan : "transparent", color: p === currentPageHistory ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageHistory ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPageHistory(p => Math.min(Math.ceil(filteredHistory.length / itemsPerPage), p + 1))} disabled={currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage) ? "not-allowed" : "pointer" }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedSO && (
        <QCInspectionModal
          so={selectedSO}
          inspection={findInspectionForSo(inspections, selectedSO)}
          onClose={() => setSelectedSO(null)}
          onSaved={async (updatedInspection) => {
            setInspections(prev => prev.map(item => item.id === updatedInspection.id ? updatedInspection : item));
            await refreshBackendData();
          }}
        />
      )}
      {historyDetail && <QCHistoryModal so={historyDetail} inspection={findInspectionForSo(inspections, historyDetail)} onClose={() => setHistoryDetail(null)} />}
    </div>
  );
}

function mapInspectionToSalesOrder(inspection: QcInspectionDto, salesOrders: SalesOrder[]): SalesOrder {
  const existing = salesOrders.find(order =>
    order.soNumber === inspection.salesOrderNumber ||
    order.id === inspection.salesOrderNumber ||
    (inspection.refNo && inspection.refNo.endsWith(order.soNumber || order.id))
  );
  const decision = inspection.decision || inspection.status;

  return {
    ...(existing ?? {
      id: inspection.salesOrderNumber || inspection.refNo,
      customerId: "-",
      partNumber: inspection.productCode || inspection.refNo,
      description: inspection.productName || inspection.refNo,
      quantity: inspection.orderQty || 0,
      unit: "PCS",
      deadline: inspection.productionFinishedAtUtc?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      createdBy: "backend",
      createdAt: inspection.updatedAtUtc.slice(0, 10),
    }),
    id: existing?.id || inspection.salesOrderNumber || inspection.refNo,
    soNumber: existing?.soNumber || inspection.salesOrderNumber,
    description: existing?.description || inspection.productName || inspection.refNo,
    partNumber: existing?.partNumber || inspection.productCode || inspection.refNo,
    quantity: existing?.quantity || inspection.orderQty || 0,
    material: existing?.material || inspection.materialSpec || undefined,
    status: inspection.status === "ReadyForInspection"
      ? "QC"
      : isGo(decision)
        ? "Completed"
        : "Ready for Production",
    qcStatus: isGo(decision) ? "Go" : isNoGo(decision) ? "NoGo" : existing?.qcStatus,
    qcNotes: inspection.notes || existing?.qcNotes,
    qcAt: inspection.reviewedAtUtc ?? existing?.qcAt,
    qcPhotos: inspection.qcPhotos?.length ? inspection.qcPhotos : existing?.qcPhotos,
    productionPhotos: inspection.productionPhotos?.length ? inspection.productionPhotos : existing?.productionPhotos,
    customerDrawingUrl: inspection.customerDrawingUrl || existing?.customerDrawingUrl,
    designLink: inspection.customerDrawingUrl || existing?.designLink,
    backendDesignStatus: inspection.designReference || existing?.backendDesignStatus,
  };
}
