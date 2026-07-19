import React from "react";
import { LogOut } from "lucide-react";

export function UserProfileSection({
  currentUser,
  sidebarMinimized,
  logout,
  navigate,
}: {
  currentUser: any;
  sidebarMinimized: boolean;
  logout: () => void;
  navigate: (path: string) => void;
}) {
  return (
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
  );
}
