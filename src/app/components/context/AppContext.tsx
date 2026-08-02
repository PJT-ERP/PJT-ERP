import { createContext, useContext, useEffect, useMemo, useRef, useState, Dispatch, SetStateAction, ReactNode } from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  User, SalesOrder, Customer,
  PurchasingRequest, PurchasingStatus
} from "../data/mockData";
import { ProductDto } from "../../services/salesApi";
import { landingPageApi } from "../../services/landingPageApi";
import { defaultLandingPageContent } from "./defaultLandingPageContent";
import { useAuth } from "./hooks/useAuth";
import { useBackendSync, RefreshCallbacks } from "./hooks/useBackendSync";
import { 
  useCustomersQuery, 
  useSalesOrdersQuery, 
  usePurchasingRequestsQuery, 
  useCreateCustomerMutation, 
  useUpdateCustomerMutation 
} from "../../services/queries";

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface FacilityMachineItem {
  id: string;
  desc: string;
  unit: number;
  img: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  text: string;
}

export interface ContactLocationItem {
  id: string;
  label: string;
  address: string;
}

export interface LandingPageContent {
  topBarCompanyName: string;
  topBarSubtitle: string;
  heroHeadlineLine1: string;
  heroHeadlineLine2: string;
  heroTagline: string;
  heroBadgeText: string;
  companyIntroTitle: string;
  companyIntroSubtitle: string;
  companyIntroText1: string;
  companyIntroText2: string;
  projectsTitle: string;
  projectsSubtitle: string;
  projects: ProjectItem[];
  facilitiesTitle: string;
  facilitiesSubtitle: string;
  tangerangMachines: FacilityMachineItem[];
  surabayaMachines: FacilityMachineItem[];
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: TestimonialItem[];
  contactTitle: string;
  contactSubtitle: string;
  contactLocations: ContactLocationItem[];
  footerDescription: string;
  footerAddress: string;
  footerPhone: string;
  footerEmail: string;
  footerLinkedin: string;
  showLinkedin?: boolean;
  footerTwitter: string;
  showTwitter?: boolean;
  footerYoutube: string;
  showYoutube?: boolean;
  footerInstagram: string;
  showInstagram?: boolean;
}

interface AppContextType {
  landingPageContent: LandingPageContent;
  setLandingPageContent: Dispatch<SetStateAction<LandingPageContent>>;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  salesOrders: SalesOrder[];
  customers: Customer[];
  productCatalog: ProductDto[];
  users: User[];
  purchasingRequests: PurchasingRequest[];
  backendCustomerIdsByCode: Record<string, string>;
  refreshBackendData: () => Promise<void>;
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>) => SalesOrder;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;
  setSalesOrders: React.Dispatch<React.SetStateAction<SalesOrder[]>>;
  setProductCatalog: React.Dispatch<React.SetStateAction<ProductDto[]>>;
  addUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (code: string, updates: Partial<Customer>) => void;
  deleteCustomerMaster: (code: string) => void;
  addPurchasingRequest: (req: Omit<PurchasingRequest, 'id' | 'requestedAt' | 'requestedBy'>) => void;
  updatePurchasingStatus: (id: string, status: PurchasingStatus) => void;
  updatePurchasingRequest: (id: string, updates: Partial<PurchasingRequest>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [landingPageContent, setLandingPageContent] = useState<LandingPageContent>(defaultLandingPageContent);

  const auth = useAuth();
  const queryClient = useQueryClient();
  const backendSync = useBackendSync(auth.currentUser);

  // Clear query cache when user logs out so stale data doesn't bleed into the next session
  useEffect(() => {
    if (!auth.currentUser) {
      queryClient.clear();
    }
  }, [auth.currentUser, queryClient]);
  
  // Only fetch data when user is authenticated AND they are on the ERP routes — prevents 401 spam on login page
  const location = useLocation();
  const isErpRoute = location.pathname.startsWith('/erp');
  const isAuthenticated = !!auth.currentUser && isErpRoute;

  const { data: rqCustomers = [] } = useCustomersQuery(isAuthenticated);
  const { data: rqSalesOrders = [] } = useSalesOrdersQuery(isAuthenticated);
  const { data: rqPurchasing = [] } = usePurchasingRequestsQuery(isAuthenticated);

  const createCustomer = useCreateCustomerMutation();
  const updateCustomerMutation = useUpdateCustomerMutation();

  // Temporary stubs to keep context type happy while we migrate components
  const customersHook = {
    customers: rqCustomers,
    addCustomer: (c: any) => createCustomer.mutate(c),
    updateCustomer: (code: string, u: any) => updateCustomerMutation.mutate({ code, data: u }),
    deleteCustomerMaster: () => {},
    backendCustomerIdsByCode: {},
    setBackendCustomerIdsByCode: (_ids: any) => {},
    pendingCustomersByCode: {},
    setCustomers: (_c: any) => {}
  };
  
  const salesOrdersHook = {
    salesOrders: rqSalesOrders,
    addSalesOrder: (so: any) => { return so; },
    updateSalesOrder: (_id: string, _updates: any) => {},
    setSalesOrders: (_o: any) => {}
  };
  
  const purchasingHook = {
    purchasingRequests: rqPurchasing,
    setPurchasingRequests: (_p: any) => {},
    addPurchasingRequest: () => {},
    updatePurchasingStatus: () => {},
    updatePurchasingRequest: () => {}
  };

  const callbacksRef = useRef<RefreshCallbacks>({
    onCustomersLoaded: () => {},
    onSalesOrdersLoaded: () => {},
    onUsersLoaded: () => {},
    onPurchasingRequestsLoaded: () => {},
  });

  useEffect(() => {
    callbacksRef.current = {
      onCustomersLoaded: (customers, idsByCode) => {
        customersHook.setCustomers(customers);
        customersHook.setBackendCustomerIdsByCode(idsByCode);
      },
      onSalesOrdersLoaded: (orders) => salesOrdersHook.setSalesOrders(orders),
      onUsersLoaded: (users) => auth.setUsers(users),
      onPurchasingRequestsLoaded: (requests) => purchasingHook.setPurchasingRequests(requests),
    };
  });

  const refreshBackendData = useMemo(() => async () => {
    await backendSync.refreshBackendData(callbacksRef.current);
    queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    queryClient.invalidateQueries({ queryKey: ['purchasingRequests'] });
  }, [backendSync, queryClient]);

  const refreshRef = useRef(refreshBackendData);
  useEffect(() => {
    refreshRef.current = refreshBackendData;
  });

  useEffect(() => {
    landingPageApi.getLandingPageContent().then((res) => {
      if (res) {
        setLandingPageContent(res);
      }
    }).catch(err => {
      console.warn("Failed to fetch landing page content on mount.", err);
    });
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      void refreshRef.current();
    }
  }, [auth.currentUser]);

  return (
    <AppContext.Provider value={{
      landingPageContent,
      setLandingPageContent,
      currentUser: auth.currentUser,
      login: auth.login,
      logout: auth.logout,
      salesOrders: salesOrdersHook.salesOrders,
      customers: customersHook.customers,
      productCatalog: backendSync.productCatalog,
      users: auth.users,
      purchasingRequests: purchasingHook.purchasingRequests,
      backendCustomerIdsByCode: customersHook.backendCustomerIdsByCode,
      refreshBackendData,
      addSalesOrder: salesOrdersHook.addSalesOrder,
      updateSalesOrder: salesOrdersHook.updateSalesOrder,
      setSalesOrders: salesOrdersHook.setSalesOrders,
      setProductCatalog: backendSync.setProductCatalog,
      addUser: auth.addUser,
      updateUser: auth.updateUser,
      deleteUser: auth.deleteUser,
      addCustomer: customersHook.addCustomer,
      updateCustomer: customersHook.updateCustomer,
      deleteCustomerMaster: customersHook.deleteCustomerMaster,
      addPurchasingRequest: purchasingHook.addPurchasingRequest,
      updatePurchasingStatus: purchasingHook.updatePurchasingStatus,
      updatePurchasingRequest: purchasingHook.updatePurchasingRequest,
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
