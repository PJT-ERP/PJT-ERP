import React from "react";
import { CheckSquare, Package, FileWarning } from "lucide-react";
import { S, SystemMessage } from "../ProductionHelpers";

export function SystemMessageDialog({ message, onClose }: { message: SystemMessage; onClose: () => void }) {
  const tone = {
    success: { bg: "#DCFCE7", border: "#BBF7D0", color: "#15803D", icon: <CheckSquare size={24} /> },
    info: { bg: "#E0F2FE", border: "#BAE6FD", color: "#0369A1", icon: <Package size={24} /> },
    warning: { bg: "#FEF3C7", border: "#FCD34D", color: "#B45309", icon: <FileWarning size={24} /> },
    error: { bg: "#FEE2E2", border: "#FCA5A5", color: "#B91C1C", icon: <FileWarning size={24} /> },
  }[message.tone];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div style={{ width: "100%", maxWidth: 480, background: S.white, borderRadius: 12, border: `1px solid ${S.border}`, boxShadow: "0 20px 45px rgba(15,23,42,0.18)", overflow: "hidden", fontFamily: S.font }}>
        <div style={{ padding: "18px 22px", display: "flex", gap: 14, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {tone.icon}
          </div>
          <div>
            <h3 style={{ margin: 0, color: S.slate, fontSize: 18, fontWeight: 700 }}>{message.title}</h3>
            <p style={{ margin: "5px 0 0", color: S.secondary, fontSize: 13.5, lineHeight: 1.5 }}>{message.message}</p>
          </div>
        </div>
        {message.steps && message.steps.length > 0 && (
          <div style={{ padding: "16px 22px", background: S.bg }}>
            <p style={{ margin: "0 0 10px", color: S.slate, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Alur Berikutnya</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {message.steps.map((step, index) => (
                <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: S.white, border: `1px solid ${S.border}`, color: S.slate, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ color: S.slate, fontSize: 13, lineHeight: 1.45 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding: "14px 22px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
