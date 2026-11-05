import { describe, it, expect } from 'vitest';
import { isActiveQuotationEntry, mapBomsPerItem, mapQuotationDto } from './dataMappers';
import { SalesOrderDto } from '../../../services/salesApi';

describe('dataMappers - mapBomsPerItem', () => {
  it('correctly parses JSON array from notes into bomsPerItem', () => {
    const order: SalesOrderDto = {
      items: [
        {
          id: 'ITEM-1',
          notes: '[{"name": "Kayu", "spec": "100x50", "quantity": 10, "inventoryItemId": "MAT-005"}]',
        },
        {
          id: 'ITEM-2',
          notes: 'Regular note, not JSON',
        }
      ]
    } as any;

    const result = mapBomsPerItem(order);

    expect(result['ITEM-1']).toHaveLength(1);
    expect(result['ITEM-1'][0].inventoryItemId).toBe('MAT-005');
    expect(result['ITEM-1'][0].spec).toBe('100x50');
    
    // Non-JSON notes should result in an empty array
    expect(result['ITEM-2']).toEqual([]);
  });

  it('handles empty notes, malformed JSON, and non-array JSON safely', () => {
    const order: SalesOrderDto = {
      items: [
        { id: 'ITEM-1', notes: undefined },
        { id: 'ITEM-2', notes: '[malformed json}' },
        { id: 'ITEM-3', notes: '{"this": "is an object, not array"}' }
      ]
    } as any;

    const result = mapBomsPerItem(order);

    expect(result['ITEM-1']).toEqual([]);
    expect(result['ITEM-2']).toEqual([]);
    expect(result['ITEM-3']).toEqual([]);
  });
});

describe('isActiveQuotationEntry', () => {
  it('keeps a won quotation available until it has a conversion reference', () => {
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won' } as any)).toBe(true);
  });

  it('hides a converted won quotation by its SalesOrder ID or number', () => {
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won', convertedSalesOrderId: 'so-guid' } as any)).toBe(false);
    expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: 'won', convertedSalesOrderNumber: 'SO-2026-001' } as any)).toBe(false);
  });

  it('preserves the backend conversion reference when mapping a Quotation DTO', () => {
    const mapped = mapQuotationDto({
      id: 'quotation-guid', quotationNumber: 'QU-2026-001', status: 'won',
      convertedSalesOrderId: 'sales-order-guid', convertedSalesOrderNumber: 'SO-2026-001',
      items: [], bomItems: [], createdAtUtc: '', deadline: '', designSource: 'Engineering',
    } as any);

    expect(mapped.convertedSalesOrderId).toBe('sales-order-guid');
    expect(isActiveQuotationEntry(mapped)).toBe(false);
  });

  it('keeps all active quotation workflow statuses visible', () => {
    const statuses = [
      'draft', 'pending_design', 'design_review', 'client_design_approval',
      'waiting_pricing', 'client_price_approval', 'won', 'lost',
    ];

    statuses.forEach(status => {
      expect(isActiveQuotationEntry({ isQuotation: true, backendStatus: status } as any)).toBe(true);
    });
  });
});
