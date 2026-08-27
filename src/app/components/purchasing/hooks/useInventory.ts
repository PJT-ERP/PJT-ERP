import { useMemo, useState } from "react";
import { masterDataApi } from "../../../services/masterDataApi";
import { usePurchasingData } from "../usePurchasingData";
import { useApp } from "../../context/AppContext";
import { InventoryItem, IncomingShipment, getStatus } from "../components/inventory/InventoryHelpers";

export function useInventory() {
  const { currentUser } = useApp();
  const { inventoryItems, purchaseRequests, suppliers, refresh } = usePurchasingData();
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";
  
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showAllCritical, setShowAllCritical] = useState(false);
  const [criticalPage, setCriticalPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const perPage = 10;
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [mutationItem, setMutationItem] = useState<InventoryItem | null>(null);

  const handleMutation = (item: InventoryItem) => {
    setMutationItem(item);
    setIsMutationModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setIsAddModalOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      await masterDataApi.deleteInventoryItem(deleteItem.id);
      refresh();
      setDeleteItem(null);
    // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {
      alert("Gagal menghapus item.");
    }
  };

  const inventory: InventoryItem[] = useMemo(() => {
    const incomingByName = new Map<string, IncomingShipment>();
    purchaseRequests.forEach(pr => {
      pr.items.forEach(item => {
        if (item.purchaseStatus === "Ordered") {
          const poNumber = item.poNumber || pr.prNumber;
          const eta = item.expectedArrivalDate ? new Date(item.expectedArrivalDate).toLocaleDateString("id-ID") : "Hari ini";
          const key = item.itemName.toLowerCase();
          const existing = incomingByName.get(key);
          if (existing) {
            const pos = new Set(existing.po.split(", "));
            pos.add(poNumber);
            existing.po = Array.from(pos).join(", ");

            const suppliersList = new Set(existing.supplier.split(", "));
            const newSup = item.supplierName || item.suggestedSupplier || "Supplier";
            suppliersList.add(newSup);
            existing.supplier = Array.from(suppliersList).join(", ");

            existing.qty += item.qty;
            if (existing.eta !== eta) {
              existing.eta = "Beberapa pengiriman";
            }
          } else {
            incomingByName.set(key, {
              po: poNumber,
              supplier: item.supplierName || item.suggestedSupplier || "Supplier",
              eta,
              qty: item.qty,
              unit: "pcs"
            });
          }
        }
      });
    });

    return inventoryItems.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      reorderPoint: item.reorderPoint,
      location: item.location,
      supplier: item.supplierName,
      unitPrice: item.unitPrice,
      lastUpdated: item.updatedAtUtc,
      incoming: incomingByName.get(item.name.toLowerCase())
    }));
  }, [inventoryItems, purchaseRequests]);

  const categories = useMemo(() => Array.from(new Set(inventory.map((item) => item.category))), [inventory]);
  const chartData = useMemo(() => categories.map((cat) => ({
    name: cat.split(" ")[0],
    value: Math.round(inventory.filter((item) => item.category === cat).reduce((s, item) => s + item.currentStock * item.unitPrice, 0)),
  })), [categories, inventory]);

  const filtered = inventory.filter((item) => {
    const q = search.toLowerCase();
    const status = getStatus(item);
    const matchQ = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchC = filterCat === "all" || item.category === filterCat;
    const matchS = filterStatus === "all" || status === filterStatus;
    return matchQ && matchC && matchS;
  });

  const criticalItems = inventory.filter((i) => getStatus(i) === "critical");
  const criticalTotalPages = Math.ceil(criticalItems.length / perPage);
  const invTotalPages = Math.ceil(filtered.length / perPage);
  const lowItems = inventory.filter((i) => getStatus(i) === "low");
  const incomingItems = inventory.filter((i) => !!i.incoming);
  const totalValue = inventory.reduce((s, i) => s + i.currentStock * i.unitPrice, 0);

  return {
    canCreatePo,
    search, setSearch,
    filterCat, setFilterCat,
    showAllCritical, setShowAllCritical,
    criticalPage, setCriticalPage,
    invPage, setInvPage,
    perPage,
    filterStatus, setFilterStatus,
    isAddModalOpen, setIsAddModalOpen,
    editItem, setEditItem,
    deleteItem, setDeleteItem,
    isMutationModalOpen, setIsMutationModalOpen,
    mutationItem, setMutationItem,
    handleEdit, handleDelete, confirmDelete, handleMutation,
    inventory, categories, chartData, filtered,
    criticalItems, criticalTotalPages, invTotalPages,
    lowItems, incomingItems, totalValue,
    suppliers, refresh
  };
}
