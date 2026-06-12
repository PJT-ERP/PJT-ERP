import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialRequirementDto,
  PurchaseRequestDto,
  purchasingApi,
} from "../../services/purchasingApi";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";

export function usePurchasingData() {
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementDto[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingBackend, setIsUsingBackend] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requirements, requests, suppliersList] = await Promise.all([
        purchasingApi.listMaterialRequirements(),
        purchasingApi.listPurchaseRequests(),
        masterDataApi.listSuppliers()
      ]);
      setMaterialRequirements(requirements);
      setPurchaseRequests(requests);
      setSuppliers(suppliersList);
      setIsUsingBackend(true);
    } catch (error) {
      console.warn("Purchasing API unavailable; purchasing data was not loaded.", error);
      setMaterialRequirements([]);
      setPurchaseRequests([]);
      setSuppliers([]);
      setIsUsingBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(() => ({
    materialRequirements,
    purchaseRequests,
    suppliers,
    isLoading,
    isUsingBackend,
    refresh,
  }), [materialRequirements, purchaseRequests, suppliers, isLoading, isUsingBackend, refresh]);
}
