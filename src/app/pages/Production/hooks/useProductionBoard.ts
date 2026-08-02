import { useState, useEffect } from "react";
import { useApp } from "../../../components/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useFinanceData } from "../../../components/finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../../../components/so/invoice-sync";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";
import { productionApi } from "../../../services/productionApi";
import { purchasingApi } from "../../../services/purchasingApi";
import { isGuid, toBackendUserId } from "../../../services/backendIds";
import { getBackendSalesOrderId, getMaterialOptions, SystemMessage } from "../../../components/production/ProductionHelpers";
import { SalesOrder } from "../../../components/data/mockData";
import { mapSalesOrderDto } from "../../../components/context/hooks/dataMappers";
import type { SalesOrderDto } from "../../../services/salesApi";

import { useSalesOrdersQuery, usePurchasingRequestsQuery } from "../../../services/queries";

export function useProductionBoard() {
  const { currentUser, users } = useApp();
  const queryClient = useQueryClient();
  const { data: salesOrders = [] } = useSalesOrdersQuery();
  const { data: purchasingRequests = [] } = usePurchasingRequestsQuery();
  const canReadFinanceData = currentUser?.role === "Finance"
    || currentUser?.role === "Admin"
    || currentUser?.role === "Owner"
    || currentUser?.role === "Sales";
  const { invoices } = useFinanceData(canReadFinanceData);

  const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

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
  const [localMaterialRequestSoIds, setLocalMaterialRequestSoIds] = useState<Set<string>>(() => new Set());
  
  const [inventory, setInventory] = useState<InventoryItemDto[]>([]);
  const [productionQueues, setProductionQueues] = useState<any>({
    pendingAssignment: [],
    readyToStart: [],
    inProduction: [],
    waitingQc: [],
    pendingDesign: []
  });
  
  useEffect(() => {
    masterDataApi.listInventory().then(setInventory).catch(console.error);
    Promise.all([
      productionApi.getProductionBoardQueues(),
      productionApi.getEngineeringQueues()
    ]).then(([prodQueues, engQueues]) => {
      setProductionQueues({
        pendingAssignment: (prodQueues.pendingAssignment || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        readyToStart: (prodQueues.readyToStart || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        inProduction: (prodQueues.inProduction || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        paused: (prodQueues.paused || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        waitingQc: (prodQueues.waitingQc || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        pendingDesign: (engQueues.pendingDesign || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
      });
    }).catch(console.error);
  }, [salesOrders, currentUser]);

  const checkMaterialShortage = (so: SalesOrder) => {
    const materials = getMaterialOptions(so);
    if (!materials || materials.length === 0) return false;
    
    return materials.some(m => {
      const invItem = inventory.find(inv => 
        inv.name?.toLowerCase() === m.itemName.toLowerCase()
      );
      const reqQty = m.quantity ?? 0;
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
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
    } catch (error: unknown) {
      console.warn("Failed to resume production in backend.", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const backendMsg = axiosError?.response?.data?.message;
      alert(backendMsg ? `Gagal resume produksi: ${backendMsg}` : "Gagal resume produksi di backend.");
    }
  };



  const getMaterialRequest = (so: SalesOrder) => {
    const backendId = getBackendSalesOrderId(so);
    return purchasingRequests.slice().reverse().find(request =>
      request.salesOrderId === backendId ||
      request.salesOrderId === so.backendId ||
      request.soId === so.id ||
      request.soId === so.soNumber
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

  const sortByDeadline = (a: SalesOrder, b: SalesOrder) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  };

  const backendPendingAssignment = (productionQueues?.pendingAssignment || []).map((so: any) => mergeSalesOrderInvoice(so, invoices));
  const pendingMaterialPrep = backendPendingAssignment.filter((so: SalesOrder) => !checkMaterialComplete(so)).sort(sortByDeadline);
  const pendingAssignment = backendPendingAssignment.filter((so: SalesOrder) => checkMaterialComplete(so)).sort(sortByDeadline);
  const readyToStart = (productionQueues?.readyToStart || []).map((so: any) => mergeSalesOrderInvoice(so, invoices)).sort(sortByDeadline);
  const inProduction = (productionQueues?.inProduction || []).map((so: any) => mergeSalesOrderInvoice(so, invoices)).sort(sortByDeadline);
  const waitingQC = (productionQueues?.waitingQc || []).map((so: any) => mergeSalesOrderInvoice(so, invoices)).sort(sortByDeadline);
  const pendingDesign = (productionQueues?.pendingDesign || []).map((so: any) => mergeSalesOrderInvoice(so, invoices)).sort(sortByDeadline);

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
      queryClient.invalidateQueries({ queryKey: ['purchasingRequests'] });
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
      queryClient.invalidateQueries({ queryKey: ['purchasingRequests'] });
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
      queryClient.invalidateQueries({ queryKey: ['purchasingRequests'] });
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

  return {
    isSupervisor,
    currentUser,
    users,
    assignModal, setAssignModal,
    startModal, setStartModal,
    completeModal, setCompleteModal,
    pauseModal, setPauseModal,
    reviewMrModal, setReviewMrModal,
    detailModal, setDetailModal,
    returnToSpvModal, setReturnToSpvModal,
    rejectModal, setRejectModal,
    systemMessage, setSystemMessage,
    notifiedSoIds, setNotifiedSoIds,
    pendingMaterialPrep,
    pendingAssignment,
    readyToStart,
    inProduction,
    waitingQC,
    pendingDesign,
    checkMaterialShortage,
    getMaterialRequestState,
    handleResume,
    approveMaterialRequest,
    rejectMaterialRequest,
    rememberMaterialRequest
  };
}
