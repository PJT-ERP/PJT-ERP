import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode, Dispatch, SetStateAction } from "react";
import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus
} from "../data/mockData";
import { salesApi, CustomerDto, ProductDto, SalesOrderDto } from "../../services/salesApi";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { authApi } from "../../services/authApi";
import { productionApi } from "../../services/productionApi";
import { qcApi } from "../../services/qcApi";
import { financeApi } from "../../services/financeApi";
import { BACKEND_USER_IDS_BY_LOCAL_ID, isGuid, toBackendUserId } from "../../services/backendIds";

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  salesOrders: SalesOrder[];
  customers: Customer[];
  productCatalog: ProductDto[];
  users: User[];
  purchasingRequests: PurchasingRequest[];
  refreshBackendData: () => Promise<void>;
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>) => SalesOrder;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (code: string, updates: Partial<Customer>) => void;
  deleteCustomerMaster: (code: string) => void;
  addPurchasingRequest: (req: Omit<PurchasingRequest, 'id' | 'requestedAt' | 'requestedBy'>) => void;
  updatePurchasingStatus: (id: string, status: PurchasingStatus) => void;
  updatePurchasingRequest: (id: string, updates: Partial<PurchasingRequest>) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const AUTH_USER_KEY = "erp_current_username";
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_PROFILE_KEY = "auth_user";
const HAS_DEV_TOKEN = Boolean(import.meta.env.VITE_DEV_MASTER_TOKEN?.trim());

export interface StoredAuthUser {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
  department?: string;
  status?: string;
};

function restoreStoredUser(): User | null {
  try {
    const storedAuthUser = localStorage.getItem(AUTH_PROFILE_KEY);
    const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY) || HAS_DEV_TOKEN);

    if (storedAuthUser && hasToken) {
      return mapAuthProfileToUser(JSON.parse(storedAuthUser));
    }

    if (!localStorage.getItem(AUTH_TOKEN_KEY) && !HAS_DEV_TOKEN) {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => restoreStoredUser());
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductDto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [purchasingRequests, setPurchasingRequests] = useState<PurchasingRequest[]>([]);
  const [backendCustomerIdsByCode, setBackendCustomerIdsByCode] = useState<Record<string, string>>({});
  const pendingCustomersByCode = useRef<Record<string, Customer>>({});
  const [soCounter, setSoCounter] = useState(75);
  const [prCounter, setPrCounter] = useState(5);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const auth = await authApi.login(email, password);
      const user = mapAuthProfileToUser(auth);

      localStorage.setItem(AUTH_USER_KEY, user.username);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.warn("Backend login failed.", error);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_PROFILE_KEY);
      return false;
    }
  };

  const logout = () => {
    void authApi.logout();
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROFILE_KEY);
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    // If users array is empty, it probably hasn't been fetched yet.
    if (users.length === 0) {
      return;
    }

    // Use deep comparison to avoid infinite loops caused by new object references from backend fetch
    const latestUser = users.find(user => user.id === currentUser.id && user.isActive);
    if (!latestUser) {
      logout();
      return;
    }

    if (latestUser.username !== currentUser.username || latestUser.role !== currentUser.role || latestUser.name !== currentUser.name) {
      setCurrentUser(latestUser);
      // Update local storage so on reload they still have the latest profile
      localStorage.setItem(AUTH_USER_KEY, latestUser.username);
      
      const storedAuthUser = localStorage.getItem(AUTH_PROFILE_KEY);
      if (storedAuthUser) {
        try {
          const parsed = JSON.parse(storedAuthUser);
          parsed.email = latestUser.email;
          parsed.name = latestUser.name;
          parsed.roles = [latestUser.role]; // Simplified
          localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error("Failed to update stored auth profile", e);
        }
      }
    }
  }, [currentUser, users]);

  const refreshBackendData = useCallback(async () => {
    const shouldLoadPurchaseRequests = canLoadPurchaseRequests(currentUser?.role);
    const shouldLoadInvoices = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner" || currentUser?.role === "Sales";
    const [customersResult, productsResult, salesOrdersResult, purchaseRequestsResult, usersResult, invoicesResult] = await Promise.allSettled([
      salesApi.listCustomers(),
      salesApi.listProducts(),
      salesApi.listSalesOrders(),
      shouldLoadPurchaseRequests ? purchasingApi.listPurchaseRequests() : Promise.resolve<PurchaseRequestDto[]>([]),
      authApi.getUsers(),
      shouldLoadInvoices ? financeApi.listInvoices().catch(() => []) : Promise.resolve([])
    ]);

    if (customersResult.status === "fulfilled") {
      const backendCustomers = customersResult.value;
      setBackendCustomerIdsByCode(
        Object.fromEntries(backendCustomers.map(customer => [customer.code, customer.id])),
      );
      setCustomers(backendCustomers.map(mapCustomerDto));
    } else {
      console.warn("Customer seed data was not loaded.", customersResult.reason);
    }

    if (productsResult.status === "fulfilled") {
      setProductCatalog(productsResult.value.filter(product => product.isActive !== false));
    } else {
      console.warn("Product seed data was not loaded.", productsResult.reason);
    }

    let invoices: any[] = [];
    if (invoicesResult && invoicesResult.status === "fulfilled" && Array.isArray(invoicesResult.value)) {
      invoices = invoicesResult.value;
    }

    if (salesOrdersResult.status === "fulfilled") {
      const localUpdates = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
      
      setSalesOrders(salesOrdersResult.value.map(dto => {
        const base = mapSalesOrderDto(dto, invoices);
        const updates = localUpdates[base.id];
        if (updates) {
          // Hanya me-restore field spesifik yang murni disimpan secara lokal (seperti materials BOM)
          // Jangan me-restore status karena bisa override progress dari backend
          const updatedItems = updates.items ? base.items?.map(item => {
            const up = updates.items.find((i: any) => i.productId === item.productId || i.id === item.id);
            return up ? { ...item, unitPrice: up.unitPrice || 0 } : item;
          }) : base.items;

          let finalStatus = base.status;
          const finalEstimatedAmount = updates.estimatedAmount || base.estimatedAmount;

          return { 
            ...base, 
            status: finalStatus,
            materials: base.materials || updates.materials, 
            designLink: base.designLink || updates.designLink,
            estimatedAmount: finalEstimatedAmount,
            deadline: updates.deadline || base.deadline,
            items: updatedItems || base.items
          };
        }
        return base;
      }));
    } else {
      console.warn("Sales order seed data was not loaded.", salesOrdersResult.reason);
    }

    if (!shouldLoadPurchaseRequests) {
      setPurchasingRequests([]);
    } else if (purchaseRequestsResult.status === "fulfilled") {
      let mappedUsers: User[] = [];
      if (usersResult.status === "fulfilled") {
        mappedUsers = usersResult.value.map(dto => mapAuthProfileToUser({
          userId: dto.userId,
          email: dto.email,
          name: dto.name,
          roles: dto.roles,
          department: dto.department,
          status: dto.status,
        }));
      }
      setPurchasingRequests(purchaseRequestsResult.value.map(req => mapPurchaseRequestDto(req, mappedUsers)));
    } else {
      console.warn("Purchasing seed data was not loaded.", purchaseRequestsResult.reason);
    }

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value.map(dto => mapAuthProfileToUser({
        userId: dto.userId,
        email: dto.email,
        name: dto.name,
        roles: dto.roles,
        department: dto.department,
        status: dto.status,
      })));
    } else {
      console.warn("Users list was not loaded.", usersResult.reason);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser) {
      void refreshBackendData();
    }
  }, [currentUser, refreshBackendData]);

  const addSalesOrder = (data: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>): SalesOrder => {
    const next = soCounter + 1;
    setSoCounter(next);
    const newId = `SO-2026-${String(next).padStart(3, '0')}`;

    const so: SalesOrder = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Pending Design',
      createdBy: currentUser?.id ?? 'u1',
    };

    // Clear any previous local storage state for this specific ID
    // so it doesn't bleed into the newly created task if the counter has reset.
    const currentLocal = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
    if (currentLocal[newId]) {
      delete currentLocal[newId];
      localStorage.setItem('soLocalUpdates', JSON.stringify(currentLocal));
    }

    setSalesOrders(prev => [so, ...prev]);
    void syncCreateSalesOrder(so, customers, pendingCustomersByCode.current, backendCustomerIdsByCode, setBackendCustomerIdsByCode, setSalesOrders);
    return so;
  };

  const updateSalesOrder = (id: string, updates: Partial<SalesOrder>) => {
    setSalesOrders(prev => prev.map(so => so.id === id ? { ...so, ...updates } : so));
    const currentLocal = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
    currentLocal[id] = { ...(currentLocal[id] || {}), ...updates };
    localStorage.setItem('soLocalUpdates', JSON.stringify(currentLocal));
    const current = salesOrders.find(so => so.id === id);
    if (current) {
      void syncUpdateSalesOrder(current, updates, currentUser, users, setSalesOrders);
    }
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const tempId = `u${Date.now()}`;
    setUsers(prev => [...prev, { ...user, id: tempId }]);
    
    // Simpan ke backend
    authApi.createUser({
      name: user.name,
      email: user.email,
      password: (user as any).password || "DefaultPass123!",
      role: user.role,
      isActive: user.isActive
    }).then(created => {
      if (created) {
        setUsers(prev => prev.map(u => u.id === tempId ? { ...u, id: created.userId || tempId } : u));
      }
    });
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));

    // Update ke backend
    if (!id.startsWith('u')) {
      const currentUserData = users.find(u => u.id === id);
      if (currentUserData) {
        authApi.updateUser(id, {
          name: updates.name ?? currentUserData.name,
          email: updates.email ?? currentUserData.email,
          role: updates.role ?? currentUserData.role,
          isActive: updates.isActive ?? currentUserData.isActive,
          password: (updates as any).password // if it exists
        });
      }
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addCustomer = (customer: Customer) => {
    pendingCustomersByCode.current[customer.code] = customer;
    setCustomers(prev => [...prev, customer]);

    // Simpan ke backend agar tidak hilang saat refresh
    salesApi.createCustomer({
      code: customer.code,
      name: customer.name,
      address: customer.address,
      contactPerson: customer.contactPerson || customer.contact,
      email: customer.email,
      phone: customer.phone,
    }).then(created => {
      setBackendCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }).catch(err => {
      console.warn("Gagal simpan pelanggan ke backend", err);
      refreshBackendData();
    });
  };

  const updateCustomer = (code: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
    salesApi.updateCustomer(code, {
      name: updates.name || "",
      address: updates.address,
      contactPerson: updates.contactPerson || updates.contact,
      email: updates.email,
      phone: updates.phone,
      isActive: true
    }).catch(err => {
      console.warn("Gagal update pelanggan ke backend", err);
      refreshBackendData();
    });
  };

  const deleteCustomerMaster = (code: string) => {
    setCustomers(prev => prev.filter(c => c.code !== code));
    salesApi.deleteCustomer(code).catch(err => {
      console.warn("Gagal menghapus pelanggan dari backend", err);
      refreshBackendData();
    });
  };

  const addPurchasingRequest = (data: Omit<PurchasingRequest, 'id' | 'requestedAt' | 'requestedBy'>) => {
    const next = prCounter;
    setPrCounter(n => n + 1);
    const req: PurchasingRequest = {
      ...data,
      id: `MR-${String(next).padStart(3, '0')}`,
      requestedAt: new Date().toISOString().split('T')[0],
      requestedBy: currentUser?.id ?? 'u2',
    };
    setPurchasingRequests(prev => [req, ...prev]);
    void syncCreatePurchasingRequest(req, currentUser, salesOrders, users, setPurchasingRequests);
  };

  const updatePurchasingStatus = (id: string, status: PurchasingStatus) => {
    setPurchasingRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const current = purchasingRequests.find(pr => pr.id === id);
    if (current) {
      void syncUpdatePurchasingStatus(current, status, currentUser, users, setPurchasingRequests);
    }
  };

  const updatePurchasingRequest = (id: string, updates: Partial<PurchasingRequest>) => {
    setPurchasingRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const current = purchasingRequests.find(pr => pr.id === id);
    if (current) {
      void syncUpdatePurchasingRequest(current, updates, currentUser, setPurchasingRequests);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      salesOrders, customers, productCatalog, users, purchasingRequests,
      refreshBackendData,
      addSalesOrder, updateSalesOrder,
      addUser, updateUser, deleteUser,
      addCustomer, updateCustomer, deleteCustomerMaster,
      addPurchasingRequest, updatePurchasingStatus, updatePurchasingRequest,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

function mapAuthProfileToUser(profile: StoredAuthUser): User {
  const email = profile.email || "";
  const role = mapBackendRoleToUserRole(profile.roles?.[0] || profile.department);

  return {
    id: profile.userId || email || crypto.randomUUID(),
    name: profile.name || email || "ERP User",
    username: email,
    password: "",
    role,
    email,
    isActive: profile.status !== "Inactive",
  };
}

function mapBackendRoleToUserRole(role?: string | null): UserRole {
  const normalized = (role || "").replace(/[\s_-]/g, "").toLowerCase();

  switch (normalized) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "finance":
      return "Finance";
    case "purchasing":
      return "Purchasing";
    case "engineering":
    case "engineer":
    case "engineeringworker":
    case "engineeringreviewer":
      return "Engineering Worker";
    case "engineeringsupervisor":
    case "supervisorengineering":
      return "Engineering Supervisor";
    case "sales":
    default:
      return "Sales";
  }
}

function mapCustomerDto(customer: CustomerDto): Customer {
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

function canLoadPurchaseRequests(role?: UserRole | null) {
  return role === "Purchasing"
    || role === "Finance"
    || role === "Engineering Worker"
    || role === "Engineering Supervisor"
    || role === "Admin"
    || role === "Owner";
}

function mapSalesOrderDto(order: SalesOrderDto, invoices: any[] = []): SalesOrder {
  const primaryItem = order.items[0];

  return {
    id: order.soNumber || order.id,
    backendId: order.id,
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
    designLink: order.drawingFileUrl || order.designReference || undefined,
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
    pauseReason: (order as any).pauseReason || undefined,
    designApprovedAt: order.designApprovedAtUtc?.split("T")?.[0],
    assignedTo: order.productionWorkerUserId || undefined,
    assignedName: order.productionWorkerName || undefined,
    designAssignedTo: order.designWorkerUserId || undefined,
    designAssignedName: order.designWorkerName || undefined,
    notes: order.items.map(item => (item.notes && item.notes.startsWith('[')) ? null : item.notes).filter(Boolean).join("; ") || undefined,
    materials: (function () {
      try {
        if (primaryItem?.notes?.startsWith('[')) {
          return JSON.parse(primaryItem.notes);
        }
      } catch (e) { }
      return undefined;
    })(),
    backendDesignStatus: order.designStatus,
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productDescription,
      quantity: item.qty,
      unitPrice: (item as any).unitPrice || 0,
      unit: "PCS"
    }))
  };
}

function mapPurchaseRequestDto(request: PurchaseRequestDto, users?: User[]): PurchasingRequest {
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
      specification: item.size || item.notes || "",
      quantity: item.qty,
      unit: "PCS",
      supplierName: item.supplierName || undefined,
      estimatedPrice: item.estimatedPrice || undefined,
      totalPrice: item.totalPrice || undefined,
      purchaseStatus: item.purchaseStatus,
    })),
    urgency,
    notes: request.projectName || "",
    requestedBy: requestedByStr,
    requestedAt: request.requestDate,
    status: mapPurchasingStatus(request.status),
    supplier: request.items.map(item => item.supplierName).find(Boolean) || undefined,
    poNumber: request.items.map(item => item.poNumber).find(Boolean) || undefined,
    estimatedPrice: request.items.reduce((sum, item) => sum + (item.totalPrice || item.estimatedPrice || 0), 0) || undefined,
    expectedDelivery: request.items.map(item => item.expectedArrivalDate).find(Boolean) || undefined,
    receivedAt: request.items.map(item => item.receivedDate).find(Boolean) || undefined,
    rejectionReason: request.rejectionReason || request.supervisorRejectionReason || request.financeRejectionReason || undefined,
  };
}

function mapPurchasingStatus(status: string): PurchasingStatus {
  if (status === "Completed" || status === "FinanceApproved") return "Selesai";
  if (status === "Processing" || status === "SupervisorApproved") return "Diproses";
  if (status === "SupervisorRejected" || status === "FinanceRejected" || status === "Rejected") return "Ditolak";
  return "Pending";
}

function mapSalesOrderStatus(order: SalesOrderDto, invoices: any[] = []): SalesOrder["status"] {
  const qcDecisionLower = order.qcDecision?.toLowerCase()?.trim();
  if (order.status === "Completed" || qcDecisionLower === "pass" || qcDecisionLower === "go") {
    const invoice = invoices.find(inv => inv.salesOrderId === order.id || inv.salesOrderNumber === order.soNumber);
    if (!invoice || (invoice.status !== "Paid" && invoice.status !== "PAID")) {
      return "Waiting Payment";
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

  if (order.status === "Waiting Pricing" || (order.status === "Draft" && order.designStatus === "Approved")) {
    return "Waiting Pricing";
  }

  // Allow production to run in parallel with payment
  // if (order.status === "WaitingPayment" || order.status === "Menunggu Invoice DP" || order.status === "Menunggu Pembayaran") {
  //   return "Waiting Payment";
  // }

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

function mapQcDecision(decision?: string | null): SalesOrder["qcStatus"] | undefined {
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

function findLocalUserByBackendAssignment(
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

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

async function syncCreateSalesOrder(
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

async function syncUpdateSalesOrder(
  so: SalesOrder,
  updates: Partial<SalesOrder>,
  currentUser: User | null,
  allUsers: User[],
  setSalesOrders: Dispatch<SetStateAction<SalesOrder[]>>,
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
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated) : item));
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
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated) : item));
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
      // Missing qcApi integration due to missing inspectionId logic
    }

    if (updates.customerDrawingUrl !== undefined) {
      try {
        const updated = await salesApi.updateCustomerDrawing(backendId, {
          customerDrawingUrl: updates.customerDrawingUrl,
          updatedByName: currentUser?.name || "System"
        });
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated) : item));
      } catch (err) {
        console.warn("Failed to update customer drawing URL in backend.", err);
        window.alert("Gagal menyimpan Referensi Desain ke sistem. Pastikan URL valid (awali dengan http/https).");
        // Revert local changes for customer drawing URL
        setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? { ...item, customerDrawingUrl: so.customerDrawingUrl } : item));
      }
    }
  } catch (error) {
    console.warn("Failed to sync sales order update to backend.", error);
  }
}

async function syncCreatePurchasingRequest(
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

async function syncUpdatePurchasingStatus(
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

async function syncUpdatePurchasingRequest(
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
