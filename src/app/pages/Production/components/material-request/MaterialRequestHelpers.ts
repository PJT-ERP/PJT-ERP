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

export function getMaterialOptions(so: SalesOrder): MaterialOption[] {
  const options: MaterialOption[] = [];
  const seen = new Set<string>();

  const addOption = (item: string, spec: string, quantity?: number) => {
    const key = `${item.toLowerCase().trim()}|${spec.toLowerCase().trim()}`;
    if (!seen.has(key) && item.trim()) {
      seen.add(key);
      options.push({ key: `mat-${seen.size}`, itemName: item.trim(), specification: spec.trim(), quantity });
    }
  };

  if (Array.isArray(so.materials) && so.materials.length > 0) {
    let hasValidEngineerMaterials = false;
    so.materials.forEach((material: any) => {
      const itemName = String(material?.name || material?.itemName || material?.material || "").trim();
      const specification = String(material?.specification || material?.spec || material?.size || "").trim();
      
      if (itemName && itemName.toLowerCase() !== "pppp") {
        const quantity = typeof material?.quantity === 'number' ? material.quantity : Number(material?.quantity);
        addOption(itemName, specification, isNaN(quantity) ? undefined : quantity);
        hasValidEngineerMaterials = true;
      }
    });
    
    if (hasValidEngineerMaterials) {
      return options;
    }
  }

  parseMaterialText(so.material).forEach(m => addOption(m.itemName, m.specification));
  
  if (Array.isArray(so.items)) {
    so.items.forEach((item: any) => {
      const itemName = String(item?.productName || item?.productDescription || item?.partNumber || "").trim();
      if (itemName) {
        addOption(itemName, "");
      }
    });
  }

  if (options.length === 0 && so.description) {
    addOption(so.description, so.spec || "");
  }

  return options;
}
