import { createContext, useContext, useEffect, useRef, useState, ReactNode, Dispatch, SetStateAction } from "react";
import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus, Quotation,
  USERS, CUSTOMERS, INITIAL_SALES_ORDERS, INITIAL_PURCHASING, INITIAL_QUOTATIONS
} from "../data/mockData";
import { quotationApi, QuotationDto } from "../../services/quotationApi";
import { salesApi, CustomerDto } from "../../services/salesApi";

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  customers: Customer[];
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
  const [quotations, setQuotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [purchasingRequests, setPurchasingRequests] = useState<PurchasingRequest[]>(INITIAL_PURCHASING);
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
        const [backendCustomers, backendQuotations] = await Promise.all([
          salesApi.listCustomers(),
          quotationApi.list(),
        ]);

        setBackendCustomerIdsByCode(
          Object.fromEntries(backendCustomers.map(customer => [customer.code, customer.id])),
        );
        setCustomers(backendCustomers.map(mapCustomerDto));
        setQuotations(backendQuotations.map(mapQuotationDto));
      } catch (error) {
        console.warn("Backend unavailable, using local mock ERP data.", error);
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
      quotations, salesOrders, customers, users, purchasingRequests,
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
