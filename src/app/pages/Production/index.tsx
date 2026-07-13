import React, { useState } from "react";
import { PlayCircle, PauseCircle, CheckSquare, Clock, Users, Package, FileWarning, ExternalLink, Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Edit2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../../components/context/AppContext";
import { PurchasingRequest, PurchasingUrgency, SalesOrder, getStatusColor } from "../../components/data/mockData";
import { productionApi } from "../../services/productionApi";
import { purchasingApi } from "../../services/purchasingApi";
import { salesApi } from "../../services/salesApi";
import { isGuid, toBackendUserId } from "../../services/backendIds";
import { useFinanceData } from "../../components/finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../../components/so/invoice-sync";
import { masterDataApi, InventoryItemDto } from "../../services/masterDataApi";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { PurchasingFormModal } from "../engineering/purchasing/PurchasingFormModal";
import {
  S, SystemMessage, StatusBadge, getDrawingUrl, getBackendSalesOrderId,
  MaterialOption, parseMaterialText, getMaterialOptions, DrawingLinks
} from "../../components/production/ProductionHelpers";
import { SystemMessageDialog } from "../../components/production/modals/SystemMessageDialog";
import { AssignOperatorModal } from "../../components/production/modals/AssignOperatorModal";
import { MaterialRequestModal } from "../../components/production/modals/MaterialRequestModal";
import { StartProductionModal } from "../../components/production/modals/StartProductionModal";
import { PauseProductionModal } from "../../components/production/modals/PauseProductionModal";
import { CompleteProductionModal } from "../../components/production/modals/CompleteProductionModal";
import { PaginationControl } from "../../components/production/PaginationControl";
import { MaterialReviewModal } from "../../components/production/modals/MaterialReviewModal";
import { ProductionDetailModal } from "../../components/production/modals/ProductionDetailModal";
import { ReturnToSpvModal } from "../../components/production/modals/ReturnToSpvModal";
function InlineBomDisplay({ so }: { so: SalesOrder }) {
  const materials = (so.materials && Array.isArray(so.materials) && so.materials.length > 0) ? so.materials : [];
  if (materials.length === 0) {
    return null;
  }
  return (
    <div style={{ marginTop: 12, borderRadius: 8, border: `1px solid ${S.border}`, background: "#F8FAFC", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "#F1F5F9", borderBottom: `1px solid ${S.border}`, fontSize: "11px", fontWeight: 600, color: S.slate, letterSpacing: "0.03em", textTransform: "uppercase" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Package size={13} style={{ color: S.cyan }} />
          <span>Informasi BOM & Kebutuhan Material ({materials.length} Item)</span>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "#FFFFFF", borderBottom: `1px solid ${S.border}`, color: S.secondary, fontSize: "11px" }}>
            <th style={{ padding: "6px 12px", fontWeight: 600 }}>Nama Material</th>
            <th style={{ padding: "6px 12px", fontWeight: 600 }}>Kode</th>
            <th style={{ padding: "6px 12px", fontWeight: 600 }}>Spesifikasi</th>
            <th style={{ padding: "6px 12px", fontWeight: 600, textAlign: "right" }}>Qty / Satuan</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m: any, idx: number) => (
            <tr key={idx} style={{ borderBottom: idx < materials.length - 1 ? `1px solid #E2E8F0` : "none", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
              <td style={{ padding: "8px 12px", fontWeight: 600, color: S.slate }}>
                {m.name || m.inventoryItemName || m.materialName || "-"}
              </td>
              <td style={{ padding: "8px 12px", color: S.secondary }}>
                {m.code || m.inventoryItemCode ? (
                  <span style={{ fontFamily: "monospace", fontSize: "11.5px", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, color: S.slate }}>
                    {m.code || m.inventoryItemCode}
                  </span>
                ) : (
                  <span style={{ color: "#94A3B8" }}>-</span>
                )}
              </td>
              <td style={{ padding: "8px 12px", color: S.secondary }}>
                {m.spec || m.specification ? (
                  <span style={{ fontFamily: "monospace", fontSize: "11.5px", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, color: S.slate }}>
                    {m.spec || m.specification}
                  </span>
                ) : (
                  <span style={{ color: "#94A3B8" }}>-</span>
                )}
              </td>
              <td style={{ padding: "8px 12px", fontWeight: 600, color: S.slate, textAlign: "right" }}>
                {m.quantity || m.qty || 0} <span style={{ color: S.secondary, fontWeight: 500 }}>{m.unit || 'pcs'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductionPage() {
  const { salesOrders, currentUser, users, purchasingRequests, customers, refreshBackendData } = useApp();
  const canReadFinanceData = currentUser?.role === "Finance"
    || currentUser?.role === "Admin"
    || currentUser?.role === "Owner"
    || currentUser?.role === "Sales";
  const { invoices } = useFinanceData(canReadFinanceData);
  const mergedSalesOrders = salesOrders.map(so => mergeSalesOrderInvoice(so, invoices));

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const currentBackendUserId = toBackendUserId(currentUser);

  const navigate = useNavigate();
  const [assignModal, setAssignModal] = useState<SalesOrder | null>(null);
  const [startModal, setStartModal] = useState<SalesOrder | null>(null);
  const [completeModal, setCompleteModal] = useState<SalesOrder | null>(null);
  const [pauseModal, setPauseModal] = useState<SalesOrder | null>(null);
  const [reviewMrModal, setReviewMrModal] = useState<SalesOrder | null>(null);
  const [detailModal, setDetailModal] = useState<SalesOrder | null>(null);
  const [returnToSpvModal, setReturnToSpvModal] = useState<SalesOrder | null>(null);
  const [rejectModal, setRejectModal] = useState<{ type: 'drawing' | 'mr', so: SalesOrder } | null>(null);
  const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(null);

  const handleResume = async (so: SalesOrder) => {
    const currentUserGuid = isGuid(currentUser?.id) ? currentUser!.id : toBackendUserId(currentUser);
    const assignedWorkerGuid = isGuid(so.assignedTo) ? so.assignedTo : null;
    const workerUserId = currentUserGuid || assignedWorkerGuid || "";

    const salesOrderId = getBackendSalesOrderId(so);
    if (!isGuid(salesOrderId) || !workerUserId) {
      alert("Gagal: SO ini belum sinkron dengan backend (ID tidak valid) atau user pekerja tidak valid.");
      return;
    }

    try {
      await productionApi.resumeProduction(salesOrderId, {
        workerUserId,
        workerName: currentUser?.name || so.assignedName || "Engineering",
      });
      await refreshBackendData();
    } catch (error: unknown) {
      console.warn("Failed to resume production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal resume produksi: ${backendMsg}` : "Gagal resume produksi di backend.");
    }
  };

  const [localMaterialRequestSoIds, setLocalMaterialRequestSoIds] = useState<Set<string>>(() => new Set());

  const itemsPerPage = 5;
  const [pagePending, setPagePending] = useState(1);
  const [pageMaterialPrep, setPageMaterialPrep] = useState(1);
  const [pageInProd, setPageInProd] = useState(1);
  const [pageWaitQC, setPageWaitQC] = useState(1);

  const isAssignedToCurrentUser = (so: SalesOrder) => !so.assignedTo || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId || isSupervisor;

  const isReadyForProd = (so: SalesOrder) => {
    if (so.status === 'Ready for Production') return true;
    if (so.startTime || (so as any).qcDecision) return false;
    if (so.backendDesignStatus === 'Approved' && ['Waiting Pricing', 'Waiting Payment', 'Pending Design', 'Waiting Approval'].includes(so.status)) return true;
    return false;
  };

  const pendingAssignment = mergedSalesOrders.filter(so => isReadyForProd(so) && !so.assignedTo);
  const materialPrep = mergedSalesOrders.filter(so => isReadyForProd(so) && !!so.assignedTo && isAssignedToCurrentUser(so));
  const inProduction = mergedSalesOrders.filter(so => (so.status === 'In Production' || so.status === 'Paused') && isAssignedToCurrentUser(so));
  const waitingQC = mergedSalesOrders.filter(so => so.status === 'QC');

  const getMaterialRequest = (so: SalesOrder) => {
    const backendId = getBackendSalesOrderId(so);
    return purchasingRequests.find(request =>
      request.salesOrderId === backendId ||
      request.salesOrderId === so.backendId ||
      request.soId === so.id ||
      request.soId === so.soNumber,
    );
  };

  const rememberMaterialRequest = (so: SalesOrder) => {
    const keys = [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)].filter(Boolean) as string[];
    setLocalMaterialRequestSoIds(prev => {
      const next = new Set(prev);
      keys.forEach(key => next.add(key));
      return next;
    });
  };

  const hasLocalMaterialRequest = (so: SalesOrder) =>
    [so.id, so.backendId, so.soNumber, getBackendSalesOrderId(so)]
      .filter(Boolean)
      .some(key => localMaterialRequestSoIds.has(key as string));

  const getMaterialRequestState = (so: SalesOrder): 'none' | 'requested' | 'finance_pending' | 'approved' | 'completed' | 'rejected' => {
    const request = getMaterialRequest(so);
    if (!request) return hasLocalMaterialRequest(so) ? 'requested' : 'none';
    if (request.backendStatus === 'SupervisorRejected' || request.backendStatus === 'FinanceRejected' || request.backendStatus === 'Rejected') return 'rejected';
    if (request.backendStatus === 'Completed' || request.status === 'Selesai') return 'completed';
    if (request.backendStatus === 'Processing' || request.backendStatus === 'FinanceApproved' || request.status === 'Diproses') return 'approved';
    if (request.backendStatus === 'SupervisorApproved') return 'finance_pending';
    if (request.status === 'Ditolak') return 'rejected';
    return 'requested';
  };

  const approveMaterialRequest = async (so: SalesOrder) => {
    const request = getMaterialRequest(so);
    const reviewerId = toBackendUserId(currentUser);

    if (!request?.backendId || !reviewerId) {
      setSystemMessage({
        tone: "error",
        title: "MR Belum Lengkap",
        message: "MR belum punya data backend lengkap untuk approval. Refresh data atau minta engineer submit ulang MR.",
      });
      return false;
    }

    if (request.backendStatus && request.backendStatus !== 'Submitted') {
      await refreshBackendData();
      if (request.backendStatus === 'SupervisorApproved') {
        setSystemMessage({
          tone: "info",
          title: "MR Sudah Disetujui",
          message: "MR ini sudah disetujui Supervisor dan sudah berada di antrian Purchasing.",
        });
        return false;
      }
      if (request.backendStatus === 'FinanceApproved' || request.backendStatus === 'Processing' || request.backendStatus === 'Completed') {
        setSystemMessage({
          tone: "info",
          title: "MR Sudah Diproses",
          message: "MR ini sudah melewati approval Supervisor dan sedang/selesai diproses Purchasing atau Finance.",
        });
        return false;
      }
      setSystemMessage({
        tone: "warning",
        title: "MR Tidak Bisa Di-approve",
        message: "MR tidak bisa di-approve pada status saat ini. Cek ulang status pengajuan di daftar MR.",
      });
      return false;
    }

    try {
      await purchasingApi.supervisorReviewPurchaseRequest(request.backendId, {
        reviewedByUserId: reviewerId,
        decision: 'Accept',
      });
      await refreshBackendData();
      setSystemMessage({
        tone: "success",
        title: "MR Disetujui Supervisor",
        message: "Permintaan material sudah diteruskan ke Purchasing untuk pengecekan supplier, harga, dan pembuatan PO.",
        steps: [
          "Purchasing membuka daftar MR dan mengisi supplier serta total harga.",
          "Purchasing membuat Purchase Order dari MR tersebut.",
          "Finance melakukan approval/pembayaran MR.",
          "Setelah Finance approve, status material menjadi lengkap.",
          "Engineer Worker bisa mulai produksi dari kartu SO terkait.",
        ],
      });
      return true;
    } catch (error) {
      console.warn("Failed to approve MR in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      setSystemMessage({
        tone: "error",
        title: "Gagal Approve MR",
        message: axiosError?.response?.data?.message || "Review MR gagal dikirim ke backend. Cek koneksi API atau status MR.",
      });
      return false;
    }
  };

  const rejectMaterialRequest = async (so: SalesOrder, reason: string) => {
    const request = getMaterialRequest(so);
    const reviewerId = toBackendUserId(currentUser);

    if (!request?.backendId || !reviewerId) {
      setSystemMessage({
        tone: "error",
        title: "MR Belum Lengkap",
        message: "MR belum punya data backend lengkap untuk penolakan.",
      });
      return false;
    }

    try {
      await purchasingApi.supervisorReviewPurchaseRequest(request.backendId, {
        reviewedByUserId: reviewerId,
        decision: 'Reject',
        rejectionReason: reason,
      });
      await refreshBackendData();
      setSystemMessage({
        tone: "success",
        title: "MR Ditolak",
        message: "Permintaan material telah ditolak dan dikembalikan ke Engineer Worker untuk direvisi.",
      });
      return true;
    } catch (error) {
      console.warn("Failed to reject MR in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      setSystemMessage({
        tone: "error",
        title: "Gagal Menolak MR",
        message: axiosError?.response?.data?.message || "Penolakan MR gagal dikirim ke backend.",
      });
      return false;
    }
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0, fontSize: "20px", fontWeight: 600 }}>Dasbor Produksi</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 4 }}>
            Kelola penugasan mesin, persiapan material, dan proses produksi berjalan
          </p>
        </div>
      </div>

      {isSupervisor && pendingAssignment.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Menunggu Penugasan Operator ({pendingAssignment.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).map((so, idx) => {
              const hasBom = so.materials && Array.isArray(so.materials) && so.materials.length > 0;
              const mrState = getMaterialRequestState(so);
              const hasMr = mrState !== 'none';
              const canAssignToOperator = hasBom && hasMr;

              return (
                <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 18px", borderBottom: idx < pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {!hasBom && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>⚠️ BOM Belum Dibuat</span>}
                      {!hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 600, border: "1px solid #FEF08A" }}>📦 Req Material Belum Diajukan</span>}
                      {hasBom && hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 600, border: "1px solid #BBF7D0" }}>✅ Prasyarat Produksi Lengkap</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <DrawingLinks so={so} />
                    <InlineBomDisplay so={so} />
                  </div>
                  {currentUser?.role !== 'Admin' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", paddingTop: 2 }}>
                      <button
                        onClick={() => setDetailModal(so)}
                        style={{ padding: "7px 12px", background: "#FFFFFF", border: `1px solid ${S.border}`, color: S.slate, borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        1. Kelola BOM & Material
                      </button>
                      <button
                        onClick={() => {
                          if (!canAssignToOperator) {
                            setSystemMessage({
                              tone: "error",
                              title: "Prasyarat Penugasan Belum Lengkap",
                              message: `Tidak dapat menugaskan operator produksi untuk ${so.id}! Anda (Supervisor) wajib menyelesaikan pembuatan BOM (${hasBom ? 'Sudah Ada' : 'Belum Ada'}) dan mengklik Ajukan Permintaan Material MR (${hasMr ? 'Sudah Diajukan' : 'Belum Diajukan'}) terlebih dahulu.`,
                            });
                          } else {
                            setAssignModal(so);
                          }
                        }}
                        style={{
                          padding: "8px 14px",
                          background: canAssignToOperator ? S.cyan : "#94A3B8",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        2. Tugaskan Operator Produksi
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <PaginationControl currentPage={pagePending} totalItems={pendingAssignment.length} itemsPerPage={itemsPerPage} onPageChange={setPagePending} />
        </div>
      )}

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Persiapan Material ({materialPrep.length})</span>
          </div>
        </div>
        {materialPrep.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada persiapan material</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              const mrState = getMaterialRequestState(so);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 18px", borderBottom: idx < materialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                      {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11.5px", background: operator !== "-" ? "#E0F2FE" : "#FEF2F2", color: operator !== "-" ? "#0369A1" : "#B91C1C", padding: "2px 8px", borderRadius: 6, border: `1px solid ${operator !== "-" ? "#7DD3FC" : "#FECACA"}`, fontWeight: 600 }}>
                        Ditugaskan ke: {operator}
                      </span>
                      <DrawingLinks so={so} />
                    </div>
                    <InlineBomDisplay so={so} />

                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingTop: 2 }}>
                    {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                      <button onClick={() => setReviewMrModal(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Review MR
                      </button>
                    )}
                    {(mrState === 'none' || ((so.isRework || so.qcStatus === 'NoGo') && mrState === 'completed')) && isSupervisor && currentUser?.role !== 'Admin' && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Material Kurang
                      </button>
                    )}
                    {mrState === 'rejected' && isSupervisor && currentUser?.role !== 'Admin' && (
                      <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                        style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Ajukan Ulang MR
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <button onClick={() => setReturnToSpvModal(so)}
                        style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileWarning size={14} /> Kembalikan ke SPV
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (mrState === 'none' || mrState === 'completed') && (
                      <button onClick={() => setStartModal(so)}
                        style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <PlayCircle size={14} /> Mulai Produksi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageMaterialPrep} totalItems={materialPrep.length} itemsPerPage={itemsPerPage} onPageChange={setPageMaterialPrep} />
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Sedang Diproduksi ({inProduction.length})</span>
          </div>
        </div>
        {inProduction.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang sedang beroperasi</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              let isLate = false;
              let daysLate = 0;
              let canFinish = true;
              if (so.deadline) {
                const todayStr = new Date().toISOString().split("T")[0];
                const deadlineStr = so.deadline.split("T")[0];
                const tDate = new Date(todayStr);
                const dDate = new Date(deadlineStr);
                if (tDate > dDate) {
                  isLate = true;
                  daysLate = Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
                }

                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
              }
              const mrState = getMaterialRequestState(so);

              return (
                <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 18px", borderBottom: idx < inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                      {isLate && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Telat {daysLate} Hari</span>}
                      {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                      {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                      {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                      {mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                      {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                      {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11.5px", background: operator !== "-" ? "#E0F2FE" : "#FEF2F2", color: operator !== "-" ? "#0369A1" : "#B91C1C", padding: "2px 8px", borderRadius: 6, border: `1px solid ${operator !== "-" ? "#7DD3FC" : "#FECACA"}`, fontWeight: 600 }}>
                        Ditugaskan ke: {operator}
                      </span>
                      {so.startTime && <span>· Mulai: {new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      <DrawingLinks so={so} />
                    </div>
                    <InlineBomDisplay so={so} />
                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingTop: 2 }}>
                    {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                      <button onClick={() => setReviewMrModal(so)}
                        style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                        Review MR
                      </button>
                    )}
                    {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                      <>
                        {so.status === 'Paused' ? (
                          <>
                            {so.pauseReason?.toLowerCase().includes("material") && (mrState === 'requested' || mrState === 'finance_pending' || mrState === 'approved') ? (
                              <button disabled title="Menunggu MR selesai diproses"
                                style={{ padding: "8px 16px", background: "#E5E7EB", color: "#9CA3AF", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                                <Clock size={14} /> Menunggu Material
                              </button>
                            ) : (
                              <button onClick={() => setStartModal(so)}
                                style={{ padding: "8px 16px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                <PlayCircle size={14} /> Lanjutkan Produksi
                              </button>
                            )}
                            {so.pauseReason?.toLowerCase().includes("material") && mrState === 'none' && (
                              <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                                style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                <Package size={14} /> Req. Material Kurang
                              </button>
                            )}
                            {so.pauseReason?.toLowerCase().includes("material") && mrState === 'rejected' && (
                              <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                                style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                <FileWarning size={14} /> Ajukan Ulang MR
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => setPauseModal(so)}
                            style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <PauseCircle size={14} /> Jeda Produksi
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (so.status === 'Paused') return;
                            setCompleteModal(so);
                          }}
                          style={{ padding: "8px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: so.status === 'Paused' ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: so.status === 'Paused' ? 0.5 : 1 }}>
                          <CheckSquare size={14} /> Selesai Produksi
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageInProd} totalItems={inProduction.length} itemsPerPage={itemsPerPage} onPageChange={setPageInProd} />
      </div>

      <div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Selesai Diproduksi & Menunggu QC ({waitingQC.length})</span>
            </div>
          </div>
          {waitingQC.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada produk yang selesai diproduksi & menunggu QC</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).map((so, idx) => {
                const customer = customers.find(c => c.code === so.customerId);
                return (
                  <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 18px", borderBottom: idx < waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none", background: "#F8FAFC" }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                      </div>
                      <p style={{ fontSize: "13px", color: S.slate, margin: "4px 0", fontWeight: 500 }}>{customer?.name} · {so.description}</p>
                      <InlineBomDisplay so={so} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationControl currentPage={pageWaitQC} totalItems={waitingQC.length} itemsPerPage={itemsPerPage} onPageChange={setPageWaitQC} />
        </div>
      </div>

      {assignModal && <AssignOperatorModal so={assignModal} onClose={() => setAssignModal(null)} />}

      {startModal && <StartProductionModal so={startModal} onClose={() => setStartModal(null)} onReturnToSpv={() => {
        setStartModal(null);
        setReturnToSpvModal(startModal);
      }} />}
      {completeModal && <CompleteProductionModal so={completeModal} onClose={() => setCompleteModal(null)} />}
      {pauseModal && <PauseProductionModal so={pauseModal} onClose={() => setPauseModal(null)} />}
      {reviewMrModal && (
        <MaterialReviewModal
          so={reviewMrModal}
          request={getMaterialRequest(reviewMrModal)}
          onClose={() => setReviewMrModal(null)}
          onApprove={() => approveMaterialRequest(reviewMrModal)}
          onReject={(reason) => rejectMaterialRequest(reviewMrModal, reason)}
        />
      )}
      {systemMessage && <SystemMessageDialog message={systemMessage} onClose={() => setSystemMessage(null)} />}
      
      {returnToSpvModal && (
        <ReturnToSpvModal so={returnToSpvModal} onClose={() => setReturnToSpvModal(null)} onSubmitted={() => setReturnToSpvModal(null)} />
      )}
      
      {detailModal && <ProductionDetailModal so={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  );
}
