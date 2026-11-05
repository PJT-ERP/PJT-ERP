import { SalesOrder } from "../../../../components/data/mockData";

export const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

export type MaterialOption = {
  key: string;
  itemName: string;
  specification: string;
  quantity?: number;
  isCustomerMaterial?: boolean;
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

  const addOption = (item: string, spec: string, quantity?: number, isCustomerMaterial?: boolean) => {
    const key = `${item.toLowerCase().trim()}|${spec.toLowerCase().trim()}`;
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      options.push({ key: `mat-${seen.size}`, itemName: item.trim(), specification: spec.trim(), quantity, isCustomerMaterial });
    }
  };

  if (so.bomsPerItem && so.items && so.items.length > 0) {
    let hasAnyMaterials = false;
    const aggregatedMaterials = new Map<string, { itemName: string, spec: string, quantity: number, isCustomerMaterial: boolean }>();

    so.items.forEach((item: any) => {
      const boms = so.bomsPerItem![item.tempId || item.id || item.productId];
      if (boms && Array.isArray(boms)) {
        boms.forEach((material: any) => {
          hasAnyMaterials = true;
          if (material.isCustomerMaterial && !includeCustomerMaterials) return;
          const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
          const specification = String(material?.specification || material?.spec || material?.size || "").trim();
          
          if (itemName && itemName.toLowerCase() !== "pppp") {
            const rawQty = typeof material?.quantity === 'number' ? material.quantity : Number(material?.quantity);
            const matQty = isNaN(rawQty) ? 0 : rawQty;

            
            const key = `${itemName.toLowerCase()}|${specification.toLowerCase()}`;
            if (!aggregatedMaterials.has(key)) {
              aggregatedMaterials.set(key, { itemName, spec: specification, quantity: 0, isCustomerMaterial: !!material.isCustomerMaterial });
            }
            aggregatedMaterials.get(key)!.quantity += matQty; // Do not multiply by itemQty
          }
        });
      }
    });

    if (hasAnyMaterials) {
      aggregatedMaterials.forEach((val) => {
        addOption(val.itemName, val.spec, val.quantity, val.isCustomerMaterial);
      });
      return options;
    }
  }

  if (Array.isArray(so.materials) && so.materials.length > 0) {
    let hasAnyMaterials = false;
    so.materials.forEach((material: any) => {
      hasAnyMaterials = true;
      if (material.isCustomerMaterial && !includeCustomerMaterials) return;
      const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
      const specification = String(material?.specification || material?.spec || material?.size || "").trim();
      
      if (itemName && itemName.toLowerCase() !== "pppp") {
        const quantity = typeof material?.quantity === 'number' ? material.quantity : Number(material?.quantity);
        addOption(itemName, specification, isNaN(quantity) ? undefined : quantity, !!material.isCustomerMaterial);
      }
    });
    
    if (hasAnyMaterials) {
      return options;
    }
  }

  parseMaterialText(so.material).forEach(m => addOption(m.itemName, m.specification));
  
  return options;
}
