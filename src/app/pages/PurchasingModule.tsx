import { Routes, Route, Navigate, useNavigate } from "react-router";
import { DashboardPage } from "../components/purchasing/dashboard-page";
import { MaterialRequestsPage } from "../components/purchasing/material-requests-page";
import { PurchaseOrdersPage } from "../components/purchasing/purchase-orders-page";
import { CreatePurchaseOrderPage } from "../components/purchasing/create-purchase-order-page";
import { InventoryPage } from "../components/purchasing/inventory-page";
import { SuppliersPage } from "../components/purchasing/suppliers-page";
import { CreatePurchaseRequestPage } from "../components/purchasing/create-purchase-request-page";
import { PurchaseRequestDetailPage } from "../components/purchasing/purchase-request-detail-page";
import { PurchaseOrderDetailPage } from "../components/purchasing/purchase-order-detail-page";

export default function PurchasingModule() {
  const navigate = useNavigate();
  const handleCreatePO = () => navigate("/erp/purchasing/create");
  const handleNavigate = (page: string) => {
    navigate(page === "purchase-order-create" ? "/erp/purchasing/create" : (page === "dashboard" ? "/erp/purchasing/dashboard" : `/erp/purchasing/${page}`));
  };

  return (
    <Routes>
      <Route index element={<Navigate to="/erp/purchasing/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage onCreatePO={handleCreatePO} />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="requests" element={<MaterialRequestsPage />} />
      <Route path="requests/create" element={<CreatePurchaseRequestPage />} />
      <Route path="requests/:id" element={<PurchaseRequestDetailPage />} />
      <Route path="orders" element={<PurchaseOrdersPage onCreatePO={handleCreatePO} />} />
      <Route path="orders/:id" element={<PurchaseOrderDetailPage />} />
      <Route path="create" element={<CreatePurchaseOrderPage onNavigate={handleNavigate} />} />
      <Route path="suppliers" element={<SuppliersPage />} />
    </Routes>
  );
}
