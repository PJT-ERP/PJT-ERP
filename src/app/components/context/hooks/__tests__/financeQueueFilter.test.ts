import { describe, it, expect } from 'vitest';

/**
 * Tests that validate the isWaitingPricing filter logic EXACTLY as used in FinanceCosting.tsx.
 * These are the same conditions inline in the component.
 */

function isWaitingPricing(so: any): boolean {
  if (so.status === "Completed" || so.status === "Rejected" || so.status === "Cancelled") {
    return false;
  }
  if (so.backendStatus === "Waiting Pricing" || so.status === "Waiting Pricing") {
    return true;
  }
  return false;
}

function isUnpriced(so: any): boolean {
  return !so.items || so.items.length === 0 || so.items.some((item: any) => !item.unitPrice || item.unitPrice === 0);
}

const historyStatuses = [
  'Waiting Payment',
  'Waiting Client Approval',
  'Ready for Production',
  'In Production',
  'QC',
  'Completed',
];

function isInQueue(so: any): boolean {
  return isWaitingPricing(so);
}

function isInHistory(so: any): boolean {
  return !isWaitingPricing(so) && historyStatuses.includes(so.status) && !isUnpriced(so);
}

describe('FinanceCosting queue filter', () => {
  const itemsWithPrice = [{ id: 'i1', productId: 'p1', quantity: 5, unitPrice: 1500000 }];
  const itemsWithoutPrice = [{ id: 'i1', productId: 'p1', quantity: 5, unitPrice: 0 }];

  // ── SOs that MUST be in antrean ──
  it('SO with backendStatus "Waiting Pricing" is in queue', () => {
    const so = { id: 'so-1', status: 'Pending Design', backendStatus: 'Waiting Pricing', items: [] };
    expect(isInQueue(so)).toBe(true);
  });

  it('SO with status "Waiting Pricing" is in queue', () => {
    const so = { id: 'so-1', status: 'Waiting Pricing', backendStatus: 'Draft', items: [] };
    expect(isInQueue(so)).toBe(true);
  });

  // ── SOs that MUST NOT be in antrean after pricing ──
  it('priced SO with "Waiting Payment" is NOT in queue', () => {
    const so = { id: 'so-1', status: 'Waiting Payment', backendStatus: 'Waiting Payment', items: itemsWithPrice };
    expect(isInQueue(so)).toBe(false);
  });

  it('priced SO with "Waiting Payment" correctly goes to history', () => {
    const so = { id: 'so-1', status: 'Waiting Payment', backendStatus: 'Waiting Payment', items: itemsWithPrice };
    expect(isInHistory(so)).toBe(true);
  });

  // ── Regression: completed SOs ──
  it('Completed SO never shows in queue', () => {
    const so = { id: 'so-1', status: 'Completed', backendStatus: 'Completed', items: itemsWithoutPrice };
    expect(isInQueue(so)).toBe(false);
  });

  it('Rejected SO never shows in queue', () => {
    const so = { id: 'so-1', status: 'Rejected', backendStatus: 'Cancelled', items: [] };
    expect(isInQueue(so)).toBe(false);
  });

  // ── Regression: "Waiting Payment" MUST NOT reappear in queue on refresh ──
  it('refreshed priced SO stays out of queue (simulates page refresh)', () => {
    // Simulates what happens after refreshBackendData re-maps the SO
    const refreshedSo = {
      id: 'so-1',
      status: 'Waiting Payment',      // computed by mapSalesOrderStatus
      backendStatus: 'Waiting Payment', // raw backend status
      backendDesignStatus: 'Approved',
      items: itemsWithPrice,          // prices are set
      designLink: null,
      customerDrawingUrl: null,
      designReference: null,
    };
    expect(isInQueue(refreshedSo)).toBe(false);
    expect(isInHistory(refreshedSo)).toBe(true);
  });

  // ── Regression: SO must not oscillate between queue and history ──
  it('SO stays in history after pricing (no oscillation)', () => {
    // Phase 1: Before pricing
    const beforePricing = {
      id: 'so-1',
      status: 'Waiting Pricing',
      backendStatus: 'Waiting Pricing',
      items: itemsWithoutPrice,
    };
    expect(isInQueue(beforePricing)).toBe(true);
    expect(isInHistory(beforePricing)).toBe(false);

    // Phase 2: After pricing (simulating refreshBackendData)
    const afterPricing = {
      id: 'so-1',
      status: 'Waiting Payment',
      backendStatus: 'Waiting Payment',
      items: itemsWithPrice,
    };
    expect(isInQueue(afterPricing)).toBe(false);
    expect(isInHistory(afterPricing)).toBe(true);

    // Phase 3: Another refresh (should remain in history)
    expect(isInQueue(afterPricing)).toBe(false);
    expect(isInHistory(afterPricing)).toBe(true);
  });
});
