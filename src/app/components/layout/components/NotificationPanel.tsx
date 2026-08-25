import React from "react";
import { X, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { cn } from "../../ui/utils";

export function NotificationPanel({
  isNotifOpen,
  setIsNotifOpen,
  currentUser,
  notifications,
  dismissNotif,
  navigate,
}: {
  isNotifOpen: boolean;
  setIsNotifOpen: (val: boolean) => void;
  currentUser: any;
  notifications: any[];
  dismissNotif: (id: string, e: React.MouseEvent) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-slate-200 print:hidden",
        isNotifOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid #E2E8F0" }}>
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
          // eslint-disable-next-line unused-imports/no-unused-vars
          notifications.map((n, i) => {
            const colors = {
              alert: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", icon: <AlertTriangle size={14} color="#DC2626" /> },
              warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", icon: <Activity size={14} color="#D97706" /> },
              success: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669", icon: <CheckCircle size={14} color="#059669" /> },
              info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", icon: <Activity size={14} color="#2563EB" /> },
            }[n.type as 'alert' | 'warning' | 'success' | 'info'];

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
  );
}
