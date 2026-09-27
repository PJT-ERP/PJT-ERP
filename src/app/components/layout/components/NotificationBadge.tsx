import React from "react";
import { Bell, AtSign } from "lucide-react";

export function NotificationBadge({
  hasNotif,
  unreadCount,
  hasUnreadMention = false,
  setIsNotifOpen,
}: {
  hasNotif: boolean;
  unreadCount: number;
  hasUnreadMention?: boolean;
  setIsNotifOpen: (val: boolean) => void;
}) {
  return (
    <button
      title={hasUnreadMention ? "Notifikasi — Anda di-tag di komentar" : "Notifikasi"}
      onClick={() => setIsNotifOpen(true)}
      style={{ position: "relative", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E2E8F0", borderRadius: 4, background: "#fff", cursor: "pointer", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
    >
      <Bell size={14} style={{ color: "#64748B" }} />
      {hasNotif && (hasUnreadMention ? (
        <span style={{
          position: "absolute", top: -6, right: -6, width: 18, height: 18,
          borderRadius: 99, background: "#2563EB", border: "2px solid #fff", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AtSign size={10} strokeWidth={3} />
        </span>
      ) : (
        <span style={{
          position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px",
          borderRadius: 99, background: "#EF4444", border: "2px solid #fff", color: "#fff",
          fontSize: 9, fontWeight: 700, lineHeight: "12px", textAlign: "center",
        }}>
          {unreadCount}
        </span>
      ))}
    </button>
  );
}
