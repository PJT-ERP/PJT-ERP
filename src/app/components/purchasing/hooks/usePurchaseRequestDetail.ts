import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { purchasingApi } from "../../../services/purchasingApi";
import { masterDataApi, InventoryItemDto } from "../../../services/masterDataApi";
import { useApp } from "../../context/AppContext";
import { MR, mapPurchaseRequestToMr } from "../material-requests-page";

export function usePurchaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshBackendData } = useApp();
  
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";
  const canApproveFinance = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";
  const isPurchasingOrAdmin = currentUser?.role === "Purchasing" || currentUser?.role === "Admin" || currentUser?.role === "Owner";

  const [detail, setDetail] = useState<MR | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  
  const [pricingData, setPricingData] = useState<Record<string, { supplierName: string, estimatedPrice: string, unitPrice: string, isCustomSupplier?: boolean, itemName?: string, qty?: string }>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [dialogMsg, setDialogMsg] = useState<{ title: string; message: string } | null>(null);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const canEditPricing = isPurchasingOrAdmin && 
    detail?.backendStatus !== "FinanceApproved" && 
    detail?.backendStatus !== "Processing" &&
    detail?.backendStatus !== "Completed" &&
    !(detail?.backendStatus === "SupervisorApproved" && detail?.isReadyForFinance);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [data, suppliersData, invData] = await Promise.all([
          purchasingApi.listPurchaseRequests(),
          masterDataApi.listSuppliers(),
          masterDataApi.listInventory()
        ]);
        setSuppliersList(suppliersData);
        setInventoryItems(invData);

        const cleanId = id ? id.trim().toLowerCase() : "";
        const req = data.find(r => 
          (r.prNumber && r.prNumber.trim().toLowerCase() === cleanId) || 
          (r.id && r.id.trim().toLowerCase() === cleanId)
        );
        
        if (req && req.status !== "SupervisorRejected") {
          const mr = mapPurchaseRequestToMr(req);
          const initData: Record<string, { supplierName: string, estimatedPrice: string, unitPrice: string, isCustomSupplier?: boolean, itemName?: string, qty?: string }> = {};
          mr.items.forEach(item => {
            const actualSupplierName = item.supplierName && item.supplierName.trim() !== "-" ? item.supplierName : null;
            let supplierToUse = actualSupplierName || "";
            
            let uPrice = "";
            if (item.estimatedPrice && item.qty) {
              uPrice = String(Math.round(item.estimatedPrice / item.qty));
            }
            
            const isCustom = supplierToUse ? !suppliersData.some(s => s.name === supplierToUse) : false;
            initData[item.itemId] = {
              supplierName: supplierToUse,
              estimatedPrice: item.estimatedPrice ? String(item.estimatedPrice) : "",
              unitPrice: uPrice,
              isCustomSupplier: isCustom,
              itemName: item.name || "",
              qty: item.qty ? String(item.qty) : "",
            };
          });
          setPricingData(initData);
          setDetail(mr);
        } else {
          setDetail(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) void loadData();
  }, [id]);

  const handleSavePricing = async () => {
    if (!detail) return;
    const missingFields: string[] = [];
    detail.items.forEach((item) => {
      const p = pricingData[item.itemId] || {};
      const matName = p.itemName !== undefined ? p.itemName : item.name;
      const qtyVal = Number(p.qty !== undefined ? p.qty : item.qty);
      const sup = p.supplierName !== undefined ? p.supplierName : item.supplierName;
      const uPrice = Number(p.unitPrice);

      if (!matName || !String(matName).trim()) missingFields.push(`Tolong lengkapi Nama Material pada item ${item.code}`);
      if (!qtyVal || qtyVal <= 0 || isNaN(qtyVal)) missingFields.push(`Tolong isi Quantity pada item ${item.code} (minimal 1)`);
      if (!sup || !String(sup).trim() || sup === "Pilih Supplier") missingFields.push(`Tolong pilih Toko / Supplier untuk item ${item.code}`);
      if (!uPrice || uPrice <= 0 || isNaN(uPrice)) missingFields.push(`Tolong isi Harga Satuan untuk item ${item.code}`);
    });

    if (missingFields.length > 0) {
      setDialogMsg({ 
        title: "Mohon Lengkapi Data", 
        message: "Sebelum diajukan ke Finance, silakan lengkapi beberapa informasi berikut:\n\n• " + missingFields.join("\n• ") 
      });
      return;
    }

    setIsSavingPricing(true);
    setActionError("");
    try {
      const data = await purchasingApi.listPurchaseRequests();
      const backendReq = data.find(r => r.prNumber === detail.id || r.id === detail.id);
      if (!backendReq) throw new Error("PR not found in backend");

      const promises = detail.items.map(async item => {
        const p = pricingData[item.itemId];
        if (!p) return Promise.resolve();
        
        const matName = p.itemName !== undefined ? p.itemName : item.name;
        const qtyVal = Number(p.qty !== undefined ? p.qty : item.qty);
        const uPrice = Number(p.unitPrice);
        const estimatedPrice = uPrice > 0 && qtyVal > 0 ? uPrice * qtyVal : null;
        
        const updatePr = purchasingApi.updatePurchaseRequestItemInfo(backendReq.id, item.itemId, {
          supplierName: p.supplierName || null,
          estimatedPrice: estimatedPrice,
          itemName: p.itemName || null,
          qty: qtyVal || null,
        });

        const invItem = inventoryItems.find(i => i.name.toLowerCase().trim() === matName.toLowerCase().trim());
        if (invItem && uPrice > 0 && (invItem.unitPrice !== uPrice || invItem.supplierName !== p.supplierName)) {
          try {
            await masterDataApi.updateInventoryItem(invItem.id, {
               code: invItem.code,
               name: invItem.name,
               category: invItem.category,
               unit: invItem.unit,
               currentStock: invItem.currentStock,
               minStock: invItem.minStock,
               maxStock: invItem.maxStock,
               reorderPoint: invItem.reorderPoint,
               location: invItem.location,
               supplierName: p.supplierName || invItem.supplierName,
               unitPrice: uPrice
            });
          } catch(e) {
             console.error("Failed to update inventory unit price", e);
          }
        }
        
        return updatePr;
      });
      await Promise.all(promises);

      await refreshBackendData();

      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));

      setShowSuccessDialog(true);
      setTimeout(() => navigate("/erp/purchasing/requests"), 1500);
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.message || err?.message || "Gagal menyimpan harga. Silakan coba lagi.");
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleReviewPr = async (decision: 'Accept' | 'Reject') => {
    if (!detail || !currentUser) return;
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(detail.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: detail.backendStatus === 'Submitted' ? 'Supervisor' : 'Finance',
        rejectionReason: decision === 'Reject' ? window.prompt("Alasan Penolakan:") || "Ditolak" : undefined
      });
      await refreshBackendData();
      
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));
    } catch (error) {
      console.warn('Failed to review PR.', error);
      setDialogMsg({ title: "Gagal Memproses", message: "Gagal memproses review PR. Cek koneksi API." });
    } finally {
      setIsApproving(false);
    }
  };

  return {
    id,
    navigate,
    currentUser,
    canCreatePo,
    canApproveFinance,
    canEditPricing,
    detail,
    isLoading,
    actionError,
    pricingData, setPricingData,
    inventoryItems,
    isSavingPricing,
    showSuccessDialog, setShowSuccessDialog,
    isApproving,
    dialogMsg, setDialogMsg,
    suppliersList,
    handleSavePricing,
    handleReviewPr
  };
}
