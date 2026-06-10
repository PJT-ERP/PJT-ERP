const fs = require('fs');
let code = fs.readFileSync('src/app/components/data/mockData.ts', 'utf8');

if (!code.includes('export type QuotationStatus')) {
  code = `export type QuotationStatus = 'draft' | 'pending_design' | 'design_review' | 'client_design_approval' | 'waiting_pricing' | 'client_price_approval' | 'won' | 'lost';\n\n` + code;
}

if (!code.includes('export const INITIAL_QUOTATIONS')) {
  const initQut = `
export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'QUT-2026-001',
    customerId: '0001',
    productName: 'Baut Custom 0.05mm',
    description: 'Baut baja presisi tinggi untuk mesin bubut',
    quantity: 100,
    unit: 'pcs',
    deadline: '2026-06-30',
    status: 'pending_design',
    createdBy: 'u1',
    createdAt: '2026-06-01',
  },
  {
    id: 'QUT-2026-002',
    customerId: '0002',
    productName: 'Pipa Galvanis 3 Inch Bracket',
    description: 'Bracket khusus',
    quantity: 50,
    unit: 'pcs',
    deadline: '2026-06-25',
    status: 'waiting_pricing',
    designId: 'DES-002',
    createdBy: 'u1',
    createdAt: '2026-06-02',
  },
  {
    id: 'QUT-2026-003',
    customerId: '0003',
    productName: 'Shaft Coupling Ø50mm SS316L',
    description: 'Assembly coupling shaft',
    quantity: 10,
    unit: 'pcs',
    deadline: '2026-06-20',
    status: 'client_price_approval',
    designId: 'DES-003',
    estimatedAmount: 25000000,
    createdBy: 'u1',
    createdAt: '2026-06-03',
  },
  {
    id: 'QUT-2026-004',
    customerId: '0004',
    productName: 'Gear Box Helical',
    description: 'Ratio 1:20',
    quantity: 2,
    unit: 'set',
    deadline: '2026-06-15',
    status: 'lost',
    designId: 'DES-001',
    estimatedAmount: 40000000,
    lostReason: 'Harga terlalu mahal dibanding kompetitor',
    createdBy: 'u1',
    createdAt: '2026-06-04',
  }
];
`;
  code = code.replace(/export const INITIAL_SALES_ORDERS/, initQut + '\nexport const INITIAL_SALES_ORDERS');
}

fs.writeFileSync('src/app/components/data/mockData.ts', code);
