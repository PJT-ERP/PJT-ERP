import React from "react";
import { Package } from "lucide-react";
import { SalesOrder } from "../../../components/data/mockData";
import { S } from "../../../components/production/ProductionHelpers";
import { getMaterialOptions } from "./material-request/MaterialRequestHelpers";

export function InlineBomDisplay({ so }: { so: SalesOrder }) {
  const materials = getMaterialOptions(so);
  
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginTop: 12 }} onClick={e => e.stopPropagation()}>
       {/* Product Box */}
       <div style={{ flex: "0 0 280px", borderRadius: 8, border: `1px solid ${S.border}`, background: "#F8FAFC", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", padding: "12px" }}>
         <span style={{ fontSize: "12px", fontWeight: 600, color: S.secondary, marginBottom: "10px" }}>Produk</span>
         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
           {so.items && so.items.length > 0 ? (
             so.items.map((item, i) => (
               <div key={i} style={{ 
                 background: "#FFFFFF", 
                 border: `1px solid ${S.border}`, 
                 borderRadius: "6px", 
                 padding: "10px 12px", 
                 display: "flex", 
                 flexDirection: "row",
                 justifyContent: "space-between",
                 alignItems: "center"
               }}>
                 <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{item.productName || "Custom Product"}</span>
                 {item.quantity && <span style={{ fontSize: "12px", fontWeight: 600, color: S.slate }}>{item.quantity} {item.unit}</span>}
               </div>
             ))
           ) : (
             (so.description || "").split(',').map((prod, i) => (
               <div key={i} style={{ 
                 background: "#FFFFFF", 
                 border: `1px solid ${S.border}`, 
                 borderRadius: "6px", 
                 padding: "10px 12px", 
                 display: "flex", 
                 flexDirection: "row",
                 justifyContent: "space-between",
                 alignItems: "center"
               }}>
                 <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{prod.trim()}</span>
               </div>
             ))
           )}
         </div>
       </div>

       {/* BOM Table */}
       <div style={{ flex: 1, borderRadius: 8, border: `1px solid ${S.border}`, background: "#F8FAFC", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "#F1F5F9", borderBottom: `1px solid ${S.border}`, fontSize: "11px", fontWeight: 600, color: S.slate, letterSpacing: "0.03em", textTransform: "uppercase" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
             <Package size={13} style={{ color: S.cyan }} />
             <span>Informasi BOM & Kebutuhan Material ({materials.length} Item)</span>
           </div>
         </div>
         {materials.length === 0 ? (
           <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: S.secondary, fontWeight: 500 }}>
             BOM Belum Dibuat
           </div>
         ) : (
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
             <thead>
               <tr style={{ background: "#FFFFFF", borderBottom: `1px solid ${S.border}`, color: S.secondary, fontSize: "11px" }}>
                 <th style={{ padding: "6px 12px", fontWeight: 600, width: "35%" }}>Nama Material</th>
                 <th style={{ padding: "6px 12px", fontWeight: 600, width: "20%" }}>Spesifikasi</th>
                 <th style={{ padding: "6px 12px", fontWeight: 600, textAlign: "right", width: "15%" }}>Total Qty</th>
               </tr>
             </thead>
             <tbody>
               {materials.map((m: any, idx: number) => (
                 <tr key={m.key || idx} style={{ borderBottom: idx < materials.length - 1 ? `1px solid #E2E8F0` : "none", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                   <td style={{ padding: "8px 12px", fontWeight: 600, color: S.slate }}>
                     {m.itemName || "-"}
                   </td>
                   <td style={{ padding: "8px 12px", color: S.secondary }}>
                     {m.specification ? (
                       <span style={{ fontFamily: "monospace", fontSize: "11.5px", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, color: S.slate }}>
                         {m.specification}
                       </span>
                     ) : (
                       <span style={{ color: "#94A3B8" }}>-</span>
                     )}
                   </td>
                   <td style={{ padding: "8px 12px", fontWeight: 600, color: S.slate, textAlign: "right" }}>
                     {m.quantity || 0} <span style={{ color: S.secondary, fontWeight: 500 }}>pcs</span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
       </div>
    </div>
  );
}
