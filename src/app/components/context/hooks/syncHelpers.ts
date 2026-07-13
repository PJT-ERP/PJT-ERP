import { Dispatch, SetStateAction } from "react";
import { SalesOrder, Customer, User, PurchasingRequest, PurchasingStatus } from "../../data/mockData";
import { salesApi, ProductDto } from "../../../services/salesApi";
import { purchasingApi } from "../../../services/purchasingApi";
import { productionApi } from "../../../services/productionApi";
import { qcApi } from "../../../services/qcApi";
import { isGuid, toBackendUserId, BACKEND_USER_IDS_BY_LOCAL_ID } from "../../../services/backendIds";
import { mapSalesOrderDto, mapPurchaseRequestDto } from "./dataMappers";

export async function syncCreateSalesOrder(
  so: SalesOrder,
  customers: Customer[],
  pendingCustomersByCode: Record<string, Customer>,
  customerIdsByCode: Record<string, string>,
  setCustomerIdsByCode: Dispatch<SetStateAction<Record<string, string>>>,
  setSalesOrders: Dispatch<SetStateAction<SalesOrder[]>>,
) {
  try {
    let customerId = customerIdsByCode[so.customerId];
    let customer = customers.find(item => item.code === so.customerId) || pendingCustomersByCode[so.customerId];

    if (!customerId) {
      if (!customer) return;
      const created = await salesApi.createCustomer({
        code: customer.code,
        name: customer.name,
        address: customer.address,
        contactPerson: customer.contactPerson || customer.contact,
        email: customer.email || customer.contact,
        phone: customer.phone,
      });
      customerId = created.id;
      setCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }

    const createdSo = await salesApi.createSalesOrder({
      customerId,
      soDate: so.createdAt,
      targetDate: so.deadline,
      items: [
        {
          productId: "00000000-0000-0000-0000-000000000000",
          qty: so.quantity,
          unitPrice: (so as any).estimatedAmount ? (so as any).estimatedAmount / so.quantity : 0,
          notes: so.material,
        }
      ],
      customerDrawingUrl: so.designLink,
      designReference: so.designLink,
      designStatus: "PendingDesign",
    });

    setSalesOrders(prev => prev.map(item => item.id === so.id ? mapSalesOrderDto(createdSo) : item));
  } catch (error) {
    console.warn("Failed to sync sales order to backend.", error);
  }
}

export async function syncUpdateSalesOrder(
  so: SalesOrder,
  updates: Partial<SalesOrder>,
  currentUser: User | null,
  allUsers: User[],
  setSalesOrders: Dispatch<SetStateAction<SalesOrder[]>>,
  productCatalog: ProductDto[] = [],
) {
  const backendId = so.backendId || so.id;
  if (!isGuid(backendId)) return;

  try {
    if (updates.assignedTo !== undefined) {
      const engineerId = isGuid(updates.assignedTo) ? updates.assignedTo : BACKEND_USER_IDS_BY_LOCAL_ID[updates.assignedTo] || null;
      const assignedUser = engineerId ? allUsers.find(user => user.id === engineerId) : null;
      if (engineerId && isGuid(engineerId)) {
        const updated = await salesApi.assignSalesOrderEngineers(backendId, {
          productionWorker: {
            userId: engineerId,
            name: assignedUser?.name || updates.assignedName || "Worker",
          }
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
      }
    }

    if (updates.designAssignedTo !== undefined) {
      const engineerId = isGuid(updates.designAssignedTo) ? updates.designAssignedTo : BACKEND_USER_IDS_BY_LOCAL_ID[updates.designAssignedTo] || null;
      const assignedUser = engineerId ? allUsers.find(user => user.id === engineerId) : null;
      if (engineerId && isGuid(engineerId)) {
        const updated = await salesApi.assignSalesOrderEngineers(backendId, {
          designWorker: {
            userId: engineerId,
            name: assignedUser?.name || updates.designAssignedName || "Worker",
          }
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
      }
    }

    if (updates.status === "In Production") {
      const workerId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID());
      const updated = await productionApi.startProduction(backendId, {
        workerUserId: workerId,
        workerName: currentUser?.name || "Production Worker"
      });
      setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? {
        ...item,
        status: 'In Production',
        startTime: updated.startedAtUtc?.split('T')?.[0] || item.startTime
      } : item));
    }

    if (updates.status === "QC") {
      const workerId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID());
      const updated = await productionApi.finishProduction(backendId, {
        workerUserId: workerId,
        workerName: currentUser?.name || "Production Worker"
      });
      setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? {
        ...item,
        status: 'QC',
        endTime: updated.finishedAtUtc?.split('T')?.[0] || item.endTime
      } : item));
    }

    if (updates.qcStatus === "Go" || updates.qcStatus === "NoGo") {
      try {
        const inspections = await qcApi.listInspections();
        const inspection = inspections.find(insp => insp.salesOrderNumber === so.id || insp.salesOrderNumber === so.soNumber);
        if (inspection && !inspection.decision) {
          await qcApi.uploadResult(inspection.id, {
            reviewerUserId: toBackendUserId(currentUser) || currentUser?.id || "",
            reviewerName: currentUser?.name || "QC Reviewer",
            productionPhotos: Array.isArray(updates.productionPhotos) ? updates.productionPhotos : updates.productionPhotos ? [updates.productionPhotos] : [],
            qcPhotos: Array.isArray(updates.qcPhotos) ? updates.qcPhotos : updates.qcPhotos ? [updates.qcPhotos] : [],
            notes: updates.qcNotes || null,
            decision: updates.qcStatus,
          });
          setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? {
            ...item,
            qcStatus: updates.qcStatus,
            qcAt: new Date().toISOString(),
            qcNotes: updates.qcNotes ?? item.qcNotes,
            qcPhotos: updates.qcPhotos ?? item.qcPhotos,
            productionPhotos: updates.productionPhotos ?? item.productionPhotos,
            ...(updates.qcStatus === "Go" ? { status: "Completed" as any, completedAt: new Date().toISOString().split('T')[0] } : {}),
          } : item));
        }
      } catch (err) {
        console.warn("Failed to sync QC result to backend.", err);
      }
    }

    if (updates.customerDrawingUrl !== undefined) {
      try {
        const updated = await salesApi.updateCustomerDrawing(backendId, {
          customerDrawingUrl: updates.customerDrawingUrl || "",
          updatedByName: currentUser?.name || "System"
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
      } catch (err) {
        console.warn("Failed to update customer drawing URL in backend.", err);
      }
    }

    if (updates.designLink !== undefined) {
      try {
        await productionApi.uploadEngineeringDrawing(backendId, {
          drawingFileUrl: updates.designLink,
          drawingRef: updates.designLink,
          uploadedByUserId: toBackendUserId(currentUser) || currentUser?.id || crypto.randomUUID(),
          uploaderName: currentUser?.name || "System"
        });
        // We do not overwrite context immediately here because updateSalesOrderItems or others might also run and map the latest DTO
      } catch (err) {
        console.warn("Failed to update design link in backend.", err);
      }
    }

    if (updates.backendDesignStatus === "RevisionRequired" || updates.status === "Revision Required") {
      try {
        const updated = await salesApi.updateSalesOrderDesignStatus(backendId, {
          designStatus: "RevisionRequired",
          reviewedByUserId: toBackendUserId(currentUser) || currentUser?.id,
          reviewerName: currentUser?.name || "System",
          notes: updates.rejectionReason || updates.notes
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
      } catch (err) {
        console.warn("Failed to update design status to RevisionRequired in backend.", err);
      }
    }

    if (updates.backendDesignStatus === "WaitingApproval" || updates.status === "Waiting Spv Approval") {
      try {
        const updated = await salesApi.updateSalesOrderDesignStatus(backendId, {
          designStatus: "WaitingApproval",
          reviewedByUserId: toBackendUserId(currentUser) || currentUser?.id,
          reviewerName: currentUser?.name || "System",
          notes: updates.notes || "Submitted for Review",
          designReference: updates.designLink && updates.designLink.trim() !== '' ? updates.designLink : undefined
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
      } catch (err) {
        console.warn("Failed to update design status to WaitingApproval in backend.", err);
      }
    }

    if (updates.materials !== undefined) {
      try {
        const primaryItem = so.items?.[0];
        if (primaryItem) {
          const updated = await salesApi.updateSalesOrderItems(backendId, {
            items: (so.items || []).map((it, idx) => ({
              salesOrderItemId: it.id,
              productId: it.productId,
              qty: it.quantity,
              unitPrice: (it as any).unitPrice || 0,
              notes: updates.bomsPerItem?.[it.id] ? JSON.stringify(updates.bomsPerItem[it.id]) : (idx === 0 && updates.materials ? JSON.stringify(updates.materials) : (it as any).notes)
            }))
          });
          setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated, [], productCatalog) : item));
        }
      } catch (err) {
        console.warn("Failed to update materials in backend.", err);
      }
    }
  } catch (error) {
    console.warn("Failed to sync sales order update to backend.", error);
  }
}

export async function syncCreatePurchasingRequest(
  req: PurchasingRequest,
  currentUser: User | null,
  salesOrders: SalesOrder[],
  users: User[],
  setPurchasingRequests: Dispatch<SetStateAction<PurchasingRequest[]>>,
) {
  try {
    const so = salesOrders.find(so => so.id === req.soId || so.soNumber === req.soId);

    const createdReq = await purchasingApi.createPurchaseRequest({
      requestDate: req.requestedAt,
      requestedByUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
      requesterName: currentUser?.name || "Purchasing User",
      salesOrderId: so?.backendId || so?.id,
      salesOrderNumber: so?.soNumber || req.soId,
      projectName: req.notes,
      items: req.items?.map(item => ({
        itemName: item.itemName,
        size: item.specification,
        qty: item.quantity,
        urgency: req.urgency,
      })) || [],
    });

    setPurchasingRequests(prev => prev.map(item => item.id === req.id ? mapPurchaseRequestDto(createdReq, users) : item));
  } catch (error) {
    console.warn("Failed to sync purchasing request to backend.", error);
  }
}

export async function syncUpdatePurchasingStatus(
  req: PurchasingRequest,
  status: PurchasingStatus,
  currentUser: User | null,
  users: User[],
  setPurchasingRequests: Dispatch<SetStateAction<PurchasingRequest[]>>,
) {
  const backendId = req.backendId || req.id;
  if (!isGuid(backendId)) return;

  try {
    const userId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID());
    const decision = status === "Ditolak" ? "Reject" : "Accept";

    let updated;
    if (currentUser?.role === "Engineering Supervisor" || currentUser?.role === "Owner") {
      updated = await purchasingApi.supervisorReviewPurchaseRequest(backendId, {
        reviewedByUserId: userId,
        decision,
        rejectionReason: req.rejectionReason,
      });
    } else if (currentUser?.role === "Finance" || currentUser?.role === "Admin") {
      updated = await purchasingApi.financeReviewPurchaseRequest(backendId, {
        reviewedByUserId: userId,
        decision,
        rejectionReason: req.rejectionReason,
      });
    } else {
      updated = await purchasingApi.reviewPurchaseRequest(backendId, {
        reviewedByUserId: userId,
        decision,
        rejectionReason: req.rejectionReason,
      });
    }

    setPurchasingRequests(prev => prev.map(item => item.backendId === backendId || item.id === req.id ? mapPurchaseRequestDto(updated, users) : item));
  } catch (error) {
    console.warn("Failed to sync purchasing status to backend.", error);
  }
}

export async function syncUpdatePurchasingRequest(
  req: PurchasingRequest,
  updates: Partial<PurchasingRequest>,
  currentUser: User | null,
  setPurchasingRequests: Dispatch<SetStateAction<PurchasingRequest[]>>,
) {
  const backendId = req.backendId || req.id;
  if (!isGuid(backendId)) return;

  try {
    // Basic catchall
  } catch (error) {
    console.warn("Failed to sync purchasing request update to backend.", error);
  }
}
