import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialRequirementDto,
  PurchaseRequestDto,
  purchasingApi,
} from "../../services/purchasingApi";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";
import { financeApi, SupplierPaymentDto } from "../../services/financeApi";

export function usePurchasingData(enabled = true) {
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementDto[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentDto[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingBackend, setIsUsingBackend] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requirements, requests, suppliersList, inventoryList, payments] = await Promise.all([
        purchasingApi.listMaterialRequirements(),
        purchasingApi.listPurchaseRequests(),
        masterDataApi.listSuppliers(),
        masterDataApi.listInventory(),
        financeApi.listSupplierPayments(),
      ]);
      setMaterialRequirements(requirements);
      setPurchaseRequests(requests);
      setSuppliers(suppliersList);
      setInventoryItems(inventoryList);
      setSupplierPayments(payments);
      setIsUsingBackend(true);
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
