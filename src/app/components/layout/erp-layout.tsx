import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { ChevronRight, Menu } from "lucide-react";
import { cn } from "../ui/utils";
import { useApp } from "../context/AppContext";
import { useFinanceData } from "../finance/useFinanceData";
import { usePurchasingData } from "../purchasing/usePurchasingData";
import { mapPurchaseRequestsToPos, calcTotal } from "../purchasing/purchase-orders-page";
import { ROLE_NAVIGATION } from "./components/LayoutHelpers";
import { AppNavigationMenu } from "./components/AppNavigationMenu";
import { UserProfileSection } from "./components/UserProfileSection";
import { NotificationBadge } from "./components/NotificationBadge";
import { NotificationPanel } from "./components/NotificationPanel";
import { useNotifications } from "./hooks/useNotifications";

export function ERPLayout() {
  const { currentUser, logout, purchasingRequests, salesOrders } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try { 
      const userKey = currentUser?.username || 'default';
      return JSON.parse(localStorage.getItem(`dismissedNotifIds_${userKey}`) || '[]'); 
    } catch { return []; }
  });
  
  const dismissNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = [...dismissedNotifIds, id];
    setDismissedNotifIds(newDismissed);
    if (currentUser) {
      localStorage.setItem(`dismissedNotifIds_${currentUser.username}`, JSON.stringify(newDismissed));
    }
  };

  const canReadFinanceData = currentUser?.role === "Finance" 
    || currentUser?.role === "Admin"
    || currentUser?.role === "Owner"
    || currentUser?.role === "Sales";
  const canReadSupplierPayments = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";
  const { invoices, payments, supplierPayments } = useFinanceData(canReadFinanceData, canReadSupplierPayments, canReadSupplierPayments);
  const { purchaseRequests: backendPurchaseRequests, suppliers: purchasingSuppliers } = usePurchasingData(currentUser?.role === 'Finance');

  const location = useLocation();
  const navigate = useNavigate();

  const navItems = currentUser ? ROLE_NAVIGATION[currentUser.role] || [] : [];

  const paths = location.pathname.split("/").filter(Boolean);
  const breadcrumb = paths.slice(1).map(crumb => {
    if (crumb.length >= 10) {
      const so = salesOrders?.find(s => s.backendId === crumb || s.id.replace(/-/g, '') === crumb || s.id === crumb);
      if (so) return so.id;
      const pr = purchasingRequests?.find(p => p.backendId === crumb || p.id === crumb);
      if (pr) return pr.id;
    }
    return crumb;
  });

  const notifications = useNotifications({
    currentUser,
    salesOrders,
    purchasingRequests,
    invoices,
    payments,
    dismissedNotifIds,
  });

  const [lastViewedKeys, setLastViewedKeys] = useState<string[]>(() => {
    try { 
      const userKey = currentUser?.username || 'default';
      return JSON.parse(localStorage.getItem(`lastViewedKeys_${userKey}`) || '[]'); 
    } catch { return []; }
  });

  const getNotifKey = (n: { id: string, title: string }) => `${n.id}-${n.title}`;

  useEffect(() => {
    if (isNotifOpen) {
      const keys = notifications.map(getNotifKey);
      setLastViewedKeys(keys);
      if (currentUser) {
        localStorage.setItem(`lastViewedKeys_${currentUser.username}`, JSON.stringify(keys));
      }
    }
  }, [isNotifOpen, notifications, currentUser]);

  const unreadCount = notifications.filter(n => !lastViewedKeys.includes(getNotifKey(n))).length;
  const hasNotif = unreadCount > 0;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible" style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC" }}>
      {(sidebarOpen || isNotifOpen) && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => { setSidebarOpen(false); setIsNotifOpen(false); }} />
      )}

      <NotificationPanel
        isNotifOpen={isNotifOpen}
        setIsNotifOpen={setIsNotifOpen}
        currentUser={currentUser}
        notifications={notifications}
        dismissNotif={dismissNotif}
        navigate={navigate}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-200 overflow-hidden",
          "w-[200px]",
          "lg:relative lg:shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarMinimized ? "lg:w-[60px] lg:translate-x-0" : "lg:w-[200px] lg:translate-x-0"
        )}
        style={{ background: "#1F1F1F" }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 14px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          justifyContent: sidebarMinimized ? "center" : "flex-start"
        }}>
          <div style={{ width: 34, height: 34, background: "#ffffff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 3 }}>
            <img src="/pjt-logo-new.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          {!sidebarMinimized && (
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#F9FAFB", fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>PT Pratama Jaya</p>
              <p style={{ margin: 0, fontSize: "10px", color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{currentUser.role} Module</p>
            </div>
          )}
        </div>

        <AppNavigationMenu
          navItems={navItems}
          sidebarMinimized={sidebarMinimized}
          setSidebarOpen={setSidebarOpen}
        />

        <UserProfileSection
          currentUser={currentUser}
          sidebarMinimized={sidebarMinimized}
          logout={logout}
          navigate={navigate}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative print:overflow-visible">
        <header style={{
          height: 46, background: "#fff", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setSidebarMinimized(!sidebarMinimized);
              } else {
                setSidebarOpen(true);
              }
            }}
            style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer", display: "flex" }}
          >
            <Menu size={17} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0, fontFamily: "Inter, sans-serif", textTransform: "capitalize" }}>
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>ERP</span>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={11} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                <span style={{
                  fontSize: "11.5px",
                  color: i === breadcrumb.length - 1 ? "#111827" : "#94A3B8",
                  fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                  whiteSpace: "nowrap",
                }}>
                  {crumb.replace("-", " ")}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <NotificationBadge
              hasNotif={hasNotif}
              unreadCount={unreadCount}
              setIsNotifOpen={setIsNotifOpen}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ERPLayout;
