import React from "react";
import { Bell } from "lucide-react";

export function NotificationBadge({
  hasNotif,
  unreadCount,
  setIsNotifOpen,
}: {
  hasNotif: boolean;
  unreadCount: number;
  setIsNotifOpen: (val: boolean) => void;
}) {
  return (
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
  );
}
