import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus
} from "../../data/mockData";
import { CustomerDto, ProductDto, SalesOrderDto } from "../../../services/salesApi";
import { PurchaseRequestDto } from "../../../services/purchasingApi";
import { BACKEND_USER_IDS_BY_LOCAL_ID } from "../../../services/backendIds";

export function mapCustomerDto(customer: CustomerDto): Customer {
  return {
    code: customer.code,
    name: customer.name,
    contact: customer.contactPerson || customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
    email: customer.email || "",
    contactPerson: customer.contactPerson || "",
  };
}

export function canLoadPurchaseRequests(role?: UserRole | null) {
  return role === "Purchasing"
    || role === "Finance"
    || role === "Engineering"
    || role === "Engineering Supervisor"
    || role === "Admin"
    || role === "Owner";
}

import { InventoryItemDto } from "../../../services/masterDataApi";

export function mapSalesOrderMaterials(order: SalesOrderDto, products: ProductDto[] = [], inventoryItems: InventoryItemDto[] = []): SalesOrder["materials"] {
  const legacyMaterials: any[] = [];
  const productsById = new Map(products.map(product => [product.id, product]));

  order.items.forEach(item => {
    const product = productsById.get(item.productId);
    // Process custom materials (notes) regardless of whether it has standard BOM
    if (item.notes?.startsWith("[")) {
      try {
        const parsed = JSON.parse(item.notes);
        if (Array.isArray(parsed)) {
          parsed.forEach((material, index) => {
            if (!material || typeof material !== "object") return;

            legacyMaterials.push({
              ...material,
              id: material.id || `${item.id}-legacy-${index}`,
            });
          });
        }
      } catch {
        // Keep older malformed notes from breaking the whole SO list.
      }
    }
  });

  const materialsByKey = new Map<string, any>();

  const overriddenInventoryItemIds = new Set<string>();

  // Add legacy materials
  legacyMaterials.forEach(legacy => {
    // Normalize inventoryItemId: repeat orders store it in `id`, manual entries use `inventoryItemId`
    const resolvedInvId = legacy.inventoryItemId || (legacy.id && !legacy.id.includes('-legacy-') ? legacy.id : undefined);

    // Try to find the item code from the products if it's missing
    if (!legacy.code && resolvedInvId) {
      for (const p of products) {
        const match = p.bomItems?.find(b => b.inventoryItemId === resolvedInvId);
        if (match?.inventoryItemCode) {
          legacy.code = match.inventoryItemCode;
          break;
        }
      }
      
      // If still missing, try to find it in the inventory items directly
      if (!legacy.code && inventoryItems.length > 0) {
        const invMatch = inventoryItems.find(inv => inv.id === resolvedInvId);
        if (invMatch?.code) {
          legacy.code = invMatch.code;
        }
      }
    }

    // Strip code prefix from name for legacy repeat orders that embedded it (e.g. "MAT-001 - S45C Round Bar")
    if (legacy.code && legacy.name) {
      const codePrefix = `${legacy.code} - `;
      if (legacy.name.startsWith(codePrefix)) {
        legacy.name = legacy.name.slice(codePrefix.length);
      }
    }

    if (resolvedInvId) {
      overriddenInventoryItemIds.add(resolvedInvId);
    }

    const specKey = legacy.spec || legacy.specification || "";
    const key = `${resolvedInvId || legacy.name}|${specKey}|${legacy.unit}`;
    const existing = materialsByKey.get(key);
    if (existing) {
      existing.quantity += Number(legacy.quantity || 0);
    } else {
      materialsByKey.set(key, { ...legacy, quantity: Number(legacy.quantity || 0) });
    }
  });

  order.items.forEach(item => {
    const product = productsById.get(item.productId);
    product?.bomItems?.forEach(bomItem => {
      // If the engineering team explicitly provided custom specs for this inventory item, skip the standard BOM entry
      if (overriddenInventoryItemIds.has(bomItem.inventoryItemId)) {
        return;
      }

      const itemQuantity = Number(item.qty || 0);
      const bomQuantity = Number(bomItem.quantity || 0);
      if (bomQuantity <= 0) return;

      const specKey = bomItem.inventoryItemCode || "";
      const key = `${bomItem.inventoryItemId || bomItem.inventoryItemName}|${specKey}|${bomItem.unit}`;
      const existing = materialsByKey.get(key);
      const quantity = bomQuantity * Math.max(itemQuantity, 1);

      if (existing) {
        existing.quantity += quantity;
        return;
      }

      materialsByKey.set(key, {
        id: `${item.id}-${bomItem.id || key}`,
        inventoryItemId: bomItem.inventoryItemId,
        name: bomItem.inventoryItemName,
        code: bomItem.inventoryItemCode,
        spec: "",
        specification: "",
        quantity,
        unit: bomItem.unit,
      });
    });
  });

  const materials = Array.from(materialsByKey.values());
  return materials.length > 0 ? materials : undefined;
}

export function mapBomsPerItem(order: SalesOrderDto): Record<string, any[]> {
  const bomsPerItem: Record<string, any[]> = {};
  order.items.forEach(item => {
    if (!item.notes?.startsWith("[")) {
      bomsPerItem[item.id] = [];
      return;
    }
    try {
      const parsed = JSON.parse(item.notes);
      if (Array.isArray(parsed)) {
        bomsPerItem[item.id] = parsed;
      } else {
        bomsPerItem[item.id] = [];
      }
    } catch {
      bomsPerItem[item.id] = [];
    }
  });
  return bomsPerItem;
}

export function mapSalesOrderDto(order: SalesOrderDto, invoices: any[] = [], products: ProductDto[] = [], inventoryItems: InventoryItemDto[] = []): SalesOrder {
  const primaryItem = order.items[0];
  const materials = mapSalesOrderMaterials(order, products, inventoryItems);
  const bomsPerItem = mapBomsPerItem(order);

  return {
    id: order.soNumber || order.id,
    backendId: order.id,
    backendStatus: order.status,
    soNumber: order.soNumber,
    customerId: order.customerCode,
    customerName: order.customerName || order.customerCode,
    customerEmail: order.customerEmail || "",
    customerDrawingUrl: order.customerDrawingUrl || "",
    partNumber: primaryItem?.productPartNumber || "-",
    description: primaryItem?.productDescription || order.soNumber,
    quantity: order.items.reduce((sum, item) => sum + item.qty, 0),
    unit: "PCS",
    material: (primaryItem?.notes?.startsWith('[')) ? undefined : (primaryItem?.notes || undefined),
    deadline: order.targetDate || order.soDate,
    status: mapSalesOrderStatus(order, invoices),
    createdBy: "backend",
    createdAt: order.soDate,
    designReference: order.designReference,
    designId: order.designReference === "INTERNAL_DESIGN" ? "none" : (order.designStatus === "PendingDesign" ? "customer" : undefined),
    designLink: order.drawingFileUrl || (order.designReference && order.designReference !== "INTERNAL_DESIGN" ? order.designReference : undefined) || order.customerDrawingUrl || undefined,
    startTime: order.startedAtUtc || undefined,
    endTime: order.finishedAtUtc || undefined,
    qcStatus: mapQcDecision(order.qcDecision),
    qcAt: order.finishedAtUtc || undefined,
    designRevisions: order.designRevisions?.map((r: any) => ({
      version: r.version,
      url: r.url,
      changedBy: r.changedBy,
      changedAt: r.changedAtUtc
    })),
    completedAt: order.status === "Completed" ? order.finishedAtUtc?.split("T")?.[0] : undefined,
    qcPhotos: order.qcPhotos || undefined,
    productionPhotos: order.productionPhotos || undefined,
    estimatedAmount: order.estimatedAmount ?? order.items.reduce((sum, item) => sum + ((item as any).unitPrice || 0) * (item.qty || 0), 0) ?? undefined,
    pauseReason: (order as any).pauseReason || undefined,
    rejectionReason: (order as any).rejectionReason || undefined,
    designApprovedAt: order.designApprovedAtUtc?.split("T")?.[0],
    assignedTo: order.productionWorkerUserId || undefined,
    assignedName: order.productionWorkerName || undefined,
    designAssignedTo: order.designWorkerUserId || undefined,
    designAssignedName: order.designWorkerName || undefined,
    notes: order.items.map(item => (item.notes && item.notes.startsWith('[')) ? null : item.notes).filter(Boolean).join("; ") || undefined,
    materials,
    bomsPerItem,
    backendDesignStatus: order.designStatus,
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productDescription,
      partNumber: item.productPartNumber,
      productPartNumber: item.productPartNumber,
      quantity: item.qty,
      unitPrice: (item as any).unitPrice || 0,
      unit: "PCS",
      notes: item.notes,
      designReference: item.designReference || undefined,
      customerDrawingUrl: item.customerDrawingUrl || undefined
    }))
  };
}

export function mapPurchaseRequestDto(request: PurchaseRequestDto, users?: User[]): PurchasingRequest {
  const firstItem = request.items[0];
  const urgency: PurchasingRequest["urgency"] = request.items.some(item => item.urgency === "Critical")
    ? "Critical"
    : request.items.some(item => item.urgency === "Urgent")
      ? "Urgent"
      : "Normal";

  let requestedByStr = request.requesterName || request.requestedByUserId;
  if (users && request.requestedByUserId && !request.requesterName) {
    const user = findLocalUserByBackendAssignment(request.requestedByUserId, null, users);
    if (user) {
      requestedByStr = user.name;
    }
  }

  return {
    id: request.prNumber,
    backendId: request.id,
    backendStatus: request.status,
    soId: request.salesOrderNumber || undefined,
    salesOrderId: request.salesOrderId || undefined,
    itemName: request.items.length === 1 ? firstItem?.itemName || "-" : `${request.items.length} item material`,
    specification: request.items.map(item => item.itemName).join(", "),
    quantity: firstItem?.qty || request.items.length,
    unit: "PCS",
    items: request.items.map(item => ({
      itemId: item.id,
      materialRequirementId: item.materialRequirementId || null,
      salesOrderId: item.salesOrderId || request.salesOrderId || null,
      salesOrderNumber: item.salesOrderNumber || request.salesOrderNumber || null,
      projectName: item.projectName || request.projectName || null,
      purchaseCategory: item.purchaseCategory || null,
      itemName: item.itemName,
      specification: item.size || "",
      quantity: item.qty,
      unit: "PCS",
      supplierName: item.supplierName && item.supplierName !== "-" ? item.supplierName : undefined,
      estimatedPrice: item.estimatedPrice || undefined,
      totalPrice: item.totalPrice || undefined,
      purchaseStatus: item.purchaseStatus,
    })),
    urgency,
    notes: request.items.map(i => i.notes).find(Boolean) || "",
    requestedBy: requestedByStr,
    requestedByUserId: request.requestedByUserId,
    requestedAt: request.requestDate,
    status: mapPurchasingStatus(request.status),
    supplier: request.items.map(item => item.supplierName && item.supplierName !== "-" ? item.supplierName : undefined).find(Boolean) || undefined,
    poNumber: request.items.map(item => item.poNumber).find(Boolean) || undefined,
    estimatedPrice: request.items.reduce((sum, item) => sum + (item.totalPrice || item.estimatedPrice || 0), 0) || undefined,
    expectedDelivery: request.items.map(item => item.expectedArrivalDate).find(Boolean) || undefined,
    receivedAt: request.items.map(item => item.receivedDate).find(Boolean) || undefined,
    rejectionReason: request.rejectionReason || request.supervisorRejectionReason || request.financeRejectionReason || undefined,
  };
}

export function mapPurchasingStatus(status: string): PurchasingStatus {
  if (status === "Completed" || status === "FinanceApproved") return "Selesai";
  if (status === "Processing" || status === "SupervisorApproved") return "Diproses";
  if (status === "SupervisorRejected" || status === "FinanceRejected" || status === "Rejected") return "Ditolak";
  return "Pending";
}

export function mapSalesOrderStatus(order: SalesOrderDto, invoices: any[] = []): SalesOrder["status"] {
  const qcDecisionLower = order.qcDecision?.toLowerCase()?.trim();
  if (order.status === "Completed" || qcDecisionLower === "pass" || qcDecisionLower === "go") {
    if (invoices.length > 0) {
      const invoice = invoices.find(inv => inv.salesOrderId === order.id || inv.salesOrderNumber === order.soNumber);
      if (invoice && invoice.status !== "Paid" && invoice.status !== "PAID") {
        return "Waiting Payment";
      }
    }
    return "Completed";
  }

  if (order.status === "Cancelled" || order.designStatus === "Rejected") {
    return "Rejected";
  }

  // Pre-Sales/Design Phase overrides Draft/Waiting Pricing status
  if ((order.status === "Draft" || order.status === "Waiting Pricing") && order.designStatus !== "Approved") {
    switch (order.designStatus) {
      case "WaitingApproval":
        return "Waiting Spv Approval";
      case "RevisionRequired":
        return "Revision Required";
      default:
        return "Pending Design";
    }
  }

  // Allow production to run in parallel with pricing
  if (order.status === "Waiting Pricing" || (order.status === "Draft" && order.designStatus === "Approved")) {
    return "Waiting Pricing";
  }

  if (order.status === "WaitingPayment" || order.status === "Waiting Payment" || order.status === "Menunggu Invoice DP" || order.status === "Menunggu Pembayaran") {
    return "Waiting Payment";
  }

  if (order.productionStatus === "Finished") {
    return "QC";
  }

  if (order.productionStatus === "InProgress") {
    return "In Production";
  }

  if (order.productionStatus === "Paused") {
    return "Paused";
  }

  if (order.status === "InProduction" || order.status === "Confirmed") {
    return "Ready for Production";
  }

  switch (order.designStatus) {
    case "WaitingApproval":
      return "Waiting Approval";
    case "RevisionRequired":
      return "Revision Required";
    case "Approved":
      return "Ready for Production";
    case "Rejected":
      return "Rejected";
    default:
      return "Pending Design";
  }
}

export function mapQcDecision(decision?: string | null): SalesOrder["qcStatus"] | undefined {
  if (!decision) {
    return undefined;
  }

  if (decision.toLowerCase() === "go") {
    return "Go";
  }

  if (decision.toLowerCase() === "nogo" || decision.toLowerCase() === "no go") {
    return "NoGo";
  }

  return undefined;
}

export function findLocalUserByBackendAssignment(
  backendUserId?: string | null,
  backendUserName?: string | null,
  allUsers: User[] = []
): User | undefined {
  if (backendUserId) {
    const userById = allUsers.find(user => BACKEND_USER_IDS_BY_LOCAL_ID[user.id] === backendUserId || user.id === backendUserId);
    if (userById) {
      return userById;
    }
  }

  if (backendUserName) {
    return allUsers.find(user => user.name === backendUserName);
  }

  return undefined;
}

export function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}
