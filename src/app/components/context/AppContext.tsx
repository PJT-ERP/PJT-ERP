import { createContext, useContext, useState, ReactNode } from "react";
import {
  User, SalesOrder, Customer, UserRole,
  PurchasingRequest, PurchasingStatus, Quotation,
  USERS, CUSTOMERS, INITIAL_SALES_ORDERS, INITIAL_PURCHASING, INITIAL_QUOTATIONS
} from "../data/mockData";

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  customers: Customer[];
  users: User[];
  purchasingRequests: PurchasingRequest[];
  addQuotation: (q: Omit<Quotation, 'id' | 'createdAt' | 'status' | 'createdBy'>) => Quotation;
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
  const [qutCounter, setQutCounter] = useState(5);
  const [soCounter, setSoCounter] = useState(75);
  const [prCounter, setPrCounter] = useState(5);

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password && u.isActive);
    if (user) { setCurrentUser(user); return true; }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addQuotation = (data: Omit<Quotation, 'id' | 'createdAt' | 'status' | 'createdBy'>): Quotation => {
    const next = qutCounter + 1;
    setQutCounter(next);
    const q: Quotation = {
      ...data,
      id: `QUT-2026-${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft',
      createdBy: currentUser?.id ?? 'u1',
    };
    setQuotations(prev => [q, ...prev]);
    return q;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
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
