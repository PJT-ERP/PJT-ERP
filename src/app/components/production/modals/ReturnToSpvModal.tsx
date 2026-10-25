import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SalesOrder } from '../../data/mockData';
import { salesApi } from '../../../services/salesApi';
import { toast } from 'sonner';
import { getBackendSalesOrderId } from '../ProductionHelpers';

export function ReturnToSpvModal({ so, onClose, onSubmitted }: { so: SalesOrder; onClose: () => void; onSubmitted: () => void }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert("Harap isi catatan / alasan pengembalian SO ke SPV.");
      return;
    }

    try {
      setIsSubmitting(true);
      const backendId = getBackendSalesOrderId(so);
      await salesApi.assignSalesOrderEngineers(backendId, {
        productionWorker: { userId: '00000000-0000-0000-0000-000000000000', name: "" }, // Guid.Empty to unassign
        notes: notes.trim()
      });
      
      toast.success("SO berhasil dikembalikan ke SPV.", { duration: 3000 });
      await queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      onSubmitted();
      onClose();
    } catch (error) {
      console.error("Gagal kembalikan SO ke SPV", error);
      alert("Gagal mengembalikan SO ke SPV. Silakan periksa koneksi Anda.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#1e293b" }}>Kembalikan ke SPV</h2>
        <p style={{ margin: "0 0 16px", fontSize: "13.5px", color: "#64748b" }}>
          Kembalikan SO <strong>{so.id}</strong> ke Supervisor karena material tidak lengkap atau alasan lainnya.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "13px", fontWeight: 600, color: "#334155" }}>
            Catatan / Alasan <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Contoh: Material aluminium ukuran 100x50 ternyata kurang 2 pcs di gudang..."
            style={{
              width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6,
              fontSize: "13.5px", color: "#334155", resize: "vertical"
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer" }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: "13px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer" }}
          >
            {isSubmitting ? "Memproses..." : "Kembalikan ke SPV"}
          </button>
        </div>
      </div>
    </div>
  );
}
