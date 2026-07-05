import { useState } from "react";
import { SalesOrder, User, PurchasingRequest, PurchasingStatus } from "../../data/mockData";
import {
  syncCreatePurchasingRequest,
  syncUpdatePurchasingStatus,
  syncUpdatePurchasingRequest,
} from "./syncHelpers";

export function usePurchasing(
  currentUser: User | null,
  salesOrders: SalesOrder[],
  users: User[],
) {
  const [purchasingRequests, setPurchasingRequests] = useState<PurchasingRequest[]>([]);
  const [prCounter, setPrCounter] = useState(5);

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

  return {
    purchasingRequests,
    setPurchasingRequests,
    addPurchasingRequest,
    updatePurchasingStatus,
    updatePurchasingRequest,
  };
}
