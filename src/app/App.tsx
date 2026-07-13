import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppProvider } from "./components/context/AppContext";
import { Toaster } from "./components/ui/sonner";

import HomePage from "./pages/HomePage";
import { Login } from "./pages/Login";
import PurchasingModule from "./pages/PurchasingModule";
import SalesOrderModule from "./pages/SalesOrderModule";
import { ERPLayout } from "./components/layout/erp-layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

import { FinanceLayout } from "./components/finance/FinanceLayout";
import { FinanceDashboard } from "./components/finance/FinanceDashboard";
import { FinanceCosting } from "./components/finance/FinanceCosting";
import { InvoiceList } from "./components/finance/InvoiceList";
import { CreateInvoice } from "./components/finance/CreateInvoice";
import { PaymentVerification } from "./components/finance/PaymentVerification";
import { TransactionHistory } from "./components/finance/TransactionHistory";
import { FinanceReports } from "./components/finance/FinanceReports";
import { FinancePurchasingApproval } from "./components/finance/FinancePurchasingApproval";
import { FinancePrDetail } from "./components/finance/FinancePrDetail";
import { FinancePoDetail } from "./components/finance/FinancePoDetail";

import { AdminPage } from "./pages/admin";
import { AdminProductsPage } from "./pages/admin/products";
import { SuppliersPage } from "./components/purchasing/suppliers-page";
import { LandingPageEditor } from "./pages/admin/landing-editor";
import { EngineeringTasksPage } from "./pages/engineering/tasks";
import { EngineeringTaskDetailPage } from "./pages/engineering/task-detail";
import { EngineeringPage } from "./pages/engineering";
import { EngineeringPurchasingPage } from "./pages/engineering/purchasing";
import { EngineeringQCPage } from "./pages/engineering/qc";
import { OwnerApprovalPage } from "./pages/owner/approvals";
import { DashboardPage } from "./pages/dashboard";
import { CustomerAnalyticsPage } from "./pages/sales/analytics";
import { ProductionPage } from "./pages/Production";
import { ProductionMaterialRequestPage } from "./pages/Production/material-request";
import { QCPage } from "./pages/qc";

const financeRoutes = [
  { path: "dashboard", element: <FinanceDashboard /> },
  { path: "costing", element: <FinanceCosting /> },
  { path: "invoices", element: <InvoiceList /> },
  { path: "create-invoice", element: <CreateInvoice /> },
  { path: "payment-verification", element: <PaymentVerification /> },
  { path: "transactions", element: <TransactionHistory /> },
  { path: "approval-po", element: <FinancePurchasingApproval /> },
  { path: "pr/:id", element: <FinancePrDetail /> },
  { path: "po/:id", element: <FinancePoDetail /> },
  { path: "reports", element: <FinanceReports /> },
];

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />

          <Route path="/erp" element={<ERPLayout />}>
            <Route index element={<Navigate to="/login" replace />} />
            
            {/* Purchasing: Purchasing, Admin, Owner, Finance (read-only) */}
            <Route path="purchasing/*" element={<ProtectedRoute allowedRoles={['Purchasing', 'Admin', 'Owner', 'Finance']}><PurchasingModule /></ProtectedRoute>} />
            
            {/* SO: Sales, Admin, Owner */}
            <Route path="so/*" element={<ProtectedRoute allowedRoles={['Sales', 'Admin', 'Owner']}><SalesOrderModule /></ProtectedRoute>} />

            {/* Engineer: Engineering, Admin, Owner, Engineering Supervisor */}
            <Route path="engineer" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPage /></ProtectedRoute>} />
            <Route path="engineer-tasks" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTasksPage /></ProtectedRoute>} />
            <Route path="engineer-tasks/:id" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTaskDetailPage /></ProtectedRoute>} />
            <Route path="engineer-purchasing" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPurchasingPage /></ProtectedRoute>} />
            <Route path="engineer-qc" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringQCPage /></ProtectedRoute>} />
            <Route path="production" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><ProductionPage /></ProtectedRoute>} />
            <Route path="production/mr/:id" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><ProductionMaterialRequestPage /></ProtectedRoute>} />
            <Route path="qc" element={<ProtectedRoute allowedRoles={['Engineering', 'Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><QCPage /></ProtectedRoute>} />

            {/* Owner & Engineering Supervisor Approval */}
            <Route path="approval" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><OwnerApprovalPage /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><DashboardPage /></ProtectedRoute>} />
            <Route path="customer-analytics" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><CustomerAnalyticsPage /></ProtectedRoute>} />
            
            {/* Admin: Admin & Owner */}
            <Route path="admin" element={<ProtectedRoute allowedRoles={['Admin', 'Owner']}><AdminPage /></ProtectedRoute>} />
            <Route path="admin/products" element={<ProtectedRoute allowedRoles={['Admin', 'Owner']}><AdminProductsPage /></ProtectedRoute>} />
            <Route path="admin/suppliers" element={<ProtectedRoute allowedRoles={['Admin', 'Owner']}><SuppliersPage /></ProtectedRoute>} />
            <Route path="landing-page" element={<ProtectedRoute allowedRoles={['Admin', 'Owner']}><LandingPageEditor /></ProtectedRoute>} />

            {/* Finance: Finance, Admin, Owner */}
            <Route path="finance">
              <Route index element={<Navigate to="dashboard" replace />} />
              {financeRoutes.map(route => (
                <Route key={route.path} path={route.path} element={<ProtectedRoute allowedRoles={['Finance', 'Admin', 'Owner']}>{route.element}</ProtectedRoute>} />
              ))}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AppProvider>
  );
}

