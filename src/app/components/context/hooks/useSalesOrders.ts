import { Dispatch, MutableRefObject, SetStateAction, useState } from "react";
import { SalesOrder, Customer, User } from "../../data/mockData";
import { ProductDto } from "../../../services/salesApi";
import { syncCreateSalesOrder, syncUpdateSalesOrder } from "./syncHelpers";

export function useSalesOrders(
  currentUser: User | null,
  customers: Customer[],
  productCatalog: ProductDto[],
  users: User[],
  backendCustomerIdsByCode: Record<string, string>,
  setBackendCustomerIdsByCode: Dispatch<SetStateAction<Record<string, string>>>,
  pendingCustomersByCodeRef: MutableRefObject<Record<string, Customer>>,
) {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [soCounter, setSoCounter] = useState(75);

  const addSalesOrder = (data: Omit<SalesOrder, 'id' | 'createdAt' | 'status' | 'createdBy'>): SalesOrder => {
    const next = soCounter + 1;
    setSoCounter(next);
    const currentYear = new Date().getFullYear();
    const newId = `SO-${currentYear}-${String(next).padStart(3, '0')}`;

    const so: SalesOrder = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Pending Design',
      createdBy: currentUser?.id ?? 'u1',
    };

    setSalesOrders(prev => [so, ...prev]);
    void syncCreateSalesOrder(so, customers, pendingCustomersByCodeRef.current, backendCustomerIdsByCode, setBackendCustomerIdsByCode, setSalesOrders);
    return so;
  };

  const updateSalesOrder = (id: string, updates: Partial<SalesOrder>) => {
    setSalesOrders(prev => prev.map(so => so.id === id ? { ...so, ...updates } : so));
    const current = salesOrders.find(so => so.id === id);
    if (current) {
      void syncUpdateSalesOrder(current, updates, currentUser, users, setSalesOrders, productCatalog);
    }
  };

  return { salesOrders, setSalesOrders, addSalesOrder, updateSalesOrder };
}
