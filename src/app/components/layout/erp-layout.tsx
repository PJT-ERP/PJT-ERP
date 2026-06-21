import React, { useState } from "react";
import {
  LayoutDashboard, Users, Plus, List, ChevronRight, Menu, X, Bell, Search, LogOut, Building2,
  ShoppingCart, CheckSquare, Box, Activity, Wrench, FileText, ClipboardList, Package, DollarSign, CheckCircle, Shield, BarChart2, AlertTriangle
} from "lucide-react";
import { cn } from "../ui/utils";
import { useApp } from "../context/AppContext";
import { useFinanceData } from "../finance/useFinanceData";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { UserRole } from "../data/mockData";

interface NavItemDef { label: string; icon?: React.ReactNode; path?: string; activePrefix?: string; isHeader?: boolean; }

const ROLE_NAVIGATION: Record<UserRole, NavItemDef[]> = {
  Sales: [
    { label: "Dashboard Penjualan", icon: <LayoutDashboard size={15} />, path: "/erp/so/dashboard" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
    { label: "Pelanggan", icon: <Users size={15} />, path: "/erp/so/customers" },
  ],
  'Engineering Worker': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Daftar Tugas", icon: <List size={15} />, path: "/erp/engineer-tasks" },
    { label: "Req. Pembelian", icon: <ShoppingCart size={15} />, path: "/erp/engineer-purchasing" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
    { label: "Pantau QC", icon: <CheckSquare size={15} />, path: "/erp/qc" },
  ],
  'Engineering Supervisor': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Daftar Tugas", icon: <List size={15} />, path: "/erp/engineer-tasks" },
    { label: "Req. Pembelian", icon: <Package size={15} />, path: "/erp/engineer-purchasing" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
    { label: "Inspeksi QC", icon: <Shield size={15} />, path: "/erp/engineer-qc" },
  ],
  Owner: [
    { label: "MENU UTAMA", isHeader: true },
    { label: "Dashboard Eksekutif", icon: <LayoutDashboard size={15} />, path: "/erp/dashboard" },
    { label: "Analitik Pelanggan", icon: <BarChart2 size={15} />, path: "/erp/customer-analytics" },
    { label: "PANTAU", isHeader: true },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/engineer-qc", activePrefix: "/erp/engineer-qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Keuangan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
  ],
  Admin: [
    { label: "Keuangan & Tagihan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/engineer-qc", activePrefix: "/erp/engineer-qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
  ],
  Finance: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/finance/dashboard" },
    { label: "Costing & Pricing", icon: <DollarSign size={15} />, path: "/erp/finance/costing" },
    { label: "Daftar Tagihan", icon: <FileText size={15} />, path: "/erp/finance/invoices" },
    { label: "Verifikasi Bayar", icon: <FileText size={15} />, path: "/erp/finance/payment-verification" },
    { label: "Approval MR", icon: <CheckSquare size={15} />, path: "/erp/finance/approval-po" },
  ],
  Purchasing: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/purchasing/dashboard" },
    // { label: "Stok Gudang", icon: <Box size={15} />, path: "/erp/purchasing/inventory" },
    { label: "Req. Material", icon: <ClipboardList size={15} />, path: "/erp/purchasing/requests" },
    { label: "Daftar PO", icon: <ShoppingCart size={15} />, path: "/erp/purchasing/orders" },
    { label: "Buat PO", icon: <Plus size={15} />, path: "/erp/purchasing/create" },
    { label: "Daftar Supplier", icon: <Users size={15} />, path: "/erp/purchasing/suppliers" },
  ]
};

export function ERPLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { currentUser, logout, purchasingRequests, salesOrders } = useApp();
  const canReadFinanceData = currentUser?.role === "Finance"
    || currentUser?.role === "Admin"
    || currentUser?.role === "Owner"
    || currentUser?.role === "Sales";
  const { invoices } = useFinanceData(canReadFinanceData);
  const readyInvoices = invoices.filter(invoice => invoice.status === "PENDING" && invoice.paidAmount <= 0);

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
        {!sidebarMinimized && (
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}
            style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Flat nav */}
      <nav style={{ flex: 1, padding: "10px 8px", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(item => {
          if (item.isHeader) {
            if (sidebarMinimized) return <div key={item.label} style={{ height: 20 }} />;
            return (
              <p key={item.label} style={{ fontSize: "10.5px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", padding: "12px 10px 4px", fontWeight: 600 }}>
                {item.label}
              </p>
            );
          }
          const active = item.path ? (
            item.activePrefix ? location.pathname.startsWith(item.activePrefix) :
              (location.pathname === item.path ||
                (location.pathname.startsWith(item.path + "/") && !navItems.some(other => other.path && other.path !== item.path && other.path.length > item.path!.length && location.pathname.startsWith(other.path))))
          ) : false;
          return (
            <NavItem
              key={item.label}
              item={item}
              active={active}
              minimized={sidebarMinimized}
              onClick={() => { if (item.path) navigate(item.path); setSidebarOpen(false); }}
            />
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px", flexShrink: 0 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 6, cursor: "pointer", transition: "background 0.1s", justifyContent: sidebarMinimized ? "center" : "flex-start" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#C8102E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: "11px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          {!sidebarMinimized && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "#E5E7EB", fontFamily: "Inter, sans-serif" }}>{currentUser.name}</p>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{currentUser.role}</p>
              </div>
              <button
                title="Keluar"
                onClick={() => { logout(); navigate("/login"); }}
                style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", display: "flex", transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#E5E7EB")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  const notifications = React.useMemo(() => {
    if (!currentUser) return [];
    const notifs: { id: string, type: 'alert' | 'warning' | 'success' | 'info', title: string, desc: string, targetPath?: string }[] = [];
    const role = currentUser.role;

    if (role === 'Owner') {
      // Owner hanya memantau info, tidak melakukan approval.
      // Jika ada insight kritis lain, bisa ditambahkan di sini.
    } else if (role === 'Sales') {
      salesOrders.filter(so => so.status === 'Waiting Payment' || so.status === 'Waiting Pricing').forEach(so => {
        if (so.status === 'Waiting Pricing') {
          notifs.push({ id: so.id, type: 'info', title: 'Harga Sedang Dihitung', desc: `SO ${so.id} sedang dihitung harganya oleh Finance.`, targetPath: `/erp/so/detail/${so.id}` });
        } else {
          notifs.push({ id: so.id, type: 'info', title: 'Tagihan Siap', desc: `Invoice untuk SO ${so.id} siap dibayar oleh pelanggan.`, targetPath: `/erp/so/detail/${so.id}` });
        }
      });
      salesOrders.filter(so => so.status === 'Rejected').forEach(so => {
        notifs.push({ id: so.id, type: 'alert', title: 'SO Ditolak / Direvisi', desc: `SO ${so.id} dikembalikan untuk direvisi.`, targetPath: `/erp/so/detail/${so.id}` });
      });
    } else if (role === 'Engineering Worker' || role === 'Engineering Supervisor') {
      salesOrders.filter(so => so.status === 'Pending Design' || so.backendDesignStatus === 'PendingDesign' || so.backendDesignStatus === 'RevisionRequired').forEach(so => {
        notifs.push({ id: so.id, type: 'warning', title: 'Desain Baru Dibutuhkan', desc: `SO ${so.id} menunggu desain dan BOM.`, targetPath: '/erp/engineer-tasks' });
      });
      if (role === 'Engineering Supervisor') {
        salesOrders.filter(so => so.backendDesignStatus === 'WaitingApproval').forEach(so => {
          notifs.push({ id: so.id, type: 'warning', title: 'Desain Butuh Review', desc: `SO ${so.id} menunggu approval Engineering Supervisor.`, targetPath: '/erp/engineer-tasks' });
        });
      }
    } else if (role === 'Purchasing') {
      purchasingRequests.filter(pr => pr.status === 'Selesai').forEach(pr => {
        notifs.push({ id: pr.id, type: 'success', title: 'MR Disetujui', desc: `MR ${pr.id} disetujui. Segera rilis PO.`, targetPath: '/erp/purchasing/create' });
      });
    } else if (role === 'Finance') {
      salesOrders.filter(so => so.status === 'Waiting Pricing').forEach(so => {
        notifs.push({ id: so.id, type: 'warning', title: 'Permintaan Harga', desc: `Hitung estimasi COGS & buat Invoice untuk SO ${so.id}.`, targetPath: '/erp/finance/costing' });
      });
      readyInvoices.forEach(inv => {
        notifs.push({ id: inv.id, type: 'info', title: 'Tagihan Menunggu Pembayaran', desc: `Invoice ${inv.invoiceNumber} menunggu verifikasi pembayaran.`, targetPath: '/erp/finance/invoices' });
      });
    } else if (role === 'Admin') {
      purchasingRequests.filter(pr => pr.status === 'Pending').forEach(pr => {
        notifs.push({ id: pr.id, type: 'alert', title: 'MR Butuh Approval', desc: `MR ${pr.id} butuh persetujuan segera.`, targetPath: '/erp/purchasing/requests' });
      });
    }
    return notifs;
  }, [currentUser, salesOrders, purchasingRequests, readyInvoices]);

  const hasNotif = notifications.length > 0;

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC" }}>
      {(sidebarOpen || isNotifOpen) && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => { setSidebarOpen(false); setIsNotifOpen(false); }} />
      )}

      {/* Slide-over Notifikasi */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-slate-200",
          isNotifOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid #E2E8F0" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#1F2937" }}>Action Center</h3>
            <p style={{ margin: 0, fontSize: "11px", color: "#6B7280" }}>Role: {currentUser.role}</p>
          </div>
          <button onClick={() => setIsNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 40, color: "#9CA3AF" }}>
              <CheckCircle size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
              <p style={{ fontSize: "12px" }}>Tidak ada task/notifikasi tertunda.</p>
            </div>
          ) : (
            notifications.map((n, i) => {
              const colors = {
                alert: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", icon: <AlertTriangle size={14} color="#DC2626" /> },
                warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", icon: <Activity size={14} color="#D97706" /> },
                success: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669", icon: <CheckCircle size={14} color="#059669" /> },
                info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", icon: <Activity size={14} color="#2563EB" /> },
              }[n.type];

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (n.targetPath) {
                      navigate(n.targetPath);
                      setIsNotifOpen(false);
                    }
                  }}
                  style={{ padding: "12px", borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, cursor: n.targetPath ? "pointer" : "default" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    {colors.icon}
                    <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: colors.text }}>{n.title}</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#4B5563", lineHeight: 1.4 }}>{n.desc}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

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
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
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

          {/* Breadcrumb */}
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

            <button
              title="Notifikasi"
              onClick={() => setIsNotifOpen(true)}
              style={{ position: "relative", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E2E8F0", borderRadius: 4, background: "#fff", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <Bell size={14} style={{ color: "#64748B" }} />
              {hasNotif && (
                <span style={{
                  position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 99, background: "#EF4444", border: "2px solid #fff", color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: "12px", textAlign: "center",
                }}>
                  {notifications.length}
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

function NavItem({ item, active, onClick, minimized }: { item: NavItemDef; active: boolean; onClick: () => void; minimized?: boolean }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9,
        padding: "8px 10px", borderRadius: active ? "0 4px 4px 0" : 4, border: "none",
        borderLeft: active ? "4px solid #C8102E" : "4px solid transparent",
        cursor: "pointer", textAlign: "left",
        fontFamily: "Inter, sans-serif", fontSize: "13px",
        fontWeight: active ? 500 : 400,
        background: active ? "rgba(200,16,46,0.12)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "#F9FAFB" : hov ? "#F9FAFB" : "#D1D5DB",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span style={{ color: active ? "#C8102E" : hov ? "#D1D5DB" : "#9CA3AF", display: "flex", flexShrink: 0, transition: "color 0.1s", margin: minimized ? "0 auto" : 0 }}>
        {item.icon}
      </span>
      {!minimized && item.label}
    </button>
  );
}
