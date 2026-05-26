import { Routes, Route, Navigate, useNavigate } from "react-router";
import { DashboardPage } from "../components/dashboard-page";
import { MaterialRequestsPage } from "../components/material-requests-page";
import { PurchaseOrdersPage } from "../components/purchase-orders-page";
import { CreatePurchaseOrderPage } from "../components/create-purchase-order-page";

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
      <Route path="requests" element={<MaterialRequestsPage />} />
      <Route path="orders" element={<PurchaseOrdersPage onCreatePO={handleCreatePO} />} />
      <Route path="create" element={<CreatePurchaseOrderPage onNavigate={handleNavigate} />} />
    </Routes>
  );
}
