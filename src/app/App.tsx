import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppProvider } from "./components/context/AppContext";
import { Toaster } from "./components/ui/sonner";

import HomePage from "./pages/HomePage";
import { Login } from "./pages/Login";

const PurchasingModule = React.lazy(() => import("./pages/PurchasingModule"));
const SalesOrderModule = React.lazy(() => import("./pages/SalesOrderModule"));
const ERPLayout = React.lazy(() => import("./components/layout/erp-layout").then(m => ({ default: m.ERPLayout })));
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

const FinanceDashboard = React.lazy(() => import("./components/finance/FinanceDashboard").then(m => ({ default: m.FinanceDashboard })));
const FinanceCosting = React.lazy(() => import("./components/finance/FinanceCosting").then(m => ({ default: m.FinanceCosting })));
const InvoiceList = React.lazy(() => import("./components/finance/InvoiceList").then(m => ({ default: m.InvoiceList })));
const CreateInvoice = React.lazy(() => import("./components/finance/CreateInvoice").then(m => ({ default: m.CreateInvoice })));
const PaymentVerification = React.lazy(() => import("./components/finance/PaymentVerification").then(m => ({ default: m.PaymentVerification })));
const TransactionHistory = React.lazy(() => import("./components/finance/TransactionHistory").then(m => ({ default: m.TransactionHistory })));
const FinanceReports = React.lazy(() => import("./components/finance/FinanceReports").then(m => ({ default: m.FinanceReports })));
const FinancePurchasingApproval = React.lazy(() => import("./components/finance/FinancePurchasingApproval").then(m => ({ default: m.FinancePurchasingApproval })));
const FinancePrDetail = React.lazy(() => import("./components/finance/FinancePrDetail").then(m => ({ default: m.FinancePrDetail })));
const FinancePoDetail = React.lazy(() => import("./components/finance/FinancePoDetail").then(m => ({ default: m.FinancePoDetail })));

const AdminPage = React.lazy(() => import("./pages/admin").then(m => ({ default: m.AdminPage })));
const AdminProductsPage = React.lazy(() => import("./pages/admin/products").then(m => ({ default: m.AdminProductsPage })));
const SuppliersPage = React.lazy(() => import("./components/purchasing/suppliers-page").then(m => ({ default: m.SuppliersPage })));
const LandingPageEditor = React.lazy(() => import("./pages/admin/landing-editor").then(m => ({ default: m.LandingPageEditor })));
const EngineeringTasksPage = React.lazy(() => import("./pages/engineering/tasks").then(m => ({ default: m.EngineeringTasksPage })));
const EngineeringTaskDetailPage = React.lazy(() => import("./pages/engineering/task-detail").then(m => ({ default: m.EngineeringTaskDetailPage })));
const EngineeringPage = React.lazy(() => import("./pages/engineering").then(m => ({ default: m.EngineeringPage })));
const EngineeringPurchasingPage = React.lazy(() => import("./pages/engineering/purchasing").then(m => ({ default: m.EngineeringPurchasingPage })));
const QCInspectionsPage = React.lazy(() => import("./pages/qc/qc-inspections").then(m => ({ default: m.QCInspectionsPage })));
const OwnerApprovalPage = React.lazy(() => import("./pages/owner/approvals").then(m => ({ default: m.OwnerApprovalPage })));
const DashboardPage = React.lazy(() => import("./pages/dashboard").then(m => ({ default: m.DashboardPage })));
const CustomerAnalyticsPage = React.lazy(() => import("./pages/sales/analytics").then(m => ({ default: m.CustomerAnalyticsPage })));
const ProductionPage = React.lazy(() => import("./pages/Production").then(m => ({ default: m.ProductionPage })));
const ProductionMaterialRequestPage = React.lazy(() => import("./pages/Production/material-request").then(m => ({ default: m.ProductionMaterialRequestPage })));
const QCPage = React.lazy(() => import("./pages/qc/qc-dashboard").then(m => ({ default: m.QCPage })));

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
    <BrowserRouter>
      <AppProvider>
        <Suspense fallback={<div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#64748B"}}>Loading module...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />

            <Route path="/erp" element={<ERPLayout />}>
              <Route index element={<Navigate to="/login" replace />} />
              
              {/* Purchasing: Purchasing, Admin, Owner, Finance (read-only) */}
              <Route path="purchasing/*" element={<ProtectedRoute allowedRoles={['Purchasing', 'Admin', 'Owner', 'Finance']}><PurchasingModule /></ProtectedRoute>} />
              
              {/* SO: Available to all roles for viewing, but edit capabilities restricted internally */}
              <Route path="so/*" element={<ProtectedRoute allowedRoles={['Sales', 'Admin', 'Owner', 'Engineering', 'Engineering Supervisor', 'QC', 'Finance', 'Purchasing']}><SalesOrderModule /></ProtectedRoute>} />

              {/* Engineer: Engineering, Admin, Owner, Engineering Supervisor */}
              <Route path="engineer" element={<ProtectedRoute allowedRoles={['Engineering', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPage /></ProtectedRoute>} />
              <Route path="engineer-tasks" element={<ProtectedRoute allowedRoles={['Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTasksPage /></ProtectedRoute>} />
              <Route path="engineer-tasks/:id" element={<ProtectedRoute allowedRoles={['Engineering', 'Admin', 'Owner', 'Engineering Supervisor']}><EngineeringTaskDetailPage /></ProtectedRoute>} />
              <Route path="engineer-purchasing" element={<ProtectedRoute allowedRoles={['Admin', 'Owner', 'Engineering Supervisor']}><EngineeringPurchasingPage /></ProtectedRoute>} />
              <Route path="production" element={<ProtectedRoute allowedRoles={['Engineering', 'Admin', 'Owner', 'Engineering Supervisor']}><ProductionPage /></ProtectedRoute>} />
              <Route path="production/mr/:id" element={<ProtectedRoute allowedRoles={['Admin', 'Owner', 'Engineering Supervisor']}><ProductionMaterialRequestPage /></ProtectedRoute>} />

              {/* QC: QC, Admin, Owner */}
              <Route path="qc" element={<ProtectedRoute allowedRoles={['QC', 'Admin', 'Owner']}><QCPage /></ProtectedRoute>} />
              <Route path="qc/dashboard" element={<ProtectedRoute allowedRoles={['QC', 'Admin', 'Owner']}><QCPage /></ProtectedRoute>} />
              <Route path="qc/inspections" element={<ProtectedRoute allowedRoles={['QC', 'Admin', 'Owner']}><QCInspectionsPage /></ProtectedRoute>} />

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
        </Suspense>
        <Toaster position="top-center" richColors />
      </AppProvider>
    </BrowserRouter>
  );
}

