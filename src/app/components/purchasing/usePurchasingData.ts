import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MaterialRequirementDto,
  PurchaseRequestDto,
  purchasingApi,
} from "../../services/purchasingApi";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";
import { financeApi, SupplierPaymentDto } from "../../services/financeApi";

export function usePurchasingData(enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchasingData'],
    queryFn: async () => {
      const [reqRes, prRes, supRes, invRes, payRes] = await Promise.allSettled([
        purchasingApi.listMaterialRequirements(),
        purchasingApi.listPurchaseRequests(),
        masterDataApi.listSuppliers(),
        masterDataApi.listInventory(),
        financeApi.listSupplierPayments(),
      ]);
      
      return {
        materialRequirements: reqRes.status === "fulfilled" ? reqRes.value : [],
        purchaseRequests: prRes.status === "fulfilled" ? prRes.value : [],
        suppliers: supRes.status === "fulfilled" ? supRes.value : [],
        inventoryItems: invRes.status === "fulfilled" ? invRes.value : [],
        supplierPayments: payRes.status === "fulfilled" ? payRes.value : [],
        isUsingBackend: prRes.status === "fulfilled"
      };
    },
    enabled: enabled,
    staleTime: 30000,
  });

  const refresh = useCallback(async (forceOrEvent?: boolean | any) => {
    await refetch();
  }, [refetch]);

  return useMemo(() => ({
    materialRequirements: data?.materialRequirements || [],
    purchaseRequests: data?.purchaseRequests || [],
    suppliers: data?.suppliers || [],
    supplierPayments: data?.supplierPayments || [],
    inventoryItems: data?.inventoryItems || [],
    isLoading,
    isUsingBackend: data?.isUsingBackend || false,
    refresh
  }), [data, isLoading, refresh]);
}
