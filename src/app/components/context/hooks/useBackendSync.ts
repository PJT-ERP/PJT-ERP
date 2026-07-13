import { useCallback, useMemo, useState } from "react";
import { User, SalesOrder, Customer, PurchasingRequest } from "../../data/mockData";
import { salesApi, CustomerDto, ProductDto, SalesOrderDto } from "../../../services/salesApi";
import { purchasingApi, PurchaseRequestDto } from "../../../services/purchasingApi";
import { authApi } from "../../../services/authApi";
import { financeApi } from "../../../services/financeApi";
import {
  mapCustomerDto,
  canLoadPurchaseRequests,
  mapSalesOrderDto,
  mapPurchaseRequestDto,
} from "./dataMappers";
import { mapAuthProfileToUser } from "./useAuth";

export interface RefreshCallbacks {
  onCustomersLoaded: (customers: Customer[], customerIdsByCode: Record<string, string>) => void;
  onSalesOrdersLoaded: (orders: SalesOrder[]) => void;
  onUsersLoaded: (users: User[]) => void;
  onPurchasingRequestsLoaded: (requests: PurchasingRequest[]) => void;
}

export function useBackendSync(currentUser: User | null) {
  const [productCatalog, setProductCatalog] = useState<ProductDto[]>([]);

  const refreshBackendData = useCallback(async (callbacks: RefreshCallbacks) => {
    const shouldLoadPurchaseRequests = canLoadPurchaseRequests(currentUser?.role);
    const shouldLoadInvoices = !!currentUser;
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
      const customerIdsByCode = Object.fromEntries(backendCustomers.map(customer => [customer.code, customer.id]));
      callbacks.onCustomersLoaded(backendCustomers.map(mapCustomerDto), customerIdsByCode);
    } else {
      console.warn("Customer seed data was not loaded.", customersResult.reason);
    }

    let productsForSalesOrders: ProductDto[] = [];
    if (productsResult.status === "fulfilled") {
      productsForSalesOrders = productsResult.value.filter(product => product.isActive !== false);
      setProductCatalog(productsForSalesOrders);
    } else {
      console.warn("Product seed data was not loaded.", productsResult.reason);
    }

    let invoices: any[] = [];
    if (invoicesResult && invoicesResult.status === "fulfilled" && Array.isArray(invoicesResult.value)) {
      invoices = invoicesResult.value;
    }

    if (salesOrdersResult.status === "fulfilled") {
      callbacks.onSalesOrdersLoaded(salesOrdersResult.value.map(dto => mapSalesOrderDto(dto, invoices, productsForSalesOrders)));
    } else {
      console.warn("Sales order seed data was not loaded.", salesOrdersResult.reason);
    }

    if (!shouldLoadPurchaseRequests) {
      callbacks.onPurchasingRequestsLoaded([]);
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
      callbacks.onPurchasingRequestsLoaded(purchaseRequestsResult.value.map(req => mapPurchaseRequestDto(req, mappedUsers)));
    } else {
      console.warn("Purchasing seed data was not loaded.", purchaseRequestsResult.reason);
    }

    if (usersResult.status === "fulfilled") {
      callbacks.onUsersLoaded(usersResult.value.map(dto => mapAuthProfileToUser({
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

  return useMemo(() => ({ productCatalog, setProductCatalog, refreshBackendData }), [productCatalog, refreshBackendData]);
}
