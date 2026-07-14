import React from "react";
import { Trash2, Send, CheckCircle } from "lucide-react";

const S = {
  cyan: "#C8102E",
  slate: "#111827",
  border: "#E2E8F0",
};

interface FooterActionsProps {
  step: string;
  canProcess: boolean;
  isDoingSpvApproval: boolean;
  isSubmitDisabled: boolean;
  rejectReason: string;
  isSubmitting: boolean;
  hasDuplicateMaterials: boolean;
  hasCategoryConflict: boolean;
  onBack: () => void;
  onReject: () => void;
  onForward: () => void;
  onGoReject: () => void;
}

export function FooterActions(props: FooterActionsProps) {
  const { step, canProcess, isDoingSpvApproval, isSubmitDisabled, rejectReason, isSubmitting, hasDuplicateMaterials, hasCategoryConflict, onBack, onReject, onForward, onGoReject } = props;

  if (step === 'reject') {
    return (
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 16, flexShrink: 0, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <button onClick={onBack} style={{ flex: 1, padding: "14px", background: "#fff", border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Batal</button>
        <button onClick={onReject} disabled={!rejectReason.trim() || isSubmitting} style={{ flex: 1, padding: "14px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: rejectReason.trim() && !isSubmitting ? 1 : 0.5 }}>
          <Trash2 size={18} /> {isSubmitting ? 'Memproses...' : 'Tolak Desain'}
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 16, flexShrink: 0, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <button onClick={onBack} style={{ flex: 1, padding: "14px", background: "#fff", border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali</button>
        <button onClick={onForward} disabled={isSubmitting} style={{ flex: 1, padding: "14px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmitting ? 0.5 : 1 }}>
          <Send size={18} /> {isSubmitting ? 'Memproses...' : 'Simpan Desain & Lanjut ke Produksi'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 16, flexShrink: 0, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
      {canProcess && isDoingSpvApproval && (
        <button onClick={onGoReject} style={{ flex: 1, padding: "14px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}>
          Tolak / Revisi
        </button>
      )}
      {canProcess && (
        <button onClick={onForward} disabled={isSubmitDisabled}
          style={{ flex: 2, padding: "14px", background: isSubmitDisabled ? "#FCA5A5" : S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: isSubmitDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s, transform 0.1s", opacity: !isSubmitDisabled ? 1 : 0.5 }}
          title={hasDuplicateMaterials ? "Terdapat material duplikat di dalam BOM. Mohon periksa kembali." : hasCategoryConflict ? "Material yang sama tidak boleh memiliki kategori yang berbeda." : ""}
          onMouseDown={e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = "scale(0.98)" }}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <CheckCircle size={18} /> Simpan Desain & Lanjut ke Produksi
        </button>
      )}
    </div>
  );
}
