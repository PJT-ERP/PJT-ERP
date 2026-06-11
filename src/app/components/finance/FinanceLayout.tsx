import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard, FileText, FilePlus, ShieldCheck,
  History, BarChart3, Menu, X, Bell, ChevronRight, Calculator,
  LogOut, Settings, Factory, ChevronDown, User, CheckSquare
} from 'lucide-react';

const navItems = [
  { to: '/erp/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/erp/finance/costing', label: 'Costing & Pricing', icon: Calculator },
  { to: '/erp/finance/invoices', label: 'Daftar Invoice', icon: FileText },
  { to: '/erp/finance/payment-verification', label: 'Verifikasi Pembayaran', icon: ShieldCheck, badge: 2 },
  { to: '/erp/finance/transactions', label: 'Riwayat Transaksi', icon: History },
  { to: '/erp/finance/approval-po', label: 'Approval PO', icon: CheckSquare },
  { to: '/erp/finance/reports', label: 'Laporan Keuangan', icon: BarChart3 },
];

const breadcrumbMap: Record<string, string[]> = {
  '/erp/finance/dashboard': ['Finance', 'Dashboard'],
  '/erp/finance/costing': ['Finance', 'Costing & Pricing'],
  '/erp/finance/invoices': ['Finance', 'Daftar Invoice'],
  '/erp/finance/create-invoice': ['Finance', 'Buat Invoice'],
  '/erp/finance/payment-verification': ['Finance', 'Verifikasi Pembayaran'],
  '/erp/finance/transactions': ['Finance', 'Riwayat Transaksi'],
  '/erp/finance/approval-po': ['Finance', 'Approval PO'],
  '/erp/finance/reports': ['Finance', 'Laporan Keuangan'],
};

export function FinanceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const crumbs = breadcrumbMap[location.pathname] ?? ['Finance'];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <Factory size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">PT Pratama Jaya</p>
            <p className="text-white text-xs font-semibold leading-tight">Tekindo</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Manufacturing ERP System</div>
      </div>

      {/* Module Badge */}
      <div className="px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-md px-3 py-2">
          <BarChart3 size={14} className="text-red-400" />
          <span className="text-red-300 text-xs font-semibold uppercase tracking-wider">Finance Module</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 pb-2 pt-1">Menu Utama</p>
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group relative ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-300 rounded-r-full" />}
                <Icon size={16} className={isActive ? 'text-red-100' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {badge && !isActive && (
                  <span className="text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5 font-semibold min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4 space-y-1">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-400 hover:bg-white/8 hover:text-slate-200 text-sm transition-all">
          <Settings size={15} />
          <span>Pengaturan</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Ahmad Fauzi</p>
            <p className="text-slate-500 text-[11px] truncate">Finance Manager</p>
          </div>
          <button 
            className="text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => window.location.href = '#/login'}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[#0D1B2A] h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 bg-[#0D1B2A] h-full z-50 shadow-2xl">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 shadow-sm">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                <span className={i === crumbs.length - 1 ? 'text-slate-800 font-medium truncate' : 'text-slate-400'}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="relative text-slate-500 hover:text-slate-800 p-2 rounded-md hover:bg-slate-100 transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">AF</span>
              </div>
              <span className="text-sm text-slate-700 font-medium">Ahmad Fauzi</span>
              <ChevronDown size={13} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
