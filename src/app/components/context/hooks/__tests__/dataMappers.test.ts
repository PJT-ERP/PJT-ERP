import { describe, it, expect } from 'vitest';
import { mapSalesOrderStatus, mapSalesOrderMaterials } from '../dataMappers';

describe('mapSalesOrderStatus', () => {
  it('maps "Waiting Payment" with space from backend correctly', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Waiting Payment',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).toBe('Waiting Payment');
  });

  it('maps "WaitingPayment" (no space legacy) correctly', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'WaitingPayment',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).toBe('Waiting Payment');
  });

  it('maps "Waiting Pricing" from backend correctly', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Waiting Pricing',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).toBe('Waiting Pricing');
  });

  it('maps "Draft" with approved design to "Waiting Pricing"', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Draft',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).toBe('Waiting Pricing');
  });

  it('maps "Completed" with paid invoice to "Completed"', () => {
    const result = mapSalesOrderStatus(
      {
        id: 'so-1',
        soNumber: 'SO-001',
        customerId: 'c1',
        customerCode: 'CUST-1',
        customerName: 'Test',
        status: 'Completed',
        orderDate: '2026-01-01',
        targetDate: '2026-02-01',
        items: [],
        designStatus: 'Approved',
      } as any,
      [{ salesOrderId: 'so-1', status: 'Paid' }],
    );

    expect(result).toBe('Completed');
  });

  it('maps "Completed" with NO invoice to "Completed" (trusts backend when invoices unavailable)', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Completed',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).toBe('Completed');
  });

  it('maps "QC" status before QC decision returns "QC"', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'QC',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
      productionStatus: 'Finished',
    } as any);

    expect(result).toBe('QC');
  });

  it('maps "QC" with "NoGo" decision to "Ready for Production" for rework', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'QC',
      qcDecision: 'NoGo',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
      productionStatus: 'Waiting',
    } as any);

    expect(result).toBe('Ready for Production');
  });

  it('maps "InProduction" with "Waiting" production order to "Ready for Production"', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'InProduction',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
      productionStatus: 'Waiting',
    } as any);

    expect(result).toBe('Ready for Production');
  });

  it('maps "QC" with "NoGo" decision and NO assigned worker (returned to SPV) to "Ready for Production"', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'QC',
      qcDecision: 'NoGo',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
      productionStatus: 'Waiting',
      productionWorkerUserId: null,
      productionWorkerName: null,
    } as any);

    expect(result).toBe('Ready for Production');
  });

  // Regression: "Waiting Payment" must NEVER map back to "Ready for Production"
  // or any other status that would land in the production or finance queue.
  it('"Waiting Payment" never maps to production statuses', () => {
    const productionStatuses = ['Ready for Production', 'In Production', 'Paused', 'Pending Design', 'Waiting Pricing', 'QC'];

    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Waiting Payment',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(productionStatuses).not.toContain(result);
  });

  // Regression: "Waiting Payment" NEVER maps to antrean statuses
  it('"Waiting Payment" never maps to "Waiting Pricing" (would re-enter queue)', () => {
    const result = mapSalesOrderStatus({
      id: 'so-1',
      soNumber: 'SO-001',
      customerId: 'c1',
      customerCode: 'CUST-1',
      customerName: 'Test',
      status: 'Waiting Payment',
      orderDate: '2026-01-01',
      targetDate: '2026-02-01',
      items: [],
      designStatus: 'Approved',
    } as any);

    expect(result).not.toBe('Waiting Pricing');
  });
});

describe('mapSalesOrderMaterials — repeat order BOM deduplication', () => {
  it('deduplicates repeat order materials that share inventoryItemId with product BOM', () => {
    // Simulate a repeat order where item.notes JSON stores inventoryItemId in `id` field
    const order: any = {
      id: 'so-repeat-1',
      soNumber: 'SO-REPEAT-001',
      items: [{
        id: 'item-1',
        productId: 'prod-1',
        qty: 5,
        notes: JSON.stringify([
          { id: 'MAT-001', name: 'MAT-001 - S45C Round Bar', specification: '', quantity: '2', unit: 'batang' },
          { id: 'MAT-002', name: 'MAT-002 - Aluminium Plate', specification: '', quantity: '1', unit: 'lembar' },
        ]),
      }],
    };

    const products: any[] = [{
      id: 'prod-1',
      partNumber: 'PART-001',
      description: 'Shaft',
      unit: 'pcs',
      bomItems: [
        { id: 'bom-1', inventoryItemId: 'MAT-001', inventoryItemCode: 'MAT-001', inventoryItemName: 'S45C Round Bar', quantity: 2, unit: 'batang' },
        { id: 'bom-2', inventoryItemId: 'MAT-002', inventoryItemCode: 'MAT-002', inventoryItemName: 'Aluminium Plate', quantity: 1, unit: 'lembar' },
      ],
    }];

    const materials = mapSalesOrderMaterials(order, products);

    // Should have 2 materials, NOT 4 (no duplication)
    expect(materials).toBeDefined();
    expect(materials!.length).toBe(2);

    // Names should have code prefix stripped (legacy repeat order cleanup)
    const names = materials!.map(m => m.name);
    expect(names).toContain('S45C Round Bar');
    expect(names).toContain('Aluminium Plate');

    // Codes should be resolved from product BOM
    const s45c = materials!.find(m => m.name === 'S45C Round Bar');
    const alum = materials!.find(m => m.name === 'Aluminium Plate');
    expect(s45c).toBeDefined();
    expect(alum).toBeDefined();
    expect(s45c!.code).toBe('MAT-001');
    expect(alum!.code).toBe('MAT-002');
    expect(Number(s45c!.quantity)).toBe(2);
    expect(Number(alum!.quantity)).toBe(1);
  });

  it('does not override product BOM when legacy material has no inventoryItemId', () => {
    // Manual BOM entry with timestamp id (no real inventoryItemId)
    const order: any = {
      id: 'so-manual-1',
      soNumber: 'SO-MANUAL',
      items: [{
        id: 'item-1',
        productId: 'prod-1',
        qty: 3,
        notes: JSON.stringify([
          { id: '1712345678000', name: 'Custom Part A', specification: '10mm', quantity: '4', unit: 'pcs', inventoryItemId: '' },
        ]),
      }],
    };

    const products: any[] = [{
      id: 'prod-1',
      partNumber: 'PART-001',
      description: 'Assembly',
      unit: 'pcs',
      bomItems: [
        { id: 'bom-1', inventoryItemId: 'MAT-003', inventoryItemCode: 'MAT-003', inventoryItemName: 'Standard Part', quantity: 1, unit: 'pcs' },
      ],
    }];

    const materials = mapSalesOrderMaterials(order, products);

    // Custom manual material + product BOM material = 2 total
    expect(materials).toBeDefined();
    expect(materials!.length).toBe(2);

    const customMat = materials!.find(m => m.name === 'Custom Part A');
    const standardMat = materials!.find(m => m.name === 'Standard Part');
    expect(customMat).toBeDefined();
    expect(standardMat).toBeDefined();
  });
});
