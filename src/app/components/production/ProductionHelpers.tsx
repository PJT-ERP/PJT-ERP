import React from "react";
import { ExternalLink } from "lucide-react";
import { PurchasingUrgency, SalesOrder, getStatusColor } from "../data/mockData";

export const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

export const URGENCY_COLORS: Record<PurchasingUrgency, { bg: string, text: string, border: string, dot: string }> = {
  Normal: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' },
  Urgent: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

export const PR_STATUS_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  Pending: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
  Diproses: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  Selesai: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  Ditolak: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

export type SystemMessage = {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  steps?: string[];
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  const labels: Record<string, string> = {
    waiting_dp: 'Menunggu DP',
    pending_assignment: 'Menunggu Penugasan',
    material_preparation: 'Persiapan Material',
    in_production: 'Sedang Diproduksi',
    qc_check: 'Proses QC',
    'Ready for Production': 'Siap Produksi',
    'In Production': 'Sedang Diproduksi',
    QC: 'Proses QC',
  };

  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {labels[status] || status}
    </span>
  );
}

export function getDrawingUrl(so: SalesOrder) {
  return so.customerDrawingUrl || so.designLink || "";
}

export function getBackendSalesOrderId(so: SalesOrder) {
  return so.backendId || so.id;
}

export type MaterialOption = {
  key: string;
  itemName: string;
  specification: string;
  quantity?: number;
  isCustomerMaterial?: boolean;
  inventoryItemId?: string;
  name?: string;
};

export function parseMaterialText(value?: string | null): MaterialOption[] {
  if (!value) return [];

  return value
    .split(/[;\n]+/)
    .map((entry, index) => {
      const text = entry.trim();
      if (!text) return null;
      const separatorIndex = text.indexOf(":");
      const itemName = separatorIndex >= 0 ? text.slice(0, separatorIndex).trim() : text;
      const specification = separatorIndex >= 0 ? text.slice(separatorIndex + 1).trim() : "";
      if (!itemName) return null;

      return {
        key: `text-${index}-${itemName}`,
        itemName,
        specification,
      };
    })
    .filter(Boolean) as MaterialOption[];
}

export function getMaterialOptions(so: SalesOrder, includeCustomerMaterials: boolean = false): MaterialOption[] {
  const options: MaterialOption[] = [];
  const seen = new Set<string>();

  const addOption = (materialObj: any, item: string, spec: string, qty?: number, isCustomerMaterial?: boolean) => {
    const key = `${item.toLowerCase().replace(/[^a-z0-9]/g, '')}|${spec.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      options.push({ 
        ...(materialObj || {}),
        key: materialObj?.key || `mat-${seen.size}`, 
        itemName: item.trim(), 
        specification: spec.trim(), 
        quantity: qty,
        isCustomerMaterial
      });
    }
  };

  // Use bomsPerItem for correct per-product-line aggregation
  if (so.bomsPerItem && so.items && so.items.length > 0) {
    let hasAnyMaterials = false;
    const aggregated = new Map<string, { materialObj: any, itemName: string, spec: string, quantity: number, isCustomerMaterial: boolean }>();

    so.items.forEach((item: any) => {
      const lookupKey = item.tempId || item.id;
      const boms = so.bomsPerItem![lookupKey] || so.bomsPerItem![item.productId];
      if (boms && Array.isArray(boms)) {
        boms.forEach((material: any) => {
          hasAnyMaterials = true;
          if (material.isCustomerMaterial && !includeCustomerMaterials) return;
          const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
          const specification = String(material?.specification || material?.spec || material?.size || "").trim();
          
          if (itemName && itemName.toLowerCase() !== "pppp") {
            const rawQty = typeof material?.quantity === 'number' ? material.quantity : Number(material?.quantity);
            const matQty = isNaN(rawQty) ? 0 : rawQty;
            
            const key = `${itemName.toLowerCase().replace(/[^a-z0-9]/g, '')}|${specification.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (!aggregated.has(key)) {
              aggregated.set(key, { materialObj: material, itemName, spec: specification, quantity: 0, isCustomerMaterial: !!material.isCustomerMaterial });
            }
            aggregated.get(key)!.quantity += matQty;
          }
        });
      }
    });

    if (hasAnyMaterials) {
      aggregated.forEach((val) => {
        addOption(val.materialObj, val.itemName, val.spec, val.quantity, val.isCustomerMaterial);
      });
      return options;
    }
  }

  if (Array.isArray(so.materials) && so.materials.length > 0) {
    console.log('[getMaterialOptions] FALLING THROUGH to so.materials path. materials:', JSON.stringify(so.materials).substring(0, 500));
    let hasAnyMaterials = false;
    so.materials.forEach((material: any) => {
      hasAnyMaterials = true;
      if (material.isCustomerMaterial && !includeCustomerMaterials) return;
      const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
      const specification = String(material?.specification || material?.spec || material?.size || "").trim();
      const quantity = typeof material?.quantity === 'number' ? material.quantity : (material?.quantity ? Number(material.quantity) : undefined);

      if (itemName && itemName.toLowerCase() !== "pppp") {
        addOption(material, itemName, specification, Number.isNaN(quantity) ? undefined : quantity, !!material.isCustomerMaterial);
      }
    });

    if (hasAnyMaterials) {
      return options;
    }
  }

  parseMaterialText(so.material).forEach(m => addOption(m, m.itemName, m.specification));

  if (options.length === 0 && so.description) {
    addOption({}, so.description, so.spec || "");
  }

  return options;
}

export function DrawingLinks({ so }: { so: SalesOrder }) {
  const drawingUrl = getDrawingUrl(so);
  if (!drawingUrl) {
    return null;
  }

  return (
    <a
      href={drawingUrl}
      target="_blank"
      rel="noreferrer"
      onClick={event => event.stopPropagation()}
      style={{ color: S.cyan, fontSize: "12px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
    >
      <ExternalLink size={12} /> Gambar SO
    </a>
  );
}
