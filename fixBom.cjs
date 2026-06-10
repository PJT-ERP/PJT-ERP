const fs = require('fs');
let code = fs.readFileSync('src/app/components/data/mockData.ts', 'utf8');

if (!code.includes('export const STANDARD_PRODUCTS_BOM')) {
  const initBom = `
export const STANDARD_PRODUCTS_BOM: Record<string, any[]> = {
  "Pipa Galvanis 2 Inch": [
    { id: "std-1", name: "Pipa Baja Karbon SCH40", spec: "Galvanis, 2 inch x 6m", quantity: 1, unit: "BTG" }
  ],
  "Pipa Galvanis 3 Inch": [
    { id: "std-1b", name: "Pipa Baja Karbon SCH40", spec: "Galvanis, 3 inch x 6m", quantity: 1, unit: "BTG" }
  ],
  "Baut Hex M16 × 80mm Grade 8.8": [
    { id: "std-2", name: "Besi As S45C", spec: "Ø20mm x 100mm", quantity: 1, unit: "PCS" },
    { id: "std-3", name: "Zinc Plating", spec: "Coating", quantity: 1, unit: "LOT" }
  ],
  "Baut Hex M20 × 100mm Grade 10.9": [
    { id: "std-2b", name: "Besi As 4140", spec: "Ø25mm x 120mm", quantity: 1, unit: "PCS" },
    { id: "std-3b", name: "Black Oxide", spec: "Coating", quantity: 1, unit: "LOT" }
  ],
  "Gear Box Helical Ratio 1:20": [
    { id: "std-4", name: "Casting Body FC250", spec: "Gearbox Case", quantity: 1, unit: "PCS" },
    { id: "std-5", name: "Gear SCM440", spec: "Helical Gear Set", quantity: 1, unit: "SET" },
    { id: "std-6", name: "Bearing SKF", spec: "6205 & 6305", quantity: 4, unit: "PCS" }
  ],
  "Shaft Coupling Ø50mm SS316L": [
    { id: "std-7", name: "Round Bar SS316L", spec: "Ø60mm", quantity: 1, unit: "PCS" },
    { id: "std-8", name: "Baut Tanam M8", spec: "SS316", quantity: 4, unit: "PCS" }
  ],
  "Bearing SKF 6205-2RS": [
    { id: "std-9", name: "Bearing SKF 6205-2RS", spec: "Standard", quantity: 1, unit: "PCS" }
  ],
  "Bearing SKF 6305-2Z": [
    { id: "std-10", name: "Bearing SKF 6305-2Z", spec: "Standard", quantity: 1, unit: "PCS" }
  ],
  "Plat Baja ST37 10mm": [
    { id: "std-11", name: "Plat Baja ST37", spec: "Tebal 10mm", quantity: 1, unit: "LBR" }
  ],
  "Plat Stainless 316L 6mm": [
    { id: "std-12", name: "Plat SS316L", spec: "Tebal 6mm", quantity: 1, unit: "LBR" }
  ],
  "Sprocket #50 Z30 Hardened": [
    { id: "std-13", name: "Plat Baja S45C", spec: "Tebal 12mm", quantity: 1, unit: "PCS" },
    { id: "std-14", name: "Induction Hardening", spec: "Teeth Only", quantity: 1, unit: "LOT" }
  ],
  "V-Belt A-60 Bando": [
    { id: "std-15", name: "V-Belt A-60 Bando", spec: "Standard", quantity: 1, unit: "PCS" }
  ]
};
`;
  code = code.replace(/export const USERS/, initBom + '\nexport const USERS');
}

fs.writeFileSync('src/app/components/data/mockData.ts', code);
