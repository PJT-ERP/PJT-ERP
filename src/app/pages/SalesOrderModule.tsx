import React from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router";
import { SODetail } from "../components/so/so-detail";
import { CustomerList } from "../components/so/customer-list";
import { SODashboard } from "../components/so/so-dashboard";
import { SOList } from "../components/so/so-list";
import { SOCreate } from "../components/so/so-create";

function SOModuleRoutes() {
  const navigate = useNavigate();

  const handleNavigate = (page: string, data?: unknown) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "so-detail") {
      if (typeof data === "string") {
        navigate(`/erp/so/detail/${data}`);
      } else if (typeof data === "object" && data !== null && "id" in data) {
        navigate(`/erp/so/detail/${(data as any).id}`, { state: data });
      }
    } else if (page === "so-list") {
      navigate("/erp/so/orders");
    } else if (page === "so-create") {
      navigate("/erp/so/order-create", { state: data });
    } else if (page === "customer-list") {
      navigate("/erp/so/customers");
    } else {
      navigate("/erp/so/dashboard");
    }
  };

  return (
    <Routes>
      <Route index element={<Navigate to="/erp/so/dashboard" replace />} />
      <Route path="dashboard" element={<SODashboard onNavigate={handleNavigate} />} />
      <Route path="orders" element={<SOList onNavigate={handleNavigate} />} />
      <Route path="order-create" element={<SOCreateWrapper onNavigate={handleNavigate} />} />
      <Route path="detail/:id" element={<SODetailWrapper onNavigate={handleNavigate} />} />
      <Route path="customers" element={<CustomerList onNavigate={handleNavigate} />} />
    </Routes>
  );
}

function SOCreateWrapper({ onNavigate }: { onNavigate: (page: string, data?: unknown) => void }) {
  const location = useLocation();
  const initialData = location.state as { customerId?: string; orderType?: "new" | "repeat" } | undefined;
  return <SOCreate onNavigate={onNavigate} initialData={initialData} />;
}

function SODetailWrapper({ onNavigate }: { onNavigate: (page: string, data?: unknown) => void }) {
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = location.state?.isEditMode === true;
  
  return <SODetail orderId={id!} onNavigate={onNavigate} initialEditMode={isEditMode} />;
}

export default function SalesOrderModule() {
  return <SOModuleRoutes />;
}

