import React, { useState } from "react";
import { PlayCircle, PauseCircle, CheckSquare, Clock, Users, Package, FileWarning, ExternalLink, Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Edit2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
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
  
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginTop: 12 }} onClick={e => e.stopPropagation()}>
       {/* Product Box */}
       <div style={{ flex: "0 0 280px", borderRadius: 8, border: `1px solid ${S.border}`, background: "#F8FAFC", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", padding: "12px" }}>
         <span style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: "10px" }}>Produk</span>
         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
           {so.items && so.items.length > 0 ? (
             so.items.map((item, i) => (
               <div key={i} style={{ 
                 background: "#FFFFFF", 
                 border: `1px solid ${S.border}`, 
                 borderRadius: "6px", 
                 padding: "10px 12px", 
                 display: "flex", 
                 flexDirection: "row",
                 justifyContent: "space-between",
                 alignItems: "center"
               }}>
                 <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{item.productName || "Custom Product"}</span>
                 {item.quantity && <span style={{ fontSize: "12px", fontWeight: 600, color: S.slate }}>{item.quantity} {item.unit}</span>}
               </div>
             ))
           ) : (
             (so.description || "").split(',').map((prod, i) => (
               <div key={i} style={{ 
                 background: "#FFFFFF", 
                 border: `1px solid ${S.border}`, 
                 borderRadius: "6px", 
                 padding: "10px 12px", 
                 display: "flex", 
                 flexDirection: "row",
                 justifyContent: "space-between",
                 alignItems: "center"
               }}>
                 <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{prod.trim()}</span>
               </div>
             ))
           )}
         </div>
       </div>


       {/* BOM Table */}
       <div style={{ flex: 1, borderRadius: 8, border: `1px solid ${S.border}`, background: "#F8FAFC", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "#F1F5F9", borderBottom: `1px solid ${S.border}`, fontSize: "11px", fontWeight: 600, color: S.slate, letterSpacing: "0.03em", textTransform: "uppercase" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
             <Package size={13} style={{ color: S.cyan }} />
             <span>Informasi BOM & Kebutuhan Material ({materials.length} Item)</span>
           </div>
         </div>
         {materials.length === 0 ? (
           <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: S.secondary, fontWeight: 500 }}>
             BOM Belum Dibuat
           </div>
         ) : (
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "#FFFFFF", borderBottom: `1px solid ${S.border}`, color: S.secondary, fontSize: "11px" }}>
            <th style={{ padding: "6px 12px", fontWeight: 600, width: "35%" }}>Nama Material</th>
            <th style={{ padding: "6px 12px", fontWeight: 600, width: "20%" }}>Kode</th>
            <th style={{ padding: "6px 12px", fontWeight: 600, width: "30%" }}>Spesifikasi</th>
            <th style={{ padding: "6px 12px", fontWeight: 600, textAlign: "right", width: "15%" }}>Qty / Satuan</th>
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
                  <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "11.5px" }}>Custom</span>
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
         )}
       </div>
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
  const [notifiedSoIds, setNotifiedSoIds] = useState<Set<string>>(new Set());
  const [reviewMrModal, setReviewMrModal] = useState<SalesOrder | null>(null);
  const [detailModal, setDetailModal] = useState<SalesOrder | null>(null);
  const [returnToSpvModal, setReturnToSpvModal] = useState<SalesOrder | null>(null);
  const [rejectModal, setRejectModal] = useState<{ type: 'drawing' | 'mr', so: SalesOrder } | null>(null);
  const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(null);

  const [inventory, setInventory] = React.useState<InventoryItemDto[]>([]);
  React.useEffect(() => {
    masterDataApi.listInventory().then(setInventory).catch(console.error);
  }, []);

  const checkMaterialShortage = (so: SalesOrder) => {
    const materials = getMaterialOptions(so);
    if (!materials || materials.length === 0) return false;
    
    return materials.some(m => {
      const invItem = inventory.find(inv => 
        inv.name?.toLowerCase() === m.itemName.toLowerCase() && 
        (!m.specification || inv.specification?.toLowerCase() === m.specification.toLowerCase())
      );
      const reqQty = (m.quantity ?? 0) * (so.quantity || 1);
      const stock = invItem?.currentStock ?? 0;
      return reqQty > 0 && stock < reqQty;
    });
  };

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
  const [pageReadyToStart, setPageReadyToStart] = useState(1);
  const [pageInProd, setPageInProd] = useState(1);
  const [pageWaitQC, setPageWaitQC] = useState(1);

  const isAssignedToCurrentUser = (so: SalesOrder) => !so.assignedTo || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId || isSupervisor;

  const isReadyForProd = (so: SalesOrder) => {
    if (so.status === 'Ready for Production') return true;
    if (so.startTime || (so as any).qcDecision) return false;
    if (so.backendDesignStatus === 'Approved' && ['Waiting Pricing', 'Waiting Payment', 'Pending Design', 'Waiting Approval'].includes(so.status)) return true;
    return false;
  };


  const getMaterialRequest = (so: SalesOrder) => {
    const backendId = getBackendSalesOrderId(so);
    return purchasingRequests.slice().reverse().find(request =>
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
    if (!request) {
      if (hasLocalMaterialRequest(so)) {
        return isSupervisor ? 'finance_pending' : 'requested';
      }
      return 'none';
    }
    if (request.backendStatus === 'SupervisorRejected' || request.backendStatus === 'FinanceRejected' || request.backendStatus === 'Rejected') return 'rejected';
    if (request.backendStatus === 'Completed' || request.status === 'Selesai') return 'completed';
    if (request.backendStatus === 'Processing' || request.backendStatus === 'FinanceApproved' || request.status === 'Diproses') return 'approved';
    if (request.backendStatus === 'SupervisorApproved') return 'finance_pending';
    if (request.status === 'Ditolak') return 'rejected';
    const reqBy = request.requestedBy || (request as any).requesterName || (request as any).requestor || "";
    const isSpvMade = reqBy.toLowerCase().includes('supervisor') || reqBy.toLowerCase().includes('spv') || reqBy === 'Admin' || reqBy === 'Owner' || isSupervisor;
    if (isSpvMade) return 'finance_pending';
    return 'requested';
  };

  const checkMaterialComplete = (so: SalesOrder) => {
    const hasBom = so.materials && Array.isArray(so.materials) && so.materials.length > 0;
    const isShortage = checkMaterialShortage(so);
    return hasBom && !isShortage;
  };

  const pendingMaterialPrep = mergedSalesOrders.filter(so => isReadyForProd(so) && !so.assignedTo && !checkMaterialComplete(so));
  const pendingAssignment = mergedSalesOrders.filter(so => isReadyForProd(so) && !so.assignedTo && checkMaterialComplete(so));
  const readyToStart = mergedSalesOrders.filter(so => isReadyForProd(so) && !!so.assignedTo && isAssignedToCurrentUser(so));
  const inProduction = mergedSalesOrders.filter(so => (so.status === 'In Production' || so.status === 'Paused') && isAssignedToCurrentUser(so));
  const waitingQC = mergedSalesOrders.filter(so => so.status === 'QC');

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

      {isSupervisor && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Package size={16} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Persiapan Material ({pendingMaterialPrep.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingMaterialPrep.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada pesanan pada tahap persiapan material</p>
              </div>
            ) : pendingMaterialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).map((so, idx) => {
              const hasBom = so.materials && Array.isArray(so.materials) && so.materials.length > 0;
              const isShortage = checkMaterialShortage(so);
              const mrState = getMaterialRequestState(so);
              const hasMr = mrState !== 'none';
              const mrReadyForAssignment = mrState === 'completed';
              const canAssignToOperator = hasBom && hasMr && mrReadyForAssignment;

              return (
                <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < pendingMaterialPrep.slice((pageMaterialPrep - 1) * itemsPerPage, pageMaterialPrep * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                        {!hasBom && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>BOM Belum Dibuat</span>}
                        {hasBom && isShortage && !hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Kekurangan Material - MR Belum Diajukan</span>}
                        {hasBom && mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 600, border: "1px solid #FCD34D" }}>Menunggu Review SPV</span>}
                        {hasBom && (mrState === 'finance_pending' || mrState === 'approved') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DBEAFE", color: "#1E40AF", borderRadius: 4, fontWeight: 600, border: "1px solid #BFDBFE" }}>Sedang Diproses Purchasing</span>}
                        {hasBom && mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#991B1B", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>MR Ditolak</span>}
                        {hasBom && isShortage && hasMr && mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 600, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                        <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                        <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                        <DrawingLinks so={so} />
                      </div>
                    </div>
                    {currentUser?.role !== 'Admin' && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {isSupervisor && mrState === 'requested' && (
                          <button onClick={(e) => { e.stopPropagation(); setReviewMrModal(so); }}
                            style={{ padding: "7px 12px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            Review MR
                          </button>
                        )}
                        {isShortage && (mrState === 'none' || ((so.isRework || so.qcStatus === 'NoGo') && mrState === 'completed')) && isSupervisor && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/production/mr/${so.id}`); }}
                            style={{ padding: "7px 12px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <FileWarning size={14} /> Material Kurang
                          </button>
                        )}
                        {mrState === 'rejected' && isSupervisor && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/production/mr/${so.id}`); }}
                            style={{ padding: "7px 12px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 6, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <FileWarning size={14} /> Ajukan Ulang MR
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <InlineBomDisplay so={so} />
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationControl currentPage={pageMaterialPrep} totalItems={pendingMaterialPrep.length} itemsPerPage={itemsPerPage} onPageChange={setPageMaterialPrep} />
        </div>
      )}


            {isSupervisor && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Menunggu Penugasan Operator ({pendingAssignment.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {pendingAssignment.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada pesanan yang menunggu penugasan operator</p>
              </div>
            ) : pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).map((so, idx) => {
              const hasBom = so.materials && Array.isArray(so.materials) && so.materials.length > 0;
              const mrState = getMaterialRequestState(so);
              const hasMr = mrState !== 'none';
              const isShortage = checkMaterialShortage(so);
              const canAssignToOperator = hasBom && !isShortage;

              return (
                <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < pendingAssignment.slice((pagePending - 1) * itemsPerPage, pagePending * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                        {!hasBom && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>BOM Belum Dibuat</span>}
                        {hasBom && isShortage && !hasMr && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Kekurangan Material - MR Belum Diajukan</span>}
                        {hasBom && mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 600, border: "1px solid #FCD34D" }}>Menunggu Review SPV</span>}
                        {hasBom && (mrState === 'finance_pending' || mrState === 'approved') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DBEAFE", color: "#1E40AF", borderRadius: 4, fontWeight: 600, border: "1px solid #BFDBFE" }}>Sedang Diproses Purchasing</span>}
                        {hasBom && mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#991B1B", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>MR Ditolak</span>}
                        {hasBom && isShortage && hasMr && mrState === 'completed' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 600, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                        {so.rejectionReason && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FFF7ED", color: "#9A3412", borderRadius: 4, fontWeight: 600, border: "1px solid #FED7AA" }}>Dikembalikan ke SPV</span>}
                        {canAssignToOperator && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 600, border: "1px solid #BBF7D0" }}>Material Lengkap - Siap Tugaskan</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                        <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                        <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                        <DrawingLinks so={so} />
                      </div>
                    </div>
                    {currentUser?.role !== 'Admin' && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAssignModal(so); }}
                          style={{
                            padding: "8px 14px",
                            background: S.cyan,
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
                          Tugaskan Operator
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <InlineBomDisplay so={so} />
                    {so.rejectionReason && (
                      <p style={{ fontSize: "12px", color: "#9A3412", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FFF7ED", borderRadius: 6, border: "1px solid #FED7AA" }}>
                        Dikembalikan: {so.rejectionReason}
                      </p>
                    )}
                  </div>
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
            <PlayCircle size={16} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "14px", fontWeight: 600 }}>Siap Mulai Produksi ({readyToStart.length})</span>
          </div>
        </div>
        {readyToStart.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.secondary, margin: "0", fontSize: "13.5px" }}>Tidak ada mesin yang siap mulai</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {readyToStart.slice((pageReadyToStart - 1) * itemsPerPage, pageReadyToStart * itemsPerPage).map((so, idx) => {
              const operator = users.find(u => u.id === so.assignedTo)?.name || so.assignedName || "-";
              const mrState = getMaterialRequestState(so);
              const isShortage = checkMaterialShortage(so);
              return (
                <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < readyToStart.slice((pageReadyToStart - 1) * itemsPerPage, pageReadyToStart * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                        {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                        {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                        {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                        {mrState === 'completed' && isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                        {mrState === 'completed' && !isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4, fontWeight: 500, border: "1px solid #7DD3FC" }}>Material Lengkap</span>}
                        {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                        {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                        <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                        <span>Operator: <strong style={{ color: S.slate }}>{operator}</strong></span>
                        <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                        <DrawingLinks so={so} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                        <button onClick={() => setReviewMrModal(so)}
                          style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Review MR
                        </button>
                      )}
                      {isShortage && (mrState === 'none' || ((so.isRework || so.qcStatus === 'NoGo') && mrState === 'completed')) && isSupervisor && currentUser?.role !== 'Admin' && (
                        <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                          style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          <FileWarning size={14} /> Material Kurang
                        </button>
                      )}
                      {mrState === 'rejected' && isSupervisor && currentUser?.role !== 'Admin' && (
                        <button onClick={() => navigate(`/erp/production/mr/${so.id}`)}
                          style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          <FileWarning size={14} /> Ajukan Ulang MR
                        </button>
                      )}
                      {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                        <button onClick={() => setReturnToSpvModal(so)}
                          style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          <FileWarning size={14} /> Kembalikan ke SPV
                        </button>
                      )}
                      {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                        <button onClick={() => {
                          if (mrState !== 'completed' && mrState !== 'none') {
                            setSystemMessage({
                              tone: "error",
                              title: "Material Belum Lengkap",
                              message: `Material untuk pesanan ini masih dalam proses (Status: ${mrState}). Tidak bisa memulai produksi sebelum material lengkap.`
                            });
                            return;
                          }
                          setStartModal(so);
                        }}
                          style={{ padding: "8px 16px", background: "#B91C1C", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          <PlayCircle size={14} /> Mulai Produksi
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <InlineBomDisplay so={so} />
                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PaginationControl currentPage={pageReadyToStart} totalItems={readyToStart.length} itemsPerPage={itemsPerPage} onPageChange={setPageReadyToStart} />
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
              const isShortage = checkMaterialShortage(so);

              return (
                <div key={so.id} style={{ display: "flex", flexDirection: "column", padding: "24px 18px", borderBottom: idx < inProduction.slice((pageInProd - 1) * itemsPerPage, pageInProd * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                        <StatusBadge status={so.status} />
                        {isLate && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 600, border: "1px solid #FECACA" }}>Telat {daysLate} Hari</span>}
                        {so.status === 'Paused' && so.pauseReason?.toLowerCase().includes("material") && (
                          <>
                            {mrState === 'requested' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>MR Menunggu Approval</span>}
                            {mrState === 'finance_pending' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF3C7", color: "#B45309", borderRadius: 4, fontWeight: 500, border: "1px solid #FCD34D" }}>MR Menunggu Purchasing</span>}
                            {mrState === 'approved' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>MR Diproses Purchasing</span>}
                            {mrState === 'completed' && isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF9C3", color: "#A16207", borderRadius: 4, fontWeight: 500, border: "1px solid #FEF08A" }}>Kekurangan Material - Stok Belum Masuk</span>}
                            {!isShortage && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 4, fontWeight: 500, border: "1px solid #BBF7D0" }}>Material Lengkap</span>}
                            {mrState === 'rejected' && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEE2E2", color: "#B91C1C", borderRadius: 4, fontWeight: 500, border: "1px solid #FCA5A5" }}>MR Ditolak</span>}
                          </>
                        )}
                        {(so.isRework || so.qcStatus === 'NoGo') && <span style={{ fontSize: "11px", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: 4, fontWeight: 500, border: "1px solid #FECACA" }}>Rework QC</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, flexWrap: "wrap" }}>
                        <span>Pelanggan: <strong style={{ color: S.slate }}>{so.customerName || so.customerId}</strong></span>
                        <span>Operator: <strong style={{ color: S.slate }}>{operator}</strong></span>
                        <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                        {so.startTime && <span>Mulai: <strong style={{ color: S.slate }}>{new Date(so.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>}
                        <DrawingLinks so={so} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {isSupervisor && mrState === 'requested' && currentUser?.role !== 'Admin' && (
                        <button onClick={() => setReviewMrModal(so)}
                          style={{ padding: "8px 16px", background: "#EAB308", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Review MR
                        </button>
                      )}
                      {so.status === 'Paused' && so.pauseReason?.toLowerCase().includes("material") && (
                        <>
                          {isShortage && !['requested', 'finance_pending', 'approved'].includes(mrState) && (isSupervisor || (!notifiedSoIds.has(so.id) && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId))) && (
                            <button 
                              onClick={() => {
                                if (isSupervisor) {
                                  navigate(`/erp/production/mr/${so.id}`);
                                } else {
                                  toast.success("Notifikasi telah dikirim ke Supervisor untuk membuat Material Request tambahan.", { duration: 4000 });
                                  setNotifiedSoIds(prev => new Set(prev).add(so.id));
                                }
                              }}
                              style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                              <Package size={14} /> Req. Material Tambahan
                            </button>
                          )}
                          {mrState === 'rejected' && (isSupervisor || (!notifiedSoIds.has(so.id) && (!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId))) && (
                            <button 
                              onClick={() => {
                                if (isSupervisor) {
                                  navigate(`/erp/production/mr/${so.id}`);
                                } else {
                                  toast.success("Notifikasi telah dikirim ke Supervisor untuk mengajukan ulang Material Request.", { duration: 4000 });
                                  setNotifiedSoIds(prev => new Set(prev).add(so.id));
                                }
                              }}
                              style={{ padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                              <FileWarning size={14} /> Ajukan Ulang MR
                            </button>
                          )}
                        </>
                      )}
                      {(!isSupervisor || so.assignedTo === currentUser?.id || so.assignedTo === currentBackendUserId) && (
                        <>
                          {so.status === 'Paused' ? (
                            <>
                              {so.pauseReason?.toLowerCase().includes("material") && isShortage ? (
                                <button disabled title="Menunggu material lengkap"
                                  style={{ padding: "8px 16px", background: "#E5E7EB", color: "#9CA3AF", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                                  <Clock size={14} /> Menunggu Material
                                </button>
                              ) : (
                                <button onClick={() => setStartModal(so)}
                                  style={{ padding: "8px 16px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                                  <PlayCircle size={14} /> Lanjutkan Produksi
                                </button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => setPauseModal(so)}
                              style={{ padding: "8px 16px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                              <PauseCircle size={14} /> Jeda Produksi
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (so.status === 'Paused') return;
                              setCompleteModal(so);
                            }}
                            style={{ padding: "8px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: so.status === 'Paused' ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: so.status === 'Paused' ? 0.5 : 1, whiteSpace: "nowrap" }}>
                            <CheckSquare size={14} /> Selesai Produksi
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                    <InlineBomDisplay so={so} />
                    {(so.isRework || so.qcStatus === 'NoGo') && so.qcNotes && (
                      <p style={{ fontSize: "12.5px", color: "#DC2626", margin: "6px 0 0", fontWeight: 500, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA", display: "inline-block" }}>
                        Catatan QC: {so.qcNotes}
                      </p>
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
                  <div key={so.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "24px 18px", borderBottom: idx < waitingQC.slice((pageWaitQC - 1) * itemsPerPage, pageWaitQC * itemsPerPage).length - 1 ? `1px dashed #CBD5E1` : "none", background: "#F8FAFC" }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setDetailModal(so)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: S.slate }}>{so.id} - {so.description}</span>
                        <StatusBadge status={so.status} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "12.5px", color: S.secondary, marginBottom: 8, flexWrap: "wrap" }}>
                        <span>Pelanggan: <strong style={{ color: S.slate }}>{customer?.name || so.customerId}</strong></span>
                        <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline}</strong></span>
                        <DrawingLinks so={so} />
                      </div>
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
      
      {detailModal && <ProductionDetailModal so={salesOrders.find(s => s.id === detailModal.id) || detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  );
}
