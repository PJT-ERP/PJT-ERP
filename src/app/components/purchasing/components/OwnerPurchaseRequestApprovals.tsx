import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useApp } from "../../context/AppContext";
import { PurchaseRequestDto, purchasingApi } from "../../../services/purchasingApi";
import { PrBudgetTab } from "../../finance/components/PurchasingApproval/PrBudgetTab";
import { mapPurchaseRequestToMr } from "../material-requests-page";

export function OwnerPurchaseRequestApprovals() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [search, setSearch] = useState("");
  const [ownerRejectId, setOwnerRejectId] = useState<string | null>(null);
  const [ownerRejectReason, setOwnerRejectReason] = useState("");
  const [ownerApprovalSaving, setOwnerApprovalSaving] = useState(false);
  const canReview = currentUser?.role === "Owner" || currentUser?.role === "Admin";

  const fetchPurchaseRequests = useCallback(async () => {
    try { setPurchaseRequests(await purchasingApi.listPurchaseRequests()); }
    catch (error) { console.error("Failed to load Purchase Request approvals.", error); }
  }, []);

  useEffect(() => {
    if (canReview) void fetchPurchaseRequests();
  }, [canReview, fetchPurchaseRequests]);

  const submitOwnerDecision = async (request: PurchaseRequestDto, decision: "Approved" | "Rejected", reason?: string) => {
    if (decision === "Rejected" && !reason?.trim()) return;
    setOwnerApprovalSaving(true);
    try {
      await purchasingApi.reviewPurchaseRequestOwnerApproval(request.id, {
        decision,
        ...(decision === "Rejected" ? { rejectionReason: reason!.trim() } : {})
      });
      setOwnerRejectId(null);
      setOwnerRejectReason("");
      await Promise.all([
        fetchPurchaseRequests(),
        queryClient.invalidateQueries({ queryKey: ["purchasingData"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasingRequests"] }),
      ]);
    } catch (error) {
      console.error("Failed to submit Owner Purchase Request approval.", error);
      alert("Gagal memproses persetujuan Purchase Request.");
    } finally { setOwnerApprovalSaving(false); }
  };

  const activeRequests = useMemo(() => purchaseRequests.filter(pr => pr.activeApprovalCycleNumber != null && pr.ownerApproval?.decision), [purchaseRequests]);
  const activeMrs = useMemo(() => activeRequests.map(mapPurchaseRequestToMr), [activeRequests]);
  const filteredMrs = useMemo(() => {
    const term = search.toLowerCase();
    return activeMrs.filter(mr => mr.id.toLowerCase().includes(term)
      || mr.department.toLowerCase().includes(term)
      || mr.requestor.toLowerCase().includes(term)
      || (mr.soRef || "").toLowerCase().includes(term));
  }, [activeMrs, search]);

  if (!canReview) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Approval Purchase Request</h2>
        <p className="mt-1 text-xs text-slate-500">Persetujuan Owner berjalan paralel dengan Finance. Kedua persetujuan diperlukan sebelum PR siap untuk PO.</p>
      </div>
      <PrBudgetTab
        filteredMrs={filteredMrs}
        search={search}
        setSearch={setSearch}
        onRowClick={mr => navigate(`/erp/purchasing/requests/${mr.backendId}`)}
        renderActions={mr => {
          const request = activeRequests.find(pr => pr.id === mr.backendId);
          if (!request) return null;
          const blocked = request.isApprovalBlocked === true;
          const ownerPending = request.ownerApproval?.decision === "Pending";
          const canDecide = (currentUser?.role === "Owner" || currentUser?.role === "Admin") && ownerPending && !blocked;
          if (canDecide) return <>
            <button type="button" disabled={ownerApprovalSaving} onClick={() => void submitOwnerDecision(request, "Approved")} className="mr-1 rounded bg-green-700 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={ownerApprovalSaving} onClick={() => { setOwnerRejectId(request.id); setOwnerRejectReason(""); }} className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Reject</button>
          </>;
          if (ownerPending && blocked) return <span className="text-xs text-red-700">Siklus diblokir</span>;
          return <span className="text-xs text-slate-500">Keputusan tersimpan</span>;
        }}
      />

      {ownerRejectId && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4"><div className="w-full max-w-md rounded-lg bg-white p-5">
        <h3 className="mt-0 font-semibold">Tolak Purchase Request</h3>
        <label htmlFor="owner-pr-reason" className="text-sm">Alasan penolakan (wajib)</label>
        <textarea id="owner-pr-reason" value={ownerRejectReason} onChange={event => setOwnerRejectReason(event.target.value)} className="my-2 block min-h-24 w-full rounded border border-slate-300 p-2" />
        <div className="flex justify-end gap-2"><button type="button" disabled={ownerApprovalSaving} onClick={() => setOwnerRejectId(null)}>Batal</button><button type="button" disabled={ownerApprovalSaving || !ownerRejectReason.trim()} onClick={() => { const request = purchaseRequests.find(pr => pr.id === ownerRejectId); if (request) void submitOwnerDecision(request, "Rejected", ownerRejectReason); }}>Konfirmasi Tolak</button></div>
      </div></div>}
    </section>
  );
}
