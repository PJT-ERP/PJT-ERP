import React from "react";
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { usePurchaseRequestDetail } from "../../hooks/usePurchaseRequestDetail";

const formatRp = (val: string | number) => {
  if (!val) return "";
  const num = typeof val === "number" ? val : parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

interface PRDetailItemsTableProps {
  board: ReturnType<typeof usePurchaseRequestDetail>;
}

export function PRDetailItemsTable({ board }: PRDetailItemsTableProps) {
  const { detail, inventoryItems, canEditPricing, pricingData, setPricingData, suppliersList } = board;

  if (!detail) return null;

  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        Daftar Item ({detail.items.length} item)
      </p>
      <div className="rounded border border-slate-200 overflow-visible">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Kode</th>
              <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Material</th>
              <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Qty</th>
              {(canEditPricing || detail.backendStatus === "FinanceApproved" || detail.backendStatus === "Processing" || detail.backendStatus === "Completed" || detail.isReadyForFinance || detail.items.some(i => i.supplierName || i.estimatedPrice)) && (
                <>
                  <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Supplier (Toko)</th>
                  <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Harga Satuan</th>
                  <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Harga Perkiraan</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {detail.items.map((item, i) => {
              const itemNameLower = (item.name || "").toLowerCase().trim();
              const invItem = inventoryItems.find((inv: any) => 
                inv.name.toLowerCase().trim() === itemNameLower || 
                itemNameLower === `${(inv.code || "").toLowerCase().trim()} - ${inv.name.toLowerCase().trim()}`
              );
              const actualCode = invItem ? invItem.code : item.code;
              const isSpecActuallyCode = item.spec && actualCode && item.spec.trim().toUpperCase() === actualCode.trim().toUpperCase();
              const actualName = invItem && itemNameLower.startsWith(`${(invItem.code || "").toLowerCase().trim()} - `) 
                ? (item.name || "").substring((invItem.code || "").length + 3).trim()
                : item.name;

              return (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="p-3 text-xs text-slate-500 font-mono">{actualCode}</td>
                <td className="p-3 text-sm text-slate-900">
                  <div className="font-medium">{actualName}</div>
                  {item.spec && item.spec !== "-" && !isSpecActuallyCode && (
                    <div className="text-xs text-slate-500 mt-0.5">Spesifikasi: {item.spec}</div>
                  )}
                </td>
                <td className="p-3 text-sm text-slate-900">
                  {item.qty} {item.unit}
                </td>
                {canEditPricing ? (
                  <>
                    <td className="p-2">
                        <SupplierAutocomplete
                          value={pricingData[item.itemId]?.supplierName || ""}
                          onChange={(val) => {
                            setPricingData(prev => ({ ...prev, [item.itemId]: { ...(prev[item.itemId] || { estimatedPrice: "" }), supplierName: val } }));
                          }}
                          onSelectSupplier={(val) => {
                            const invItem = inventoryItems.find(i => i.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
                            let newUnitPrice = pricingData[item.itemId]?.unitPrice || "";
                            
                            if (invItem && invItem.unitPrice > 0) {
                              if (invItem.supplierName === val) {
                                // Auto-fill price if the selected supplier matches the master data's primary supplier
                                newUnitPrice = String(invItem.unitPrice);
                              } else if (newUnitPrice === String(invItem.unitPrice)) {
                                // Clear it if they switch to a supplier that doesn't match the auto-filled price
                                newUnitPrice = "";
                              }
                            }

                            setPricingData(prev => ({ 
                              ...prev, 
                              [item.itemId]: { 
                                ...(prev[item.itemId] || { estimatedPrice: "" }), 
                                supplierName: val,
                                unitPrice: newUnitPrice
                              } 
                            }));
                          }}
                          options={suppliersList}
                        />
                    </td>
                    <td className="p-2">
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-sm text-slate-400">Rp</span>
                        <input
                          type="text"
                          className="w-full rounded border border-slate-300 pl-7 pr-2 py-1.5 text-sm outline-none focus:border-blue-500 text-left"
                          placeholder="0"
                          value={formatRp(pricingData[item.itemId]?.unitPrice || "")}
                          onChange={(e) => {
                            const rawVal = e.target.value.replace(/\D/g, "");
                            setPricingData(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], unitPrice: rawVal } }));
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-900 text-left">
                      {formatRp(Number(pricingData[item.itemId]?.unitPrice || 0) * Number(pricingData[item.itemId]?.qty || item.qty || 0))}
                    </td>
                  </>
                ) : (detail.backendStatus === "FinanceApproved" || detail.backendStatus === "Processing" || detail.backendStatus === "Completed" || detail.isReadyForFinance || item.supplierName || item.estimatedPrice) ? (
                  <>
                    <td className="p-3 text-sm text-slate-900">{item.supplierName || "-"}</td>
                    <td className="p-3 text-sm text-slate-900 text-left">{item.estimatedPrice && item.qty ? formatRp(Math.round(item.estimatedPrice / item.qty)) : "-"}</td>
                    <td className="p-3 text-sm text-slate-900 text-left">{item.estimatedPrice ? formatRp(item.estimatedPrice) : "-"}</td>
                  </>
                ) : null}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
