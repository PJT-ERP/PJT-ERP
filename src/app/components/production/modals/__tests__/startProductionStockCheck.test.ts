import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the stock-checking logic that prevents production start
 * when BOM materials are insufficient.
 *
 * These replicate the exact logic from StartProductionModal.tsx (useEffect stock check).
 */

interface StockIssue {
  itemName: string;
  required: number;
  available: number;
}

interface BomStockItem {
  inventoryItemId: string;
  inventoryItemCode: string;
  inventoryItemName: string;
  bomQuantity: number;
  currentStock: number;
  unit: string;
}

interface BomStockEntry {
  productId: string;
  partNumber?: string;
  description?: string;
  items: BomStockItem[];
}

interface SoItem {
  productId: string;
  qty?: number;
  quantity?: number;
}

function checkBomStockForItems(soItems: SoItem[], bomStocks: BomStockEntry[]): StockIssue[] {
  const issues: StockIssue[] = [];
  for (const soItem of soItems) {
    const soProductId = soItem.productId;
    const bomStock = bomStocks.find(bs => bs.productId === soProductId);
    if (!bomStock?.items?.length) continue;

    const productQty = soItem.qty || soItem.quantity || 1;
    for (const item of bomStock.items) {
      const required = item.bomQuantity * productQty;
      const available = item.currentStock;
      if (available < required) {
        const existing = issues.find(i => i.itemName === item.inventoryItemName);
        if (existing) {
          existing.required += required;
        } else {
          issues.push({ itemName: item.inventoryItemName, required, available });
        }
      }
    }
  }
  return issues;
}

describe('Production start stock validation', () => {
  // ── Single item, out of stock ──
  it('blocks start when BOM material has 0 stock', () => {
    const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }];
    const bomStocks: BomStockEntry[] = [{
      productId: 'p1',
      items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'S45C Round Bar', bomQuantity: 2, currentStock: 0, unit: 'batang' }],
    }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({ itemName: 'S45C Round Bar', required: 10, available: 0 });
  });

  // ── Sufficient stock ──
  it('allows start when all materials have sufficient stock', () => {
    const soItems: SoItem[] = [{ productId: 'p1', qty: 2 }];
    const bomStocks: BomStockEntry[] = [{
      productId: 'p1',
      items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'Steel Plate', bomQuantity: 1, currentStock: 50, unit: 'lembar' }],
    }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(0);
  });

  // ── Multi-item SO, one material short ──
  it('blocks when one of multiple BOM materials is short', () => {
    const soItems: SoItem[] = [{ productId: 'p1', qty: 10 }];
    const bomStocks: BomStockEntry[] = [{
      productId: 'p1',
      items: [
        { inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'S45C', bomQuantity: 1, currentStock: 100, unit: 'batang' },
        { inventoryItemId: 'inv-2', inventoryItemCode: 'MAT-002', inventoryItemName: 'Coolant', bomQuantity: 2, currentStock: 5, unit: 'liter' },
      ],
    }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].itemName).toBe('Coolant');
    expect(issues[0].required).toBe(20);  // 2 * 10
    expect(issues[0].available).toBe(5);
  });

  // ── Multi-product SO ──
  it('aggregates stock issues across multiple products', () => {
    const soItems: SoItem[] = [
      { productId: 'p1', qty: 5 },
      { productId: 'p2', qty: 3 },
    ];
    const bomStocks: BomStockEntry[] = [
      {
        productId: 'p1',
        items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'Steel', bomQuantity: 2, currentStock: 0, unit: 'batang' }],
      },
      {
        productId: 'p2',
        items: [{ inventoryItemId: 'inv-2', inventoryItemCode: 'MAT-002', inventoryItemName: 'Bronze', bomQuantity: 1, currentStock: 0, unit: 'pcs' }],
      },
    ];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({ itemName: 'Steel', required: 10, available: 0 });
    expect(issues).toContainEqual({ itemName: 'Bronze', required: 3, available: 0 });
  });

  // ── Product has no BOM → no issues ──
  it('allows start when product has no BOM items', () => {
    const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }];
    const bomStocks: BomStockEntry[] = [{ productId: 'p1', items: [] }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(0);
  });

  // ── Product not found in BOM response → no issues ──
  it('skips products not found in BOM response', () => {
    const soItems: SoItem[] = [{ productId: 'p-unknown', qty: 5 }];
    const bomStocks: BomStockEntry[] = [{ productId: 'p1', items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'M1', inventoryItemName: 'Steel', bomQuantity: 1, currentStock: 0, unit: 'pcs' }] }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(0);
  });

  // ── Regression: exact match (available == required) is sufficient ──
  it('allows start when stock exactly matches requirement', () => {
    const soItems: SoItem[] = [{ productId: 'p1', qty: 4 }];
    const bomStocks: BomStockEntry[] = [{
      productId: 'p1',
      items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'M1', inventoryItemName: 'Part', bomQuantity: 2, currentStock: 8, unit: 'pcs' }],
    }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(0);
  });

  // ── Zero-quantity SO item ──
  it('defaults to qty=1 when SO item has no quantity', () => {
    const soItems: SoItem[] = [{ productId: 'p1' }]; // no qty
    const bomStocks: BomStockEntry[] = [{
      productId: 'p1',
      items: [{ inventoryItemId: 'inv-1', inventoryItemCode: 'M1', inventoryItemName: 'Part', bomQuantity: 5, currentStock: 4, unit: 'pcs' }],
    }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].required).toBe(5); // 5 * 1
  });
});
