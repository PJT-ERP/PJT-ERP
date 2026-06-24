import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppProvider } from "./components/context/AppContext";

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

// Migrated Pages from Folder B
import { AdminPage } from "./pages/AdminPage";
import { EngineeringTasksPage } from "./pages/EngineeringTasksPage";
import { EngineeringTaskDetailPage } from "./pages/EngineeringTaskDetailPage";
import { EngineeringPage } from "./pages/EngineeringPage";
import { EngineeringPurchasingPage } from "./pages/EngineeringPurchasingPage";
import { EngineeringQCPage } from "./pages/EngineeringQCPage";
import { OwnerApprovalPage } from "./pages/OwnerApprovalPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomerAnalyticsPage } from "./pages/CustomerAnalyticsPage";
import { ProductionPage } from "./pages/ProductionPage";
import { ProductionMaterialRequestPage } from "./pages/ProductionMaterialRequestPage";
import { QCPage } from "./pages/QCPage";

const financeRoutes = [
  { path: "dashboard", element: <FinanceDashboard /> },
  { path: "costing", element: <FinanceCosting /> },
  { path: "invoices", element: <InvoiceList /> },
  { path: "create-invoice", element: <CreateInvoice /> },
  { path: "payment-verification", element: <PaymentVerification /> },
  { path: "transactions", element: <TransactionHistory /> },
  { path: "approval-po", element: <FinancePurchasingApproval /> },
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
            
            {/* Purchasing: Purchasing, Admin, Owner */}
            <Route path="purchasing/*" element={<ProtectedRoute allowedRoles={['Purchasing', 'Admin', 'Owner']}><PurchasingModule /></ProtectedRoute>} />
            
            {/* SO: Sales, Admin, Owner */}
            <Route path="so/*" element={<ProtectedRoute allowedRoles={['Sales', 'Admin', 'Owner']}><SalesOrderModule /></ProtectedRoute>} />

            {/* Engineer: Engineering Worker, Admin, Owner, Engineering Supervisor */}
            <Route path="engineer" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPage /></ProtectedRoute>} />
            <Route path="engineer-tasks" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTasksPage /></ProtectedRoute>} />
            <Route path="engineer-tasks/:id" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTaskDetailPage /></ProtectedRoute>} />
            <Route path="engineer-purchasing" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPurchasingPage /></ProtectedRoute>} />
            <Route path="engineer-qc" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringQCPage /></ProtectedRoute>} />
            <Route path="production" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><ProductionPage /></ProtectedRoute>} />
            <Route path="production/mr/:id" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><ProductionMaterialRequestPage /></ProtectedRoute>} />
            <Route path="qc" element={<ProtectedRoute allowedRoles={['Engineering Worker', 'Admin', 'Owner', 'Engineering Supervisor']}><QCPage /></ProtectedRoute>} />

            {/* Owner & Engineering Supervisor Approval */}
            <Route path="approval" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><OwnerApprovalPage /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><DashboardPage /></ProtectedRoute>} />
            <Route path="customer-analytics" element={<ProtectedRoute allowedRoles={['Owner', 'Engineering Supervisor']}><CustomerAnalyticsPage /></ProtectedRoute>} />
            
            {/* Admin: Admin & Owner */}
            <Route path="admin" element={<ProtectedRoute allowedRoles={['Admin', 'Owner']}><AdminPage /></ProtectedRoute>} />

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
    </AppProvider>
  );
}

