import { createContext, useContext, useEffect, useRef, useState, ReactNode, Dispatch, SetStateAction } from "react";
import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus, Quotation,
  USERS
} from "../data/mockData";
import { quotationApi, QuotationDto } from "../../services/quotationApi";
import { salesApi, CustomerDto, ProductDto, SalesOrderDto } from "../../services/salesApi";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  customers: Customer[];
  productCatalog: ProductDto[];
  users: User[];
  purchasingRequests: PurchasingRequest[];
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductDto[]>([]);
  const [users, setUsers] = useState<User[]>(USERS);
  const [purchasingRequests, setPurchasingRequests] = useState<PurchasingRequest[]>([]);
  const [backendCustomerIdsByCode, setBackendCustomerIdsByCode] = useState<Record<string, string>>({});
  const pendingCustomersByCode = useRef<Record<string, Customer>>({});
  const [qutCounter, setQutCounter] = useState(5);
  const [soCounter, setSoCounter] = useState(75);
  const [prCounter, setPrCounter] = useState(5);

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password && u.isActive);
    if (user) { setCurrentUser(user); return true; }
    return false;
  };

  const logout = () => setCurrentUser(null);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [backendCustomers, backendProducts, backendQuotations, backendSalesOrders, backendPurchaseRequests] = await Promise.all([
          salesApi.listCustomers(),
          salesApi.listProducts(),
          quotationApi.list(),
          salesApi.listSalesOrders(),
          purchasingApi.listPurchaseRequests(),
        ]);

        setBackendCustomerIdsByCode(
          Object.fromEntries(backendCustomers.map(customer => [customer.code, customer.id])),
        );
        setCustomers(backendCustomers.map(mapCustomerDto));
        setProductCatalog(backendProducts.filter(product => product.isActive !== false));
        setQuotations(backendQuotations.map(mapQuotationDto));
        setSalesOrders(backendSalesOrders.map(mapSalesOrderDto));
        setPurchasingRequests(backendPurchaseRequests.map(mapPurchaseRequestDto));
      } catch (error) {
        console.warn("Backend unavailable; business seed data was not loaded.", error);
      }
    };

    void loadBackendData();
  }, []);

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
      void syncUpdateQuotation(current, updates, currentUser);
    }
  };

  const addSalesOrder = (data: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>): SalesOrder => {
    const next = soCounter + 1;
    setSoCounter(next);
    const so: SalesOrder = {
      ...data,
      id: `SO-2026${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'waiting_dp',
      createdBy: currentUser?.id ?? 'u1',
    };
    setSalesOrders(prev => [so, ...prev]);
    return so;
  };

  const updateSalesOrder = (id: string, updates: Partial<SalesOrder>) => {
    setSalesOrders(prev => prev.map(so => so.id === id ? { ...so, ...updates } : so));
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
  };

  const updateCustomer = (code: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
  };

  const addPurchasingRequest = (data: Omit<PurchasingRequest, 'id' | 'requestedAt' | 'requestedBy'>) => {
    const next = prCounter;
    setPrCounter(n => n + 1);
    const req: PurchasingRequest = {
      ...data,
      id: `PR-${String(next).padStart(3, '0')}`,
      requestedAt: new Date().toISOString().split('T')[0],
      requestedBy: currentUser?.id ?? 'u2',
    };
    setPurchasingRequests(prev => [req, ...prev]);
  };

  const updatePurchasingStatus = (id: string, status: PurchasingStatus) => {
    setPurchasingRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const updatePurchasingRequest = (id: string, updates: Partial<PurchasingRequest>) => {
    setPurchasingRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      quotations, salesOrders, customers, productCatalog, users, purchasingRequests,
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

function mapCustomerDto(customer: CustomerDto): Customer {
  return {
    code: customer.code,
    name: customer.name,
    contact: customer.email || customer.contactPerson || "",
    phone: customer.phone || "",
    address: customer.address || "",
  };
}

function mapQuotationDto(quotation: QuotationDto): Quotation {
  const primaryItem = quotation.items[0];

  return {
    id: quotation.id,
    customerId: quotation.customerCode,
    productName: primaryItem?.productName || "-",
    description: primaryItem?.description || "",
    quantity: primaryItem?.quantity || 0,
    unit: primaryItem?.unit || "pcs",
    deadline: quotation.deadline,
    status: quotation.status,
    designId: quotation.designLink || primaryItem?.designLink || "",
    estimatedAmount: quotation.estimatedAmount || 0,
    customerImageUrl: primaryItem?.customerImageUrl || "",
    createdBy: "backend",
    createdAt: quotation.createdAtUtc?.split("T")[0] || new Date().toISOString().split("T")[0],
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
  };
}

function mapSalesOrderDto(order: SalesOrderDto): SalesOrder {
  const primaryItem = order.items[0];

  return {
    id: order.id,
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
  if (status === "Processing" || status === "FinanceApproved") return "Diproses";
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
    if (!customerId) {
      const customer = customers.find(item => item.code === quotation.customerId)
        || pendingCustomersByCode[quotation.customerId];
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
      setCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }

    const createdQuotation = await quotationApi.create({
      customerId,
      deadline: quotation.deadline,
      notes: quotation.notes || null,
      items: [
        {
          productId: null,
          productName: quotation.productName,
          description: quotation.description,
          quantity: quotation.quantity,
          unit: quotation.unit,
          customerImageUrl: quotation.customerImageUrl || null,
          designLink: quotation.designId || null,
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

    setQuotations(prev => prev.map(item => item.id === quotation.id ? mapQuotationDto(createdQuotation) : item));
  } catch (error) {
    console.warn("Failed to sync quotation to backend.", error);
  }
}

async function syncUpdateQuotation(
  quotation: Quotation,
  updates: Partial<Quotation>,
  currentUser: User | null,
) {
  if (!isGuid(quotation.id)) {
    return;
  }

  try {
    if (updates.estimatedAmount !== undefined && updates.status === "client_price_approval") {
      await quotationApi.submitPricing(quotation.id, {
        amount: updates.estimatedAmount,
        notes: updates.notes || null,
        financeUserId: isGuid(currentUser?.id) ? currentUser!.id : crypto.randomUUID(),
        financeUserName: currentUser?.name || "Finance",
      });
      return;
    }

    if (updates.status === "waiting_pricing") {
      await quotationApi.approveClientDesign(quotation.id);
      return;
    }

    if (updates.status === "pending_design") {
      await quotationApi.requestDesignRevision(quotation.id, {
        notes: updates.notes || "Client requested design revision.",
      });
      return;
    }

    if (updates.status === "won") {
      await quotationApi.markWon(quotation.id);
      await quotationApi.convertToSalesOrder(quotation.id, {
        dpPercentage: 50,
        dueDate: addDaysIso(new Date(), 7),
      });
      return;
    }

    if (updates.status === "lost") {
      await quotationApi.markLost(quotation.id, {
        reason: updates.lostReason || "Quotation lost.",
      });
    }
  } catch (error) {
    console.warn("Failed to sync quotation update to backend.", error);
  }
}

function isGuid(value?: string | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}
