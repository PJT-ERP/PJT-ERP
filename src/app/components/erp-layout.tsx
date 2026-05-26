import React, { useState } from "react";
import {
  LayoutDashboard, Users, Plus, List, ChevronRight, Menu, X, Bell, Search, LogOut, Building2,
  ShoppingCart, CheckSquare, Box, Activity, Wrench, FileText, ClipboardList
} from "lucide-react";
import { cn } from "./ui/utils";
import { useERPStore } from "../store/useERPStore";
import { useApp } from "./context/AppContext";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { UserRole } from "./data/mockData";

interface NavItemDef { label: string; icon: React.ReactNode; path: string; }

const ROLE_NAVIGATION: Record<UserRole, NavItemDef[]> = {
  Sales: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/so" },
    { label: "Daftar SO", icon: <List size={15} />, path: "/erp/so/list" },
    { label: "Buat SO Baru", icon: <Plus size={15} />, path: "/erp/so/create" },
    { label: "Pelanggan", icon: <Users size={15} />, path: "/erp/so/customers" },
  ],
  Engineering: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Purchasing Req", icon: <ShoppingCart size={15} />, path: "/erp/engineer-purchasing" },
    { label: "Quality Control", icon: <CheckSquare size={15} />, path: "/erp/engineer-qc" },
    { label: "Production", icon: <Box size={15} />, path: "/erp/production" },
    { label: "Prod Monitoring", icon: <Activity size={15} />, path: "/erp/production-monitoring" },
    { label: "Design Monitoring", icon: <Wrench size={15} />, path: "/erp/design-monitoring" },
    { label: "QC Monitoring", icon: <CheckSquare size={15} />, path: "/erp/qc" },
  ],
  Owner: [
    { label: "Executive Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/owner" },
  ],
  Admin: [
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin" },
  ],
  Finance: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/finance/dashboard" },
    { label: "Invoices", icon: <FileText size={15} />, path: "/erp/finance/invoices" },
    { label: "Payments", icon: <FileText size={15} />, path: "/erp/finance/payment-verification" },
  ],
  Purchasing: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/purchasing" },
    { label: "Material Requests", icon: <ClipboardList size={15} />, path: "/erp/purchasing/requests" },
    { label: "Purchase Orders", icon: <ShoppingCart size={15} />, path: "/erp/purchasing/orders" },
    { label: "Buat PO", icon: <Plus size={15} />, path: "/erp/purchasing/create" },
  ]
};

export function ERPLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { liveInvoices } = useERPStore();
  const readyInvoices = liveInvoices.filter(invoice => invoice.deliveryStatus === "invoice_ready");
  
  const { currentUser, logout, purchasingRequests } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const navItems = ROLE_NAVIGATION[currentUser.role] || [];
  
  // Create breadcrumb from URL path
  const paths = location.pathname.split("/").filter(Boolean);
  const breadcrumb = paths.slice(1); // skip "erp"

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 14px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: "#06B6D4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Building2 size={15} style={{ color: "#fff" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#E2E8F0", fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>PT Pratama Jaya</p>
          <p style={{ margin: 0, fontSize: "10px", color: "#334155", fontFamily: "Inter, sans-serif" }}>{currentUser.role} Module</p>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}
          style={{ color: "#334155", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
          <X size={14} />
        </button>
      </div>

      {/* Flat nav */}
      <nav style={{ flex: 1, padding: "10px 8px", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path !== `/erp/${paths[1]}` && location.pathname.startsWith(item.path));
          return (
            <NavItem
              key={item.label}
              item={item}
              active={active}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            />
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px", flexShrink: 0 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 6, cursor: "pointer", transition: "background 0.1s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#06B6D4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: "11px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>{currentUser.name}</p>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#334155", fontFamily: "Inter, sans-serif" }}>{currentUser.role}</p>
          </div>
          <button
            title="Keluar"
            onClick={() => { logout(); navigate("/login"); }}
            style={{ color: "#243B55", background: "none", border: "none", cursor: "pointer", display: "flex", transition: "color 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#64748B")}
            onMouseLeave={e => (e.currentTarget.style.color = "#243B55")}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-200",
          "lg:relative lg:translate-x-0 lg:shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: 200, background: "#0B1628" }}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header style={{
          height: 46, background: "#fff", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0,
        }}>
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}
            style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <Menu size={17} />
          </button>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0, fontFamily: "Inter, sans-serif", textTransform: "capitalize" }}>
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>ERP</span>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={11} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                <span style={{
                  fontSize: "11.5px",
                  color: i === breadcrumb.length - 1 ? "#1E293B" : "#94A3B8",
                  fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                  whiteSpace: "nowrap",
                }}>
                  {crumb.replace("-", " ")}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div className="hidden md:flex" style={{ alignItems: "center", gap: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 4, padding: "5px 10px" }}>
              <Search size={11} style={{ color: "#94A3B8" }} />
              <input
                placeholder="Search..."
                style={{ background: "transparent", border: "none", outline: "none", fontSize: "11.5px", color: "#64748B", fontFamily: "Inter, sans-serif", width: 140 }}
              />
            </div>
            <button
              title="Notifikasi"
              style={{ position: "relative", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E2E8F0", borderRadius: 4, background: "#fff", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <Bell size={14} style={{ color: "#64748B" }} />
              {(readyInvoices.length > 0 || purchasingRequests.length > 0) && (
                <span style={{
                  position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 99, background: "#EF4444", border: "2px solid #fff", color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: "12px", textAlign: "center",
                }}>
                  !
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }: { item: NavItemDef; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9,
        padding: "8px 10px", borderRadius: 5, border: "none",
        cursor: "pointer", textAlign: "left",
        fontFamily: "Inter, sans-serif", fontSize: "13px",
        fontWeight: active ? 500 : 400,
        background: active ? "rgba(6,182,212,0.1)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color: active ? "#E2E8F0" : hov ? "#94A3B8" : "#64748B",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span style={{ color: active ? "#06B6D4" : hov ? "#64748B" : "#3B5A7A", display: "flex", flexShrink: 0, transition: "color 0.1s" }}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}
