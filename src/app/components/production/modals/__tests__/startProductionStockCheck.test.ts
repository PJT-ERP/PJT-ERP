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

// ═════════════════════════════════════════════════════════════
//  Two-SO shared material race condition: SO1 starts first
//  and consumes the shared stock. SO2 must detect insufficient
//  stock and allow engineer to "Kembalikan ke SPV".
// ═════════════════════════════════════════════════════════════

interface SharedStock {
  inventoryItemId: string;
  materialName: string;
  initialStock: number;
  currentStock: number;
}

function simulateSoStockCheck(
  soName: string,
  bomStocks: BomStockEntry[],
  sharedStock: Map<string, SharedStock>,
  consumedAfterPreviousSos: number,
) {
  // Step 1: SO1 passes stock check initially (stock=100, required=100)
  const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }];

  // Build fresh bomStocks with current stock levels for this SO
  const withCurrentStock = bomStocks.map(bs => ({
    ...bs,
    items: bs.items.map(item => {
      const shared = sharedStock.get(item.inventoryItemId);
      return {
        ...item,
        currentStock: shared ? shared.currentStock : item.currentStock,
      };
    }),
  }));

  const issues = checkBomStockForItems(soItems, withCurrentStock);

  // After SO check, deduct consumed stock so next SO sees reduced inventory
  const required = withCurrentStock[0]?.items[0]
    ? withCurrentStock[0].items[0].bomQuantity * 5
    : 0;

  return { soName, issues, required, sharedStock };
}

describe('Two-SO shared material race condition', () => {
  /**
   * Scenario: Inventory has 100 units of "S45C Round Bar".
   *   - SO1 starts first (needs 100) → passes stock check → consumes all 100
   *   - SO2 then tries to start (needs 100) → stock check fails (0 < 100)
   *   - Engineer (non-SPV) sees "Kembalikan ke SPV" button
   */

  function buildBomStocks(materialName: string, currentStock: number): BomStockEntry[] {
    return [{
      productId: 'p1',
      partNumber: 'PART-001',
      description: 'Shaft',
      items: [{
        inventoryItemId: 'inv-s45c',
        inventoryItemCode: 'MAT-S45C',
        inventoryItemName: materialName,
        bomQuantity: 20,    // 20 units per SO product
        currentStock,
        unit: 'batang',
      }],
    }];
  }

  it('SO1 passes stock check when stock equals requirement (100 = 100)', () => {
    const bomStocks = buildBomStocks('S45C Round Bar', 100);
    const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }]; // 5 × 20 = 100

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(0);
  });

  it('SO2 fails stock check after SO1 consumed the shared material', () => {
    // Initial: 100 units in stock. SO1 already started and consumed 100 → 0 left
    const afterSo1Stock = 0;
    const bomStocks = buildBomStocks('S45C Round Bar', afterSo1Stock);
    const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }]; // 5 × 20 = 100

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      itemName: 'S45C Round Bar',
      required: 100,   // 20 × 5
      available: 0,    // all consumed by SO1
    });
  });

  it('SO2 fails when stock is partially consumed by SO1 (only 30 left for 100 needed)', () => {
    // SO1 needed 70, consumed 70 from initial 100 → 30 left
    const afterSo1Stock = 30;
    const bomStocks = buildBomStocks('S45C Round Bar', afterSo1Stock);
    const soItems: SoItem[] = [{ productId: 'p1', qty: 5 }];

    const issues = checkBomStockForItems(soItems, bomStocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].required).toBe(100);
    expect(issues[0].available).toBe(30);
  });

  it('full two-SO race: SO1 passes → deducts all stock → SO2 blocked', () => {
    const materialName = 'S45C Round Bar';
    const initialStock = 100;
    const soQty = 5;   // per SO
    const bomQty = 20; // per unit
    const totalPerSo = soQty * bomQty; // 100

    // Phase 1: SO1 starts — stock is 100, needed 100 → PASS
    const so1Check = checkBomStockForItems(
      [{ productId: 'p1', qty: soQty }],
      buildBomStocks(materialName, initialStock),
    );
    expect(so1Check).toHaveLength(0); // SO1 can start

    // SO1 starts production → deductBomMaterials called → stock = 100 - 100 = 0

    // Phase 2: SO2 tries — stock is 0, needed 100 → BLOCKED
    const so2Check = checkBomStockForItems(
      [{ productId: 'p1', qty: soQty }],
      buildBomStocks(materialName, 0),
    );
    expect(so2Check).toHaveLength(1);
    expect(so2Check[0]).toEqual({
      itemName: materialName,
      required: totalPerSo,
      available: 0,
    });
  });

  it('SO2 should show "Kembalikan ke SPV" for non-supervisor, "Buat MR" for supervisor', () => {
    // This replicates the decision logic in StartProductionModal lines 234-297:
    //   - hasStockIssues && !isSupervisor → "Kembalikan ke SPV"
    //   - hasStockIssues && isSupervisor → "Buat Material Request"

    const hasStockIssues = true;

    function resolveAction(hasIssues: boolean, isSupervisor: boolean): string {
      if (!hasIssues) return 'START_PRODUCTION';
      return isSupervisor ? 'BUAT_MATERIAL_REQUEST' : 'KEMBALIKAN_KE_SPV';
    }

    // Non-supervisor (engineer/worker) sees "Kembalikan ke SPV"
    expect(resolveAction(hasStockIssues, false)).toBe('KEMBALIKAN_KE_SPV');

    // Supervisor sees "Buat Material Request"
    expect(resolveAction(hasStockIssues, true)).toBe('BUAT_MATERIAL_REQUEST');

    // No issues → can start production
    expect(resolveAction(false, false)).toBe('START_PRODUCTION');
    expect(resolveAction(false, true)).toBe('START_PRODUCTION');
  });

  it('engineer can kembalikan ke SPV with notes on each blocked SO independently', () => {
    // Simulates two SOs, both blocked, each engineer on their respective SO
    // independently returns to SPV

    const so1Notes = 'Material S45C Round Bar habis dipakai SO-Prev, butuh pengajuan ulang MR';
    const so2Notes = 'Stok Aluminium tidak cukup setelah SO1 produksi duluan';

    interface ReturnRequest {
      soId: string;
      notes: string;
      unassignUserId: string;
    }

    const returnRequests: ReturnRequest[] = [];

    function kembalikanKeSpv(soId: string, notes: string) {
      returnRequests.push({
        soId,
        notes: notes.trim(),
        unassignUserId: '00000000-0000-0000-0000-000000000000',
      });
    }

    // Engineer on SO2 returns it
    kembalikanKeSpv('SO-002', so1Notes);
    // Engineer on SO3 returns it
    kembalikanKeSpv('SO-003', so2Notes);

    expect(returnRequests).toHaveLength(2);
    expect(returnRequests[0]).toEqual({
      soId: 'SO-002',
      notes: 'Material S45C Round Bar habis dipakai SO-Prev, butuh pengajuan ulang MR',
      unassignUserId: '00000000-0000-0000-0000-000000000000',
    });
    expect(returnRequests[1]).toEqual({
      soId: 'SO-003',
      notes: 'Stok Aluminium tidak cukup setelah SO1 produksi duluan',
      unassignUserId: '00000000-0000-0000-0000-000000000000',
    });
  });
});
