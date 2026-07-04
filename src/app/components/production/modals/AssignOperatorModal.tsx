import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { SalesOrder } from "../../data/mockData";
import { salesApi } from "../../../services/salesApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { S, getBackendSalesOrderId } from "../ProductionHelpers";

export function AssignOperatorModal({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  const { users, currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operators = users.filter(u => u.role === 'Engineering' || u.role === 'Engineering Supervisor');

  const handleAssign = async (operatorId: string) => {
    if (isSubmitting) return;
    const operator = users.find(u => u.id === operatorId);
    const operatorBackendId = toBackendUserId(operator);
    const reviewer = users.find(user => user.role === "Engineering Supervisor") || currentUser || operator;
    const reviewerBackendId = toBackendUserId(reviewer);
    const salesOrderId = getBackendSalesOrderId(so);

    if (!operator || !operatorBackendId || !reviewer || !reviewerBackendId || !isGuid(salesOrderId)) {
      alert("Tidak bisa assign operator karena data backend SO/operator belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      await salesApi.assignSalesOrderEngineers(salesOrderId, {
        productionWorker: { userId: operatorBackendId, name: operator.name },
        qcReviewer: { userId: reviewerBackendId, name: reviewer.name },
      });

      try {
        await salesApi.confirmSalesOrder(salesOrderId, toBackendUserId(currentUser) || reviewerBackendId);
      } catch (confirmError) {
        console.warn("Operator assigned, but SO confirmation is not ready yet.", confirmError);
      }

      await refreshBackendData();
      onClose();
    } catch (error) {
      console.warn("Failed to assign operator in backend.", error);
      alert("Gagal assign operator ke backend. Cek koneksi API atau data SO.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 380, padding: 24, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h2 style={{ color: S.slate, margin: "0 0 4px", fontSize: "18px" }}>Tugaskan Operator</h2>
        <p style={{ color: S.secondary, margin: "0 0 16px", fontSize: "12.5px" }}>{so.id} - {so.description || so.productName}</p>

        {isSubmitting ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: S.secondary, fontSize: "14px", fontWeight: 500 }}>Menyimpan Penugasan...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {operators.map(operator => (
                <button
                  key={operator.id}
                  onClick={() => handleAssign(operator.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${S.border}`,
                    background: S.white,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}
                >
                  <p style={{ margin: 0, color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>{operator.name}</p>
                  <p style={{ margin: "2px 0 0", color: S.secondary, fontSize: "12px" }}>{operator.email}</p>
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = S.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = S.white}>Batal</button>
          </>
        )}
      </div>
    </div>
  );
}
