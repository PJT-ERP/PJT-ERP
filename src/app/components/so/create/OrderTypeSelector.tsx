import React from "react";
import { Plus, RefreshCw } from "lucide-react";

const S = {
  font: "Inter, sans-serif",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bgHover: "#E2E8F0",
  white: "#FFFFFF",
};

type OrderType = "new" | "repeat";

interface OrderTypeSelectorProps {
  onSelect: (type: OrderType) => void;
}

export function OrderTypeSelector({ onSelect }: OrderTypeSelectorProps) {
  const cards = [
    { type: "new" as const, icon: <Plus size={22} style={{ color: "#10B981" }} />, title: "Pesanan Baru (New Order)", desc: "Buat Sales Order baru dari awal. Dapat dilanjutkan ke request desain jika pesanan bersifat custom.", accentColor: "#10B981" },
    { type: "repeat" as const, icon: <RefreshCw size={22} style={{ color: "#6366F1" }} />, title: "Repeat Order", desc: "Pilih pelanggan existing dan ulangi order produk sebelumnya. Data auto-fill untuk mempercepat proses.", accentColor: "#6366F1" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, maxWidth: 860 }}>
      {cards.map(card => (
        <button key={card.type} onClick={() => onSelect(card.type)}
          style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `2px solid ${S.border}`, borderRadius: 8, padding: 22, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s", fontFamily: S.font }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = card.accentColor; (e.currentTarget).style.boxShadow = `0 4px 12px ${card.accentColor}33`; (e.currentTarget).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = S.border; (e.currentTarget).style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"; (e.currentTarget).style.transform = "translateY(0)"; }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 8, background: S.bgHover, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            {card.icon}
          </div>
          <h3 style={{ color: S.slate, margin: "0 0 6px", fontSize: "16px", fontWeight: 600 }}>{card.title}</h3>
          <p style={{ color: S.secondary, fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{card.desc}</p>
        </button>
      ))}
    </div>
  );
}
