import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode, Dispatch, SetStateAction } from "react";
import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus, Quotation
} from "../data/mockData";
import { quotationApi, QuotationDto } from "../../services/quotationApi";
import { salesApi, CustomerDto, ProductDto, SalesOrderDto } from "../../services/salesApi";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { authApi } from "../../services/authApi";
import { productionApi } from "../../services/productionApi";
import { qcApi } from "../../services/qcApi";
import { BACKEND_USER_IDS_BY_LOCAL_ID, isGuid, toBackendUserId } from "../../services/backendIds";

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  customers: Customer[];
  productCatalog: ProductDto[];
  users: User[];
  purchasingRequests: PurchasingRequest[];
  refreshBackendData: () => Promise<void>;
  addQuotation: (q: Omit<Quotation, 'id' | 'createdAt' | 'createdBy'>) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>) => SalesOrder;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (code: string, updates: Partial<Customer>) => void;
  addPurchasingRequest: (req: Omit<PurchasingRequest, 'id' | 'requestedAt' | 'requestedBy'>) => void;
  updatePurchasingStatus: (id: string, status: PurchasingStatus) => void;
  updatePurchasingRequest: (id: string, updates: Partial<PurchasingRequest>) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const AUTH_USER_KEY = "erp_current_username";
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_PROFILE_KEY = "auth_user";
const HAS_DEV_TOKEN = Boolean(import.meta.env.VITE_DEV_MASTER_TOKEN?.trim());

type StoredAuthUser = {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
  department?: string;
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
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductDto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [purchasingRequests, setPurchasingRequests] = useState<PurchasingRequest[]>([]);
  const [backendCustomerIdsByCode, setBackendCustomerIdsByCode] = useState<Record<string, string>>({});
  const pendingCustomersByCode = useRef<Record<string, Customer>>({});
  const [qutCounter, setQutCounter] = useState(5);
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

    const latestUser = users.find(user => user.username === currentUser.username && user.isActive);
    if (!latestUser) {
      logout();
      return;
    }

    // Use deep comparison to avoid infinite loops caused by new object references from backend fetch
    if (latestUser.id !== currentUser.id || latestUser.role !== currentUser.role || latestUser.name !== currentUser.name) {
      setCurrentUser(latestUser);
    }
  }, [currentUser, users]);

  const refreshBackendData = useCallback(async () => {
    const shouldLoadPurchaseRequests = canLoadPurchaseRequests(currentUser?.role);
    const [customersResult, productsResult, quotationsResult, salesOrdersResult, purchaseRequestsResult, usersResult] = await Promise.allSettled([
      salesApi.listCustomers(),
      salesApi.listProducts(),
      quotationApi.list(),
      salesApi.listSalesOrders(),
      shouldLoadPurchaseRequests ? purchasingApi.listPurchaseRequests() : Promise.resolve<PurchaseRequestDto[]>([]),
      authApi.getUsers(),
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

    if (quotationsResult.status === "fulfilled") {
      const currentUsers = usersResult.status === "fulfilled" ? usersResult.value.map(dto => mapAuthProfileToUser({
        userId: dto.userId,
        email: dto.email,
        name: dto.name,
        roles: dto.roles,
        department: dto.department,
      })) : [];
      setQuotations(quotationsResult.value.map(q => mapQuotationDto(q, currentUsers)));
    } else {
      console.warn("Quotation seed data was not loaded.", quotationsResult.reason);
    }

    if (salesOrdersResult.status === "fulfilled") {
      const localUpdates = JSON.parse(localStorage.getItem('soLocalUpdates') || '{}');
      setSalesOrders(salesOrdersResult.value.map(dto => {
        const baseSo = mapSalesOrderDto(dto);
        if (localUpdates[baseSo.id]) {
          return { ...baseSo, ...localUpdates[baseSo.id] };
        }
        return baseSo;
      }));
    } else {
      console.warn("Sales order seed data was not loaded.", salesOrdersResult.reason);
    }

    if (!shouldLoadPurchaseRequests) {
      setPurchasingRequests([]);
    } else if (purchaseRequestsResult.status === "fulfilled") {
      setPurchasingRequests(purchaseRequestsResult.value.map(mapPurchaseRequestDto));
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

  const addQuotation = (data: Omit<Quotation, 'id' | 'createdAt' | 'createdBy'>): Quotation => {
    const next = qutCounter + 1;
    setQutCounter(next);
    const q: Quotation = {
      ...data,
      id: `QUT-2026-${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: data.status,
      createdBy: currentUser?.id ?? 'u1',
    };
    setQuotations(prev => [q, ...prev]);
    void syncCreateQuotation(q, customers, pendingCustomersByCode.current, backendCustomerIdsByCode, setBackendCustomerIdsByCode, setQuotations);
    return q;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    const current = quotations.find(q => q.id === id);
    if (current) {
      void syncUpdateQuotation(current, updates, currentUser, users, setQuotations, setSalesOrders);
    }
  };

  const addSalesOrder = (data: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>): SalesOrder => {
    const next = soCounter + 1;
    setSoCounter(next);
    const so: SalesOrder = {
      ...data,
      id: `SO-2026-${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Menunggu Invoice DP',
      createdBy: currentUser?.id ?? 'u1',
    };
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
    setUsers(prev => [...prev, { ...user, id: `u${Date.now()}` }]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
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
      contactPerson: customer.contact,
      email: customer.contact,
    }).then(created => {
      setBackendCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }).catch(err => {
      console.warn("Gagal menyimpan pelanggan ke backend", err);
    });
  };

  const updateCustomer = (code: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
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
    void syncCreatePurchasingRequest(req, currentUser, salesOrders, setPurchasingRequests);
  };

  const updatePurchasingStatus = (id: string, status: PurchasingStatus) => {
    setPurchasingRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const current = purchasingRequests.find(pr => pr.id === id);
    if (current) {
      void syncUpdatePurchasingStatus(current, status, currentUser, setPurchasingRequests);
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
      quotations, salesOrders, customers, productCatalog, users, purchasingRequests,
      refreshBackendData,
      addQuotation, updateQuotation,
      addSalesOrder, updateSalesOrder,
      addUser, updateUser, deleteUser,
      addCustomer, updateCustomer,
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
    isActive: true,
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
    contact: customer.email || customer.contactPerson || "",
    phone: customer.phone || "",
    address: customer.address || "",
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

function mapQuotationDto(quotation: QuotationDto, allUsers: User[]): Quotation {
  const primaryItem = quotation.items[0];
  const assignedUser = findLocalUserByBackendAssignment(
    quotation.assignedEngineerId,
    quotation.assignedEngineerName,
    allUsers
  );

  return {
    id: quotation.quotationNumber || quotation.id,
    backendId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    customerId: quotation.customerCode,
    productName: primaryItem?.productName || "-",
    description: primaryItem?.description || "",
    quantity: primaryItem?.quantity || 0,
    unit: primaryItem?.unit || "pcs",
    deadline: quotation.deadline,
    status: quotation.status,
    designId: quotation.designLink || primaryItem?.designLink || "",
    designLink: quotation.designLink || primaryItem?.designLink || "",
    estimatedAmount: quotation.estimatedAmount || 0,
    customerImageUrl: primaryItem?.customerImageUrl || "",
    createdBy: "backend",
    createdAt: quotation.createdAtUtc?.split("T")[0] || new Date().toISOString().split("T")[0],
    assignedTo: assignedUser?.id || quotation.assignedEngineerId || undefined,
    assignedName: quotation.assignedEngineerName || assignedUser?.name,
    assignedEngineerId: quotation.assignedEngineerId || undefined,
    assignedEngineerName: quotation.assignedEngineerName || undefined,
    revisions: quotation.revisions.map(revision => ({
      revNumber: revision.revisionNumber,
      amount: revision.amount,
      date: revision.date,
      notes: revision.notes || "",
    })),
    materials: quotation.bomItems.map(item => ({
      id: item.id || item.itemCode || item.name,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      spec: item.specification || "",
    })),
    lostReason: quotation.lostReason || undefined,
    notes: quotation.notes || undefined,
  };
}

function mapSalesOrderDto(order: SalesOrderDto): SalesOrder {
  const primaryItem = order.items[0];

  return {
    id: order.soNumber || order.id,
    backendId: order.id,
    soNumber: order.soNumber,
    customerId: order.customerCode,
    customerEmail: order.customerEmail || "",
    customerDrawingUrl: order.customerDrawingUrl || "",
    partNumber: primaryItem?.productPartNumber || "-",
    description: primaryItem?.productDescription || order.soNumber,
    quantity: order.items.reduce((sum, item) => sum + item.qty, 0),
    unit: "PCS",
    material: primaryItem?.notes || undefined,
    deadline: order.targetDate || order.soDate,
    status: mapSalesOrderStatus(order),
    createdBy: "backend",
    createdAt: order.soDate,
    designLink: order.drawingFileUrl || order.designReference || order.customerDrawingUrl || undefined,
    startTime: order.startedAtUtc || undefined,
    endTime: order.finishedAtUtc || undefined,
    qcStatus: mapQcDecision(order.qcDecision),
    qcAt: order.finishedAtUtc || undefined,
    completedAt: order.status === "Completed" ? order.finishedAtUtc?.split("T")[0] : undefined,
    designApprovedAt: order.designApprovedAtUtc?.split("T")[0],
    assignedTo: order.productionWorkerUserId || undefined,
    assignedName: order.productionWorkerName || undefined,
    notes: order.items.map(item => item.notes).filter(Boolean).join("; ") || undefined,
    backendDesignStatus: order.designStatus,
  };
}

function mapPurchaseRequestDto(request: PurchaseRequestDto): PurchasingRequest {
  const firstItem = request.items[0];
  const urgency: PurchasingRequest["urgency"] = request.items.some(item => item.urgency === "Critical")
    ? "Critical"
    : request.items.some(item => item.urgency === "Urgent")
      ? "Urgent"
      : "Normal";

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
      itemName: item.itemName,
      specification: item.size || item.notes || "",
      quantity: item.qty,
      unit: "PCS",
    })),
    urgency,
    notes: request.projectName || "",
    requestedBy: request.requestedByUserId,
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
  if (status === "Completed") return "Selesai";
  if (status === "Processing" || status === "FinanceApproved" || status === "SupervisorApproved") return "Diproses";
  if (status === "SupervisorRejected" || status === "FinanceRejected" || status === "Rejected") return "Ditolak";
  return "Pending";
}

function mapSalesOrderStatus(order: SalesOrderDto): SalesOrder["status"] {
  if (order.status === "Completed") {
    return "Completed";
  }

  if (order.status === "Cancelled" || order.designStatus === "Rejected") {
    return "Rejected";
  }

  // Pre-Sales/Design Phase overrides Draft status
  if (order.status === "Draft" && order.designStatus !== "Approved") {
    switch (order.designStatus) {
      case "WaitingApproval":
        return "Waiting Spv Approval";
      case "RevisionRequired":
        return "Revision Required";
      default:
        return "Pending Design";
    }
  }

  if (order.status === "Draft" && order.designStatus === "Approved") {
    return "Menunggu Invoice DP";
  }

  if (order.status === "WaitingPayment") {
    return "Menunggu Invoice DP";
  }

  if (order.productionStatus === "Finished") {
    return "QC";
  }

  if (order.productionStatus === "InProgress") {
    return "In Production";
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

async function syncCreateQuotation(
  quotation: Quotation,
  customers: Customer[],
  pendingCustomersByCode: Record<string, Customer>,
  customerIdsByCode: Record<string, string>,
  setCustomerIdsByCode: Dispatch<SetStateAction<Record<string, string>>>,
  setQuotations: Dispatch<SetStateAction<Quotation[]>>,
) {
  try {
    let customerId = customerIdsByCode[quotation.customerId];
    let customer = customers.find(item => item.code === quotation.customerId)
      || pendingCustomersByCode[quotation.customerId];

    if (!customerId) {
      if (!customer) {
        return;
      }

      const created = await salesApi.createCustomer({
        code: customer.code,
        name: customer.name,
        address: customer.address,
        contactPerson: customer.contact,
        email: customer.contact,
      });
      customerId = created.id;
      customer = mapCustomerDto(created);
      setCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }

    const createdQuotation = await quotationApi.create({
      customerId,
      deadline: quotation.deadline,
      notes: quotation.notes || null,
      customer: customer ? {
        code: customer.code,
        name: customer.name,
        email: customer.contact || null,
      } : null,
      items: [
        {
          productId: null,
          productName: quotation.productName,
          description: quotation.description,
          quantity: quotation.quantity,
          unit: quotation.unit,
          customerImageUrl: quotation.customerImageUrl || null,
          designLink: quotation.designId || quotation.designLink || null,
          bomItems: (quotation.materials || []).map(material => ({
            itemCode: material.id || null,
            name: material.name,
            specification: material.spec || material.specification || null,
            quantity: Number(material.quantity) || 1,
            unit: material.unit || "pcs",
          })),
        },
      ],
    });

    setQuotations(prev => prev.map(item => item.id === quotation.id ? mapQuotationDto(createdQuotation, []) : item));
  } catch (error) {
    console.warn("Failed to sync quotation to backend.", error);
  }
}

async function syncUpdateQuotation(
  quotation: Quotation,
  updates: Partial<Quotation>,
  currentUser: User | null,
  allUsers: User[],
  setQuotations: Dispatch<SetStateAction<Quotation[]>>,
  setSalesOrders: Dispatch<SetStateAction<SalesOrder[]>>,
) {
  const backendId = quotation.backendId || quotation.id;

  if (!isGuid(backendId)) {
    return;
  }

  try {
    if (updates.assignedTo !== undefined) {
      const assignedUser = allUsers.find(user => user.id === updates.assignedTo);
      const engineerId = toBackendUserId(assignedUser) || (isGuid(updates.assignedTo) ? updates.assignedTo : null);
      const engineerName = updates.assignedName || assignedUser?.name || quotation.assignedName || "Engineer";

      if (!engineerId) {
        console.warn("Failed to sync engineer assignment: missing backend engineer id.");
        return;
      }

      const updated = await quotationApi.assignEngineer(backendId, {
        engineerId,
        engineerName,
      });
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.status === "design_review") {
      const designLink = updates.designLink || updates.designId || quotation.designLink || quotation.designId || "";
      const materials = updates.materials || quotation.materials || [];
      const engineerId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : "");

      const updated = await quotationApi.submitDesign(backendId, {
        designLink,
        bomItems: materials.map(material => ({
          itemCode: material.id || null,
          name: material.name,
          specification: material.spec || material.specification || null,
          quantity: Number(material.quantity) || 1,
          unit: material.unit || "pcs",
        })),
        engineerId,
        engineerName: currentUser?.name || "Engineer",
      });
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.status === "waiting_pricing") {
      let updated: any;
      if (quotation.status === "design_review") {
        await quotationApi.approveSupervisorDesign(backendId);
        updated = await quotationApi.approveClientDesign(backendId);
      } else {
        updated = await quotationApi.approveClientDesign(backendId);
      }
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.estimatedAmount !== undefined && updates.status === "client_price_approval") {
      const updated = await quotationApi.submitPricing(backendId, {
        amount: updates.estimatedAmount,
        notes: updates.notes || null,
        financeUserId: toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID()),
        financeUserName: currentUser?.name || "Finance",
      });
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.status === "client_design_approval") {
      const updated = await quotationApi.approveClientDesign(backendId);
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.status === "pending_design") {
      const updated = await quotationApi.requestDesignRevision(backendId, {
        notes: updates.notes || "Client requested design revision.",
      });
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
      return;
    }

    if (updates.status === "won") {
      const wonQuotation = await quotationApi.markWon(backendId);
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(wonQuotation, allUsers) : item));

      const createdSalesOrder = await quotationApi.convertToSalesOrder(backendId, {
        dpPercentage: 50,
        dueDate: addDaysIso(new Date(), 7),
      });
      const mappedSalesOrder = mapSalesOrderDto(createdSalesOrder);
      setSalesOrders(prev => [
        mappedSalesOrder,
        ...prev.filter(item => item.backendId !== mappedSalesOrder.backendId && item.id !== mappedSalesOrder.id),
      ]);
      return;
    }

    if (updates.status === "lost") {
      const updated = await quotationApi.markLost(backendId, {
        reason: updates.lostReason || "Quotation lost.",
      });
      setQuotations(prev => prev.map(item => item.backendId === backendId || item.id === quotation.id ? mapQuotationDto(updated, allUsers) : item));
    }
  } catch (error) {
    console.warn("Failed to sync quotation update to backend.", error);
  }
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
        contactPerson: customer.contact,
        email: customer.contact,
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
      designStatus: "Approved",
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
      const assignedUser = allUsers.find(user => user.id === updates.assignedTo);
      const engineerId = toBackendUserId(assignedUser) || (isGuid(updates.assignedTo) ? updates.assignedTo : null);
      if (engineerId) {
        const updated = await salesApi.assignSalesOrderEngineers(backendId, {
           productionWorker: {
             userId: engineerId,
             name: assignedUser?.name || updates.assignedName || "Worker",
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
       setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated as any) : item));
    }

    if (updates.status === "QC") {
       const workerId = toBackendUserId(currentUser) || (isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID());
       const updated = await productionApi.finishProduction(backendId, {
         workerUserId: workerId,
         workerName: currentUser?.name || "Production Worker"
       });
       setSalesOrders(prev => prev.map(item => item.backendId === backendId || item.id === so.id ? mapSalesOrderDto(updated as any) : item));
    }

    if (updates.qcStatus === "Go" || updates.qcStatus === "NoGo") {
      // Missing qcApi integration due to missing inspectionId logic
    }
  } catch (error) {
    console.warn("Failed to sync sales order update to backend.", error);
  }
}

async function syncCreatePurchasingRequest(
  req: PurchasingRequest,
  currentUser: User | null,
  salesOrders: SalesOrder[],
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
      items: req.items.map(item => ({
        itemName: item.itemName,
        size: item.specification,
        qty: item.quantity,
        urgency: req.urgency,
      })),
    });

    setPurchasingRequests(prev => prev.map(item => item.id === req.id ? mapPurchaseRequestDto(createdReq) : item));
  } catch (error) {
    console.warn("Failed to sync purchasing request to backend.", error);
  }
}

async function syncUpdatePurchasingStatus(
  req: PurchasingRequest,
  status: PurchasingStatus,
  currentUser: User | null,
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

    setPurchasingRequests(prev => prev.map(item => item.backendId === backendId || item.id === req.id ? mapPurchaseRequestDto(updated) : item));
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
