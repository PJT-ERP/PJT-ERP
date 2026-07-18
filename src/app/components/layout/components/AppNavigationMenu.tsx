import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { NavItemDef } from "./LayoutHelpers";

export function AppNavigationMenu({
  navItems,
  sidebarMinimized,
  setSidebarOpen,
}: {
  navItems: NavItemDef[];
  sidebarMinimized: boolean;
  setSidebarOpen: (val: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
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
