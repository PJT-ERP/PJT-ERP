import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "../../context/AppContext";
import { PurchaseRequestDto, purchasingApi } from "../../../services/purchasingApi";

const styles = {
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

export function OwnerPurchaseRequestApprovals() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [ownerRejectId, setOwnerRejectId] = useState<string | null>(null);
  const [ownerRejectReason, setOwnerRejectReason] = useState("");
  const [ownerApprovalSaving, setOwnerApprovalSaving] = useState(false);
  const canReview = currentUser?.role === "Owner" || currentUser?.role === "Admin";

  const fetchPurchaseRequests = useCallback(async () => {
    try { setPurchaseRequests(await purchasingApi.listPurchaseRequests()); }
    catch (error) { console.error('Failed to load Purchase Request approvals.', error); }
  }, []);

  useEffect(() => {
    if (canReview) void fetchPurchaseRequests();
  }, [canReview, fetchPurchaseRequests]);

  const submitOwnerDecision = async (request: PurchaseRequestDto, decision: 'Approved' | 'Rejected', reason?: string) => {
    if (decision === 'Rejected' && !reason?.trim()) return;
    setOwnerApprovalSaving(true);
    try {
      await purchasingApi.reviewPurchaseRequestOwnerApproval(request.id, {
        decision,
        ...(decision === 'Rejected' ? { rejectionReason: reason!.trim() } : {})
      });
      setOwnerRejectId(null);
      setOwnerRejectReason("");
      await Promise.all([
        fetchPurchaseRequests(),
        queryClient.invalidateQueries({ queryKey: ['purchasingData'] }),
        queryClient.invalidateQueries({ queryKey: ['purchasingRequests'] }),
      ]);
    } catch (error) {
      console.error('Failed to submit Owner Purchase Request approval.', error);
      alert('Gagal memproses persetujuan Purchase Request.');
    } finally { setOwnerApprovalSaving(false); }
  };

  if (!canReview) return null;

  const activeRequests = purchaseRequests.filter(pr => pr.activeApprovalCycleNumber != null && pr.ownerApproval?.decision);

  return (
    <section style={{ background: styles.white, border: `1px solid ${styles.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${styles.border}` }}>
        <h2 style={{ margin: 0, color: styles.slate, fontSize: 16 }}>Approval Purchase Request</h2>
        <p style={{ margin: "4px 0 0", color: styles.secondary, fontSize: 12 }}>Persetujuan Owner berjalan paralel dengan Finance. Kedua persetujuan diperlukan sebelum PR siap untuk PO.</p>
      </div>
      {activeRequests.length === 0 ? (
        <p style={{ padding: 20, color: styles.secondary, textAlign: "center", fontSize: 13 }}>Tidak ada siklus approval Purchase Request aktif.</p>
      ) : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{['PR', 'Item', 'Cycle', 'Finance', 'Owner', 'Status', 'Aksi'].map(label => <th key={label} style={{ padding: 10, textAlign: "left", color: styles.secondary, background: "#F8FAFC", whiteSpace: "nowrap" }}>{label}</th>)}</tr></thead>
        <tbody>{activeRequests.map(pr => {
          const blocked = pr.isApprovalBlocked === true;
          const ownerPending = pr.ownerApproval?.decision === 'Pending';
          const canDecide = (currentUser?.role === 'Owner' || currentUser?.role === 'Admin') && ownerPending && !blocked;
          return <tr key={pr.id} style={{ borderTop: `1px solid ${styles.border}` }}>
            <td style={{ padding: 10, whiteSpace: "nowrap" }}>{pr.prNumber}</td>
            <td style={{ padding: 10 }}>{pr.items.map(item => `${item.itemName} × ${item.qty}`).join(', ')}</td>
            <td style={{ padding: 10 }}>{pr.activeApprovalCycleNumber}</td>
            <td style={{ padding: 10 }}>{pr.financeApproval?.decision || 'Pending'}{pr.financeApproval?.decidedAtUtc ? <small style={{ display: 'block', color: styles.secondary }}>{new Date(pr.financeApproval.decidedAtUtc).toLocaleDateString('id-ID')}</small> : null}{pr.financeApproval?.rejectionReason && <small style={{ display: 'block', color: '#B91C1C' }}>{pr.financeApproval.rejectionReason}</small>}</td>
            <td style={{ padding: 10 }}>{pr.ownerApproval?.decision || 'Pending'}{pr.ownerApproval?.decidedAtUtc ? <small style={{ display: 'block', color: styles.secondary }}>{new Date(pr.ownerApproval.decidedAtUtc).toLocaleDateString('id-ID')}</small> : null}{pr.ownerApproval?.rejectionReason && <small style={{ display: 'block', color: '#B91C1C' }}>{pr.ownerApproval.rejectionReason}</small>}</td>
            <td style={{ padding: 10, color: blocked ? '#B91C1C' : pr.isFullyApproved ? '#15803D' : '#A16207' }}>{blocked ? 'Blocked' : pr.isFullyApproved ? 'Fully approved' : 'Menunggu approval'}</td>
            <td style={{ padding: 10, whiteSpace: 'nowrap' }}>{canDecide ? <><button disabled={ownerApprovalSaving} onClick={() => void submitOwnerDecision(pr, 'Approved')} style={{ marginRight: 6, padding: '6px 8px', background: '#15803D', color: 'white', border: 0, borderRadius: 4 }}>Approve</button><button disabled={ownerApprovalSaving} onClick={() => { setOwnerRejectId(pr.id); setOwnerRejectReason(''); }} style={{ padding: '6px 8px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 4 }}>Reject</button></> : ownerPending && blocked ? 'Tidak dapat diproses: siklus diblokir' : 'Keputusan tersimpan'}</td>
          </tr>;
        })}</tbody>
      </table></div>}

      {ownerRejectId && <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', padding: 16 }}><div style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 8, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Tolak Purchase Request</h3><label htmlFor="owner-pr-reason">Alasan penolakan (wajib)</label><textarea id="owner-pr-reason" value={ownerRejectReason} onChange={event => setOwnerRejectReason(event.target.value)} style={{ display: 'block', width: '100%', minHeight: 100, margin: '10px 0', padding: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button disabled={ownerApprovalSaving} onClick={() => setOwnerRejectId(null)}>Batal</button><button disabled={ownerApprovalSaving || !ownerRejectReason.trim()} onClick={() => { const request = purchaseRequests.find(pr => pr.id === ownerRejectId); if (request) void submitOwnerDecision(request, 'Rejected', ownerRejectReason); }}>Konfirmasi Tolak</button></div>
      </div></div>}
    </section>
  );
}
