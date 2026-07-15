import React, { useState } from "react";
import {
  LayoutDashboard, Users, Plus, List, ChevronRight, Menu, X, Bell, Search, LogOut, Building2,
  ShoppingCart, CheckSquare, Box, Activity, Wrench, FileText, ClipboardList, Package, DollarSign, CheckCircle, Shield, BarChart2, AlertTriangle, LayoutTemplate
} from "lucide-react";
import { cn } from "../ui/utils";
import { useApp } from "../context/AppContext";
import { useFinanceData } from "../finance/useFinanceData";
import { mapPurchaseRequestsToPos, calcTotal } from "../purchasing/purchase-orders-page";
import { usePurchasingData } from "../purchasing/usePurchasingData";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { UserRole } from "../data/mockData";

interface NavItemDef { label: string; icon?: React.ReactNode; path?: string; activePrefix?: string; isHeader?: boolean; }

const ROLE_NAVIGATION: Record<UserRole, NavItemDef[]> = {
  Sales: [
    { label: "Dashboard Penjualan", icon: <LayoutDashboard size={15} />, path: "/erp/so/dashboard" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
    { label: "Pelanggan", icon: <Users size={15} />, path: "/erp/so/customers" },
  ],
  'Engineering': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
  ],
  'Engineering Supervisor': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Daftar Tugas", icon: <List size={15} />, path: "/erp/engineer-tasks" },
    { label: "Req. Pembelian", icon: <Package size={15} />, path: "/erp/engineer-purchasing" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
  ],
  QC: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/qc" },
    { label: "Inspeksi QC", icon: <Shield size={15} />, path: "/erp/qc/inspections" },
  ],
  Owner: [
    { label: "MENU UTAMA", isHeader: true },
    { label: "Dashboard Eksekutif", icon: <LayoutDashboard size={15} />, path: "/erp/dashboard" },
    { label: "Analitik Pelanggan", icon: <BarChart2 size={15} />, path: "/erp/customer-analytics" },
    { label: "PANTAU", isHeader: true },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/qc/inspections", activePrefix: "/erp/qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Keuangan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
    { label: "Landing Page", icon: <LayoutTemplate size={15} />, path: "/erp/landing-page", activePrefix: "/erp/landing-page" },
  ],
  Admin: [
    { label: "Keuangan & Tagihan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/qc/inspections", activePrefix: "/erp/qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Stok Gudang", icon: <Box size={15} />, path: "/erp/purchasing/inventory" },
    { label: "Master Produk", icon: <Package size={15} />, path: "/erp/admin/products" },
    { label: "Daftar Supplier", icon: <Building2 size={15} />, path: "/erp/admin/suppliers" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
    { label: "Landing Page", icon: <LayoutTemplate size={15} />, path: "/erp/landing-page", activePrefix: "/erp/landing-page" },
  ],
  Finance: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/finance/dashboard" },
    { label: "Laporan", icon: <BarChart2 size={15} />, path: "/erp/finance/reports" },
    { label: "Costing & Pricing", icon: <DollarSign size={15} />, path: "/erp/finance/costing" },
    { label: "Daftar Tagihan", icon: <FileText size={15} />, path: "/erp/finance/invoices" },
    { label: "Verifikasi Bayar", icon: <FileText size={15} />, path: "/erp/finance/payment-verification" },
    { label: "Tagihan Supplier", icon: <CheckSquare size={15} />, path: "/erp/finance/approval-po" },
  ],
  Purchasing: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/purchasing/dashboard" },
    { label: "BOM Produk", icon: <Package size={15} />, path: "/erp/purchasing/products" },
    { label: "Stok Gudang", icon: <Box size={15} />, path: "/erp/purchasing/inventory" },
    { label: "Req. Material", icon: <ClipboardList size={15} />, path: "/erp/purchasing/requests" },
    { label: "Daftar PO", icon: <ShoppingCart size={15} />, path: "/erp/purchasing/orders" },
    { label: "Daftar Supplier", icon: <Users size={15} />, path: "/erp/purchasing/suppliers" },
  ]
};

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
  const readyInvoices = invoices.filter(invoice => invoice.status === "PENDING" && invoice.paidAmount <= 0);

  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const navItems = ROLE_NAVIGATION[currentUser.role] || [];

  // Create breadcrumb from URL path
  const paths = location.pathname.split("/").filter(Boolean);
  const breadcrumb = paths.slice(1).map(crumb => {
    if (crumb.length >= 10) { // Enough to match UUIDs or backend IDs
      const so = salesOrders?.find(s => s.backendId === crumb || s.id.replace(/-/g, '') === crumb || s.id === crumb);
      if (so) return so.id;
      const pr = purchasingRequests?.find(p => p.backendId === crumb || p.id === crumb);
      if (pr) return pr.id;
    }
    return crumb;
  });

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
            item.activePrefix ? (location.pathname.startsWith(item.activePrefix) && !navItems.some(other => other.path && other.path !== item.path && (location.pathname === other.path || location.pathname.startsWith(other.path + "/")))) :
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
    const notifs: { id: string, type: 'alert' | 'warning' | 'success' | 'info', title: string, desc: string, targetPath?: string, isDismissible?: boolean }[] = [];
    const role = currentUser.role;

    if (role === 'Owner') {
      // Owner hanya memantau info, tidak melakukan approval.
      // Jika ada insight kritis lain, bisa ditambahkan di sini.
    } else if (role === 'Sales') {
      salesOrders.forEach(so => {
        if (so.status === 'Waiting Pricing') {
          notifs.push({ id: so.id, type: 'warning', title: 'Harga Sedang Dihitung', desc: `SO ${so.id} sedang dihitung harganya oleh Finance.`, targetPath: `/erp/so/detail/${so.id}` });
        }
        if (so.status === 'Waiting Payment') {
          const invoice = invoices.find(inv => inv.soNumber === so.soNumber);
          const hasReportedPayment = invoice && payments.some(p => p.invoiceId === invoice.id && (p.status === "PENDING" || p.status === "VERIFIED"));
          if (!hasReportedPayment) {
            notifs.push({ id: so.id, type: 'success', title: 'Tagihan Siap', desc: `Invoice untuk SO ${so.id} siap dibayar oleh pelanggan.`, targetPath: `/erp/so/detail/${so.id}` });
          }
        }
        if (so.status === 'Rejected') {
          notifs.push({ id: so.id, type: 'alert', title: 'SO Ditolak / Direvisi', desc: `SO ${so.id} dikembalikan untuk direvisi.`, targetPath: `/erp/so/detail/${so.id}` });
        }
        if (so.status === 'Completed') {
          const notifId = `so-comp-${so.id}`;
          if (!dismissedNotifIds.includes(notifId)) {
            notifs.push({ id: notifId, type: 'success', title: 'Pesanan Selesai', desc: `SO ${so.id} telah selesai diproduksi dan lunas.`, targetPath: `/erp/so/detail/${so.id}`, isDismissible: true });
          }
        }

        const invoice = invoices.find(inv => inv.soNumber === so.soNumber);
        if (invoice) {
          const invPayments = payments.filter(p => p.invoiceId === invoice.id);
          const latestPayment = invPayments[invPayments.length - 1];
          if (latestPayment && latestPayment.status === "REJECTED") {
            notifs.push({ id: `pay-rej-${latestPayment.id}`, type: 'alert', title: 'Pembayaran Ditolak', desc: `Laporan pembayaran Invoice ${invoice.invoiceNumber} ditolak Finance. Harap unggah ulang.`, targetPath: `/erp/so/detail/${so.id}` });
          }
          if (latestPayment && latestPayment.status === "VERIFIED") {
            const notifId = `pay-ver-${latestPayment.id}`;
            if (!dismissedNotifIds.includes(notifId)) {
              notifs.push({ id: notifId, type: 'success', title: 'Pembayaran Diverifikasi', desc: `Pembayaran Invoice ${invoice.invoiceNumber} telah diverifikasi Finance.`, targetPath: `/erp/so/detail/${so.id}`, isDismissible: true });
            }
          }
        }
      });
    } else if (role === 'Engineering' || role === 'Engineering Supervisor') {
      const isSpv = role === 'Engineering Supervisor' || currentUser.username === 'eng_spv';
      
      const isRelevant = (assignedToId: string | null | undefined) => {
        if (isSpv) return !assignedToId || assignedToId === currentUser.id;
        return assignedToId === currentUser.id;
      };

      salesOrders.filter(so => so.status === 'Pending Design' || so.backendDesignStatus === 'PendingDesign' || so.backendDesignStatus === 'RevisionRequired').forEach(so => {
        if (!isRelevant(so.designAssignedTo)) return;
        const isUnassigned = !so.designAssignedTo;
        const title = isUnassigned && isSpv ? 'Butuh Penugasan Desain' : 'Desain Baru Dibutuhkan';
        const desc = isUnassigned && isSpv ? `SO ${so.id} belum ditugaskan ke engineer.` : `SO ${so.id} menunggu desain dan BOM.`;
        notifs.push({ id: so.id, type: 'warning', title, desc, targetPath: '/erp/engineer-tasks' });
      });
      
      if (isSpv) {
        salesOrders.filter(so => so.backendDesignStatus === 'WaitingApproval').forEach(so => {
          notifs.push({ id: so.id, type: 'warning', title: 'Desain Butuh Review', desc: `SO ${so.id} menunggu approval Engineering Supervisor.`, targetPath: '/erp/engineer-tasks' });
        });
      }

      salesOrders.filter(so => so.status === 'Ready for Production').forEach(so => {
        if (!isRelevant(so.assignedTo)) return;
        const isUnassigned = !so.assignedTo;
        const isReturnedToSpv = isUnassigned && !!so.rejectionReason;
        const title = isReturnedToSpv ? 'SO Dikembalikan ke SPV' : (isUnassigned && isSpv ? 'Butuh Penugasan Produksi' : 'Siap Diproduksi');
        const desc = isReturnedToSpv ? `SO ${so.id} dikembalikan oleh operator: "${so.rejectionReason}"` : (isUnassigned && isSpv ? `SO ${so.id} belum ditugaskan ke pekerja.` : `SO ${so.id} siap untuk mulai diproduksi.`);
        notifs.push({ id: so.id, type: isReturnedToSpv ? 'alert' : 'info', title, desc, targetPath: '/erp/production' });
      });

      salesOrders.filter(so => so.status === 'QC').forEach(so => {
        if (!isSpv) return;
        notifs.push({ id: so.id, type: 'alert', title: 'Menunggu QC', desc: `SO ${so.id} menunggu proses Quality Control.`, targetPath: '/erp/engineer-qc' });
      });

      purchasingRequests.forEach(pr => {
        if (pr.status === 'Selesai' && pr.requestedBy === currentUser.name) {
          const notifId = `pr-received-${pr.id}`;
          if (!dismissedNotifIds.includes(notifId)) {
            notifs.push({ 
              id: notifId, 
              type: 'success', 
              title: 'Material Diterima', 
              desc: `Material untuk ${pr.id} telah diterima oleh gudang.`, 
              targetPath: '/erp/engineer-purchasing',
              isDismissible: true
            });
          }
        }
      });
    } else if (role === 'Purchasing') {
      purchasingRequests.forEach(pr => {
        const activeItems = pr.items?.filter(item => item.purchaseStatus !== "Rejected") || [];
        const isReadyForFinance = activeItems.length > 0 && activeItems.every(i => !!i.supplierName && ((i.totalPrice || 0) > 0 || (i.estimatedPrice || 0) > 0));
        const hasUnorderedItems = activeItems.some(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received");

        if (pr.backendStatus === 'SupervisorApproved' && !isReadyForFinance && hasUnorderedItems) {
          notifs.push({ id: pr.id, type: 'warning', title: 'Isi Harga MR', desc: `MR ${pr.id} telah disetujui Supervisor. Harap isi estimasi harga dan pilih supplier.`, targetPath: `/erp/purchasing/requests/${pr.id}` });
        } else if (pr.backendStatus === 'FinanceApproved' && hasUnorderedItems) {
          notifs.push({ id: pr.id, type: 'success', title: 'MR Disetujui Finance', desc: `MR ${pr.id} disetujui. Segera rilis PO.`, targetPath: `/erp/purchasing/create?reqId=${pr.id}` });
        }
      });
    } else if (role === 'Finance') {
      salesOrders.filter(so => {
        if (so.status === 'Waiting Pricing' || so.backendStatus === 'Waiting Pricing') return true;
        const hasInvoice = invoices.some(inv => inv.soNumber === so.soNumber);
        return so.backendDesignStatus === "Approved"
          && so.status !== "Waiting Payment" && so.backendStatus !== "Waiting Payment"
          && so.status !== "Completed" && so.backendStatus !== "Completed"
          && !hasInvoice;
      }).forEach(so => {
        notifs.push({ id: so.id, type: 'warning', title: 'Permintaan Harga', desc: `Hitung estimasi COGS & buat Invoice untuk SO ${so.id}.`, targetPath: '/erp/finance/costing' });
      });
      payments.filter(p => p.status === 'PENDING').forEach(payment => {
        notifs.push({ id: payment.id, type: 'info', title: 'Verifikasi Pembayaran', desc: `Pembayaran untuk Invoice ${payment.invoiceNumber} menunggu verifikasi.`, targetPath: '/erp/finance/payment-verification' });
      });
      purchasingRequests.filter(pr => pr.backendStatus === 'SupervisorApproved').forEach(pr => {
        notifs.push({ id: pr.id, type: 'alert', title: 'Persetujuan Anggaran', desc: `Purchase Request ${pr.id} menunggu persetujuan anggaran.`, targetPath: '/erp/finance/approval-po' });
      });
      const allPos = mapPurchaseRequestsToPos(backendPurchaseRequests, supplierPayments || [], purchasingSuppliers || []);
      const paymentPos = allPos.filter(po => po.items.length > 0 && calcTotal(po.items) > 0);
      paymentPos.filter(p => p.paymentStatus !== 'Paid').forEach(po => {
        notifs.push({ id: po.id, type: 'warning', title: 'Tagihan Supplier (AP)', desc: `Tagihan ${po.id} dari ${po.supplier} menunggu pembayaran.`, targetPath: '/erp/finance/approval-po' });
      });
    } else if (role === 'Admin') {
      purchasingRequests.filter(pr => pr.status === 'Pending').forEach(pr => {
        notifs.push({ id: pr.id, type: 'alert', title: 'MR Butuh Approval', desc: `MR ${pr.id} butuh persetujuan segera.`, targetPath: '/erp/purchasing/requests' });
      });
    }
    return notifs;
  }, [currentUser, salesOrders, purchasingRequests, readyInvoices, dismissedNotifIds, invoices, payments]);

  const [lastViewedKeys, setLastViewedKeys] = React.useState<string[]>(() => {
    try { 
      const userKey = currentUser?.username || 'default';
      return JSON.parse(localStorage.getItem(`lastViewedKeys_${userKey}`) || '[]'); 
    } catch { return []; }
  });

  const getNotifKey = (n: { id: string, title: string }) => `${n.id}-${n.title}`;

  React.useEffect(() => {
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

  return (
    <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible" style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC" }}>
      {(sidebarOpen || isNotifOpen) && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => { setSidebarOpen(false); setIsNotifOpen(false); }} />
      )}

      {/* Slide-over Notifikasi */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-slate-200 print:hidden",
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
                <div key={n.id} onClick={() => { if(n.targetPath) { setIsNotifOpen(false); navigate(n.targetPath); } }} style={{ display: "flex", gap: "12px", padding: "12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "8px", cursor: "pointer", position: "relative" }}>
                  <div style={{ marginTop: 2 }}>{colors.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: colors.text }}>{n.title}</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>{n.desc}</p>
                  </div>
                  {n.isDismissible && (
                    <button 
                      onClick={(e) => dismissNotif(n.id, e)} 
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.5 }}
                      title="Tutup Notifikasi"
                    >
                      <X size={14} />
                    </button>
                  )}
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative print:overflow-visible">
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
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative print:overflow-visible">
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
