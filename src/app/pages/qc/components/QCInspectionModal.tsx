import React, { useState, useRef } from 'react';
import { X, CheckCircle, Upload, Trash2 } from "lucide-react";
import { useApp } from "../../../components/context/AppContext";
import { ImageWithFallback } from "../../../components/figma/ImageWithFallback";
import { SalesOrder } from "../../../components/data/mockData";
import { QcInspectionDto, qcApi } from "../../../services/qcApi";
import { toBackendUserId, isGuid } from "../../../services/backendIds";
import { compressImage, S } from "./utils";

export function QCInspectionModal({
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return;
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

    setIsSubmitting(true);
    try {
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
      setIsSubmitting(false);
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
            {!drawingLink && so.backendDesignStatus === 'Approved' && !so.designApprovedAt && (
              <p style={{ fontSize: "12px", color: S.secondary, margin: "6px 0 0", fontStyle: "italic", padding: "6px 10px", background: "#F1F5F9", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                Produk terdaftar di katalog — tidak memerlukan desain.
              </p>
            )}
          </div>

          {so.completionNote && (
            <div>
              <p style={{ fontSize: "13px", color: S.slate, fontWeight: 500, margin: "0 0 8px" }}>Catatan Produksi</p>
              <div style={{ padding: "10px 14px", background: "#FFFBEB", border: `1px solid #FEF3C7`, borderRadius: 8, fontSize: "13px", color: "#92400E" }}>
                <strong>Catatan Operator:</strong> {so.completionNote}
              </div>
            </div>
          )}

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

          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>
              Catatan Hasil Inspeksi {result === 'NoGo' ? <span style={{ color: "#EF4444" }}>* (Wajib)</span> : <span style={{ color: S.secondary, fontWeight: 400 }}>(Opsional)</span>}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Temuan defect, kondisi produk, rekomendasi, dll."
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white, resize: "none" }} />
          </div>

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
          <button onClick={handleSubmit} disabled={!result || isSubmitting}
            style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: (!result || isSubmitting) ? "not-allowed" : "pointer", opacity: (result && !isSubmitting) ? 1 : 0.5 }}>
            {isSubmitting ? 'Menyimpan...' : 'Submit Hasil QC'}
          </button>
        </div>
      </div>
    </div>
  );
}
