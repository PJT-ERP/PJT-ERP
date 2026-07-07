import { describe, it, expect } from 'vitest';
import { mapBomsPerItem } from './dataMappers';
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
