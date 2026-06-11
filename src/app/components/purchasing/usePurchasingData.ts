import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialRequirementDto,
  PurchaseRequestDto,
  purchasingApi,
} from "../../services/purchasingApi";

export function usePurchasingData() {
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementDto[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingBackend, setIsUsingBackend] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requirements, requests] = await Promise.all([
        purchasingApi.listMaterialRequirements(),
        purchasingApi.listPurchaseRequests(),
      ]);
      setMaterialRequirements(requirements);
      setPurchaseRequests(requests);
      setIsUsingBackend(true);
    } catch (error) {
      console.warn("Purchasing API unavailable; purchasing data was not loaded.", error);
      setMaterialRequirements([]);
      setPurchaseRequests([]);
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
    isLoading,
    isUsingBackend,
    refresh,
  }), [materialRequirements, purchaseRequests, isLoading, isUsingBackend, refresh]);
}
