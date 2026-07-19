import { useNavigate } from "react-router";
import { CheckCircle } from "lucide-react";
import { S } from "./MaterialRequestHelpers";

export function MRSuccessView({
  soId,
  currentUser,
}: {
  soId: string;
  currentUser: any;
}) {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <CheckCircle size={32} style={{ color: "#22C55E" }} />
      </div>
      <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
        Material Request Berhasil Diajukan
      </h3>
      <p style={{ color: S.secondary, fontSize: "14px", margin: "0 0 24px" }}>
        Pengajuan MR untuk {soId} telah dikirim ke {currentUser?.role?.includes('Supervisor') || currentUser?.role === 'Admin' || currentUser?.role === 'Owner' ? 'tim Purchasing' : 'Supervisor untuk direview sebelum diteruskan ke tim Purchasing'}.
      </p>
      <button onClick={() => { navigate('/erp/production'); }} style={{ padding: "12px 24px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Kembali ke Dasbor Produksi</button>
    </div>
  );
}
