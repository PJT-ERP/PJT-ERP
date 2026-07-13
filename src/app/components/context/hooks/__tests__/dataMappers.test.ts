import { describe, it, expect } from 'vitest';
import { mapSalesOrderStatus } from '../dataMappers';

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
