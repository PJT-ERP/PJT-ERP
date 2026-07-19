import { useMemo, useState } from "react";
import { usePurchasingData } from "../usePurchasingData";
import { mapPurchaseRequestsToPos, calcTotal } from "../purchase-orders-page";
import { Supplier, calculateSupplierHistory } from "../components/suppliers/SupplierHelpers";
import { SupplierDto, masterDataApi } from "../../../services/masterDataApi";
import { useApp } from "../../context/AppContext";

export function useSuppliers() {
  const { currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [supplierPage, setSupplierPage] = useState(1);
  const perPage = 10;
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | SupplierDto | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";

  const { suppliers, purchaseRequests, supplierPayments, isLoading, refresh } = usePurchasingData();

  const allPos = useMemo(() => {
    return mapPurchaseRequestsToPos(purchaseRequests || [], supplierPayments || [], suppliers);
  }, [purchaseRequests, supplierPayments, suppliers]);

  const enhancedSuppliers = useMemo(() => {
    const existingNames = new Set((suppliers as any[]).map(s => (s.name || "").toLowerCase().trim()));
    const backendSuppliers: any[] = [];
    
    allPos.forEach(po => {
      if (!po || !po.supplier) return;
      const nameKey = po.supplier.toLowerCase().trim();
      if (!existingNames.has(nameKey) && nameKey !== "supplier belum ditentukan") {
        existingNames.add(nameKey);
        backendSuppliers.push({
          id: `backend-${po.supplierCode || nameKey}`,
          code: po.supplierCode || "SUP-BACKEND",
          name: po.supplier,
          category: po.items?.[0]?.name ? "Logam & Material" : "General Supply",
          city: "Jakarta",
          address: "Alamat terdaftar di PO",
          phone: "-",
          email: "-",
          status: "Active",
          paymentTerms: "Net 14",
          since: "2026",
          contacts: [{ name: "Contact Person", phone: "-", email: "-", isPrimary: true }]
        });
      }
    });

    const combinedList = [...(suppliers as any[]), ...backendSuppliers];

    return combinedList.map(s => {
      const supplierPos = allPos.filter(po => {
        if (!po) return false;
        return po.supplierCode === s.code ||
               po.supplier === s.name ||
               (po.supplier && s.name && po.supplier.toLowerCase().trim() === s.name.toLowerCase().trim()) ||
               (po.supplier && s.name && po.supplier.toLowerCase().includes(s.name.toLowerCase()));
      });

      const totalPOs = supplierPos.length;
      const totalValue = supplierPos.reduce((sum, po) => sum + calcTotal(po.items), 0);

      const completedPos = supplierPos.filter(p => (p.deliveryStatus as string) === "Received" || (p.deliveryStatus as string) === "Closed");
      const cancelledPos = supplierPos.filter(p => (p.deliveryStatus as string) === "Cancelled");
      const onTimeRate = totalPOs === 0 ? 0 : Math.round(((totalPOs - cancelledPos.length) / totalPOs) * 100);

      const allItems = supplierPos.flatMap(p => p.items);
      const rejectedItems = allItems.filter(i => i.purchaseStatus === "Rejected" || i.purchaseStatus === "Ditolak");
      const defectRate = allItems.length === 0 ? 0 : Number(((rejectedItems.length / allItems.length) * 100).toFixed(1));

      return {
        ...s,
        totalPOs,
        totalValue,
        onTimeRate,
        defectRate,
        history: calculateSupplierHistory(supplierPos)
      };
    });
  }, [suppliers, allPos]);

  const filtered = useMemo(() => {
    return enhancedSuppliers.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.city?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [enhancedSuppliers, search, filterStatus]);

  const openEdit = (s: any) => {
    if (s.id.startsWith("backend-")) {
      setStatusMessage({ type: "error", text: "Supplier ini hanya terdaftar di transaksi lama, tidak bisa diedit. Buat ulang jika perlu." });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    setEditingSupplier(s);
    setIsAddModalOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    if (supplierToDelete.id.startsWith("backend-")) {
      setStatusMessage({ type: "error", text: "Tidak dapat menghapus data supplier dari transaksi history." });
      setSupplierToDelete(null);
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      setIsDeleting(true);
      await masterDataApi.deleteSupplier(supplierToDelete.id);
      await refresh();
      setSupplierToDelete(null);
      if (selectedSupplier?.id === supplierToDelete.id) {
        setSelectedSupplier(null);
      }
      setStatusMessage({ type: "success", text: `Supplier ${supplierToDelete.name} berhasil dihapus` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to delete supplier:", err);
      setStatusMessage({ type: "error", text: err.response?.data?.message || "Gagal menghapus supplier" });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    search, setSearch,
    filterStatus, setFilterStatus,
    supplierPage, setSupplierPage,
    perPage,
    selectedSupplier, setSelectedSupplier,
    isAddModalOpen, setIsAddModalOpen,
    editingSupplier, setEditingSupplier,
    isDeleting, setIsDeleting,
    supplierToDelete, setSupplierToDelete,
    statusMessage, setStatusMessage,
    canCreatePo,
    filtered,
    openEdit,
    confirmDeleteSupplier,
    refresh
  };
}
