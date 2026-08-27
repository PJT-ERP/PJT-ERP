import { useCallback, useMemo, useState } from "react";
import { User, SalesOrder, Customer, PurchasingRequest } from "../../data/mockData";
import { salesApi, ProductDto } from "../../../services/salesApi";
import { authApi } from "../../../services/authApi";
import { mapAuthProfileToUser } from "./useAuth";

export interface RefreshCallbacks {
  onCustomersLoaded: (customers: Customer[], customerIdsByCode: Record<string, string>) => void;
  onSalesOrdersLoaded: (orders: SalesOrder[]) => void;
  onUsersLoaded: (users: User[]) => void;
  onPurchasingRequestsLoaded: (requests: PurchasingRequest[]) => void;
}

export function useBackendSync(_currentUser: User | null) {
  const [productCatalog, setProductCatalog] = useState<ProductDto[]>([]);

  const refreshBackendData = useCallback(async (callbacks: RefreshCallbacks) => {
    const [productsResult, usersResult] = await Promise.allSettled([
      salesApi.listProducts(),
      authApi.getUsers()
    ]);

    let productsForSalesOrders: ProductDto[] = [];
    if (productsResult.status === "fulfilled") {
      productsForSalesOrders = productsResult.value.filter(product => product.isActive !== false);
      setProductCatalog(productsForSalesOrders);
    } else {
      console.warn("Product seed data was not loaded.", productsResult.reason);
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
  }, []);

  return useMemo(() => ({ productCatalog, setProductCatalog, refreshBackendData }), [productCatalog, refreshBackendData]);
}
