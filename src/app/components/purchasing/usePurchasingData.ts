import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialRequirementDto,
  PurchaseRequestDto,
  purchasingApi,
} from "../../services/purchasingApi";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";
import { financeApi, SupplierPaymentDto } from "../../services/financeApi";

let globalCache = {
  materialRequirements: null as MaterialRequirementDto[] | null,
  purchaseRequests: null as PurchaseRequestDto[] | null,
  suppliers: null as SupplierDto[] | null,
  inventoryItems: null as any[] | null,
  supplierPayments: null as SupplierPaymentDto[] | null,
  lastFetch: 0,
};

export function usePurchasingData(enabled = true) {
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementDto[]>(globalCache.materialRequirements || []);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>(globalCache.purchaseRequests || []);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>(globalCache.suppliers || []);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentDto[]>(globalCache.supplierPayments || []);
  const [inventoryItems, setInventoryItems] = useState<any[]>(globalCache.inventoryItems || []);
  const [isLoading, setIsLoading] = useState(globalCache.lastFetch === 0);
  const [isUsingBackend, setIsUsingBackend] = useState(globalCache.lastFetch > 0);

  const refresh = useCallback(async (forceOrEvent?: boolean | any) => {
    const force = forceOrEvent === true;
    if (!force && Date.now() - globalCache.lastFetch < 30000) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [reqRes, prRes, supRes, invRes, payRes] = await Promise.allSettled([
        purchasingApi.listMaterialRequirements(),
        purchasingApi.listPurchaseRequests(),
        masterDataApi.listSuppliers(),
        masterDataApi.listInventory(),
        financeApi.listSupplierPayments(),
      ]);
      
      const newReqs = reqRes.status === "fulfilled" ? reqRes.value : [];
      const newPrs = prRes.status === "fulfilled" ? prRes.value : [];
      const newSups = supRes.status === "fulfilled" ? supRes.value : [];
      const newInvs = invRes.status === "fulfilled" ? invRes.value : [];
      const newPays = payRes.status === "fulfilled" ? payRes.value : [];
      
      globalCache = {
        materialRequirements: newReqs,
        purchaseRequests: newPrs,
        suppliers: newSups,
        inventoryItems: newInvs,
        supplierPayments: newPays,
        lastFetch: Date.now()
      };

      setMaterialRequirements(newReqs);
      setPurchaseRequests(newPrs);
      setSuppliers(newSups);
      setInventoryItems(newInvs);
      setSupplierPayments(newPays);

      setIsUsingBackend(prRes.status === "fulfilled");
    } catch (error) {
      console.warn("Purchasing API unavailable; purchasing data was not loaded.", error);
      setMaterialRequirements([]);
      setPurchaseRequests([]);
      setSuppliers([]);
      setInventoryItems([]);
      setSupplierPayments([]);
      setIsUsingBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void refresh();
    } else {
      setIsLoading(false);
    }
  }, [enabled, refresh]);

  return useMemo(() => ({
    materialRequirements,
    purchaseRequests,
    suppliers,
    supplierPayments,
    inventoryItems,
    isLoading,
    isUsingBackend,
    refresh
  }), [materialRequirements, purchaseRequests, suppliers, supplierPayments, inventoryItems, isLoading, isUsingBackend, refresh]);
}
