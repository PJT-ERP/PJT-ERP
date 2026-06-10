const fs = require('fs');
let code = fs.readFileSync('src/app/components/data/mockData.ts', 'utf8');

if (!code.includes('export interface EngineeringDesign')) {
  const initDes = `
export interface EngineeringDesign {
  id: string;
  name: string;
  description: string;
  status: 'Approved' | 'Draft';
  materials: { id: string; name: string; quantity: number; unit: string; spec?: string }[];
}

export const ENGINEERING_DESIGNS: EngineeringDesign[] = [
  {
    id: "DES-001",
    name: "Gear Box Helical Ratio 1:20 Custom",
    description: "Desain gearbox helical dengan rasio 1:20 modifikasi sesuai permintaan klien",
    status: "Approved",
    materials: [
      { id: "M1", name: "Besi Cor (Cast Iron)", spec: "Housing", quantity: 1, unit: "set" },
      { id: "M2", name: "Baja ST37", spec: "Gear", quantity: 5, unit: "kg" },
      { id: "M3", name: "Bearing SKF 6205", spec: "6205-2RS", quantity: 4, unit: "pcs" },
    ]
  },
  {
    id: "DES-002",
    name: "Pipa Galvanis 3 Inch Bracket",
    description: "Bracket khusus untuk mounting pipa galvanis 3 inch",
    status: "Approved",
    materials: [
      { id: "M4", name: "Plat Stainless 316L 6mm", spec: "6mm x 200mm", quantity: 2, unit: "lembar" },
      { id: "M5", name: "Baut Hex M16", spec: "Grade 8.8", quantity: 10, unit: "pcs" },
    ]
  },
  {
    id: "DES-003",
    name: "Shaft Coupling Ø50mm SS316L Assembly",
    description: "Assembly coupling shaft",
    status: "Approved",
    materials: [
      { id: "M6", name: "Stainless Steel 316L", spec: "Ø50mm", quantity: 2, unit: "batang" },
      { id: "M7", name: "Baut Hex M20", spec: "Grade 10.9", quantity: 8, unit: "pcs" },
    ]
  }
];
`;
  code = code.replace(/export const USERS/, initDes + '\nexport const USERS');
}

fs.writeFileSync('src/app/components/data/mockData.ts', code);
