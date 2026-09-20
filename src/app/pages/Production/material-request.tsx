import React from "react";
import { useNavigate } from "react-router";
import { Plus, ChevronLeft } from "lucide-react";
import { S } from "./components/material-request/MaterialRequestHelpers";
import { useMaterialRequest } from "./hooks/useMaterialRequest";
import { MRSuccessView } from "./components/material-request/MRSuccessView";
import { MRItemRow } from "./components/material-request/MRItemRow";

export function ProductionMaterialRequestPage() {
  const navigate = useNavigate();
  const board = useMaterialRequest();

  if (!board.so) {
    return (
      <div style={{ padding: 24, textAlign: "center", fontFamily: S.font }}>
        <p>Sales Order tidak ditemukan.</p>
        <button onClick={() => navigate("/erp/production")} style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Kembali</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: S.bg, fontFamily: S.font }}>
      <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <button 
            onClick={() => { navigate('/erp/production'); }} 
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: S.white, border: `1px solid ${S.border}`, borderRadius: "8px", cursor: "pointer", color: S.slate, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: "8px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s", alignSelf: "flex-start" }}
            onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.borderColor = "#CBD5E1"; }}
            onMouseLeave={e => { e.currentTarget.style.background = S.white; e.currentTarget.style.borderColor = S.border; }}
          >
            <ChevronLeft size={16} /> Kembali ke Dasbor Produksi
          </button>

          <div style={{ background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: 32 }}>
          {board.isSuccess ? (
            <MRSuccessView soId={board.so.id} currentUser={board.currentUser} />
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ color: S.slate, margin: 0, fontSize: "22px" }}>Permintaan Material (MR)</h2>
                <p style={{ color: S.secondary, margin: "4px 0 0", fontSize: "14px" }}>
                  {board.so.id} — {board.so.customerName}
                </p>
              </div>

              <form onSubmit={board.handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "16px" }}>💡</span>
                  <p style={{ fontSize: "13.5px", color: "#1D4ED8", margin: 0 }}>
                    Isi daftar item untuk MR. Pengajuan ini memerlukan approval Supervisor sebelum diteruskan ke Purchasing.
                  </p>
                </div>

                { (board.request?.status === 'Ditolak' || board.request?.backendStatus === 'Rejected') && board.request?.rejectionReason && (
                  <div style={{ padding: "16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#B91C1C" }}>MR Sebelumnya Ditolak (Catatan SPV):</p>
                    <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#DC2626" }}>{board.request.rejectionReason}</p>
                  </div>
                )}

                {board.errorMsg && (
                  <div style={{ padding: "16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: "14px" }}>
                    {board.errorMsg}
                  </div>
                )}

                {board.hasDuplicates && (
                  <div style={{ padding: "12px 16px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, color: "#92400E", fontSize: "13.5px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⚠️</span> Terdapat material yang duplikat / sama persis. Harap gabungkan quantity-nya menjadi 1 baris item saja.
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: S.slate }}>Daftar Material <span style={{ color: "#EF4444" }}>*</span></h3>
                  <button type="button" onClick={board.addItem} style={{ padding: "8px 14px", background: "#FEF2F2", color: S.cyan, border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "#FEF2F2"}>
                    <Plus size={14} /> Tambah Material
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {board.items.map((item, index) => (
                    <MRItemRow
                      key={index}
                      item={item}
                      index={index}
                      totalItems={board.items.length}
                      bomOptions={board.bomOptions}
                      mergedOptions={board.mergedOptions}
                      removeItem={board.removeItem}
                      updateItem={board.updateItem}
                    />
                  ))}
                </div>

                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: "14px", color: S.slate, fontWeight: 500, marginBottom: 8 }}>Catatan Tambahan</label>
                  <textarea
                    value={board.notes}
                    onChange={event => board.setNotes(event.target.value)}
                    placeholder="Tulis pesan untuk SPV/Purchasing..."
                    rows={3}
                    style={{ width: "100%", padding: "12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "14px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 16, borderTop: `1px solid ${S.border}`, paddingTop: 24 }}>
                  <button type="button" onClick={() => navigate("/erp/production")} style={{ flex: 1, padding: "12px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}>Batal</button>
                  <button type="submit" disabled={!board.canSubmit || board.isSubmitting} style={{ flex: 2, padding: "12px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: board.canSubmit && !board.isSubmitting ? "pointer" : "not-allowed", opacity: board.canSubmit && !board.isSubmitting ? 1 : 0.6, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {board.isSubmitting ? "Mengajukan..." : "Ajukan Material Request"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionMaterialRequestPage;
