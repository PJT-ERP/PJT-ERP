import { mapRepeatProducts } from '../hooks/useRepeatOrderForm';
import { describe, it, expect } from 'vitest';

describe('mapRepeatProducts', () => {
  const mockProductCatalog = [
    {
      id: 'prod-1',
      partNumber: 'PRD-001',
      description: 'Test Product 1',
      unit: 'pcs',
      materialSpec: 'Steel',
      bomItems: [
        {
          inventoryItemId: 'inv-1',
          inventoryItemCode: 'INV-001',
          inventoryItemName: 'Steel Sheet',
          quantity: 2,
          unit: 'kg'
        }
      ]
    },
    {
      id: 'prod-2',
      partNumber: 'PRD-002',
      description: 'Test Product 2',
      unit: 'set',
      materialSpec: 'Plastic',
      bomItems: []
    }
  ];

  it('should map products when selectedSo has items', () => {
    const selectedSo = {
      description: 'Old Order',
      items: [
        {
          productId: 'prod-1',
          partNumber: 'PRD-001',
          productName: 'Test Product 1 Custom Name',
          quantity: 5,
          unitPrice: 100,
          unit: 'pcs'
        },
        {
          productPartNumber: 'PRD-002',
          productDescription: 'Test Product 2',
          qty: 10,
          unitPrice: 200,
          unit: 'set'
        },
        {
          productName: 'Unknown Product',
          quantity: 2,
          unitPrice: 50,
          unit: 'pcs'
        }
      ]
    };

    const result = mapRepeatProducts(selectedSo, mockProductCatalog);

    expect(result).toHaveLength(3);

    // First item: matches by productId
    expect(result[0].type).toBe('existing');
    expect(result[0].productName).toBe('PRD-001 - Test Product 1');
    expect(result[0].quantity).toBe('5');
    expect(result[0].unitPrice).toBe(100);
    expect(result[0].materials).toHaveLength(1);
    expect(result[0].materials[0].name).toBe('Steel Sheet');
    expect(result[0].materials[0].quantity).toBe('2');

    // Second item: matches by productPartNumber
    expect(result[1].type).toBe('existing');
    expect(result[1].productName).toBe('PRD-002 - Test Product 2');
    expect(result[1].quantity).toBe('10');
    expect(result[1].unitPrice).toBe(200);
    expect(result[1].materials).toHaveLength(0);

    // Third item: no match, custom
    expect(result[2].type).toBe('custom');
    expect(result[2].productName).toBe('Unknown Product');
    expect(result[2].quantity).toBe('2');
    expect(result[2].unitPrice).toBe(50);
  });

  it('should fallback to single item mapping when selectedSo has no items array', () => {
    const selectedSo = {
      description: 'Test Product 1',
      quantity: 15,
      unit: 'pcs'
    };

    const result = mapRepeatProducts(selectedSo, mockProductCatalog);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('existing');
    expect(result[0].productName).toBe('PRD-001 - Test Product 1');
    expect(result[0].quantity).toBe('15');
    expect(result[0].unitPrice).toBe(0);
    expect(result[0].materials).toHaveLength(1);
    expect(result[0].materials[0].name).toBe('Steel Sheet');
    expect(result[0].materials[0].quantity).toBe('2');
  });

  it('should fallback to custom item when selectedSo has no items and description matches no product', () => {
    const selectedSo = {
      description: 'Random Custom Order',
      quantity: 100,
      unit: 'box'
    };

    const result = mapRepeatProducts(selectedSo, mockProductCatalog);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('custom');
    expect(result[0].productName).toBe('Random Custom Order');
    expect(result[0].quantity).toBe('100');
    expect(result[0].unitPrice).toBe(0);
    expect(result[0].materials).toHaveLength(0);
  });

  it('should parse custom BOM from notes and respect isCustomerMaterial flag (dari pelanggan scenario)', () => {
    const selectedSo = {
      description: 'Repeat Order with Custom Material',
      items: [
        {
          productId: 'prod-1',
          partNumber: 'PRD-001',
          productName: 'Test Product 1',
          quantity: 2,
          unitPrice: 100,
          unit: 'pcs',
          notes: JSON.stringify([
            {
              inventoryItemId: 'inv-1',
              name: 'Steel Sheet',
              quantity: 2,
              unit: 'kg'
            },
            {
              inventoryItemId: 'temp-cust-material',
              name: 'Customer Paint',
              quantity: 1,
              unit: 'can',
              isCustomerMaterial: true
            }
          ])
        }
      ]
    };

    const result = mapRepeatProducts(selectedSo, mockProductCatalog);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('existing');
    expect(result[0].materials).toHaveLength(2);

    // Verify first material (standard)
    expect(result[0].materials[0].name).toBe('Steel Sheet');
    expect(result[0].materials[0].isCustomerMaterial).toBeFalsy();

    // Verify second material (dari pelanggan)
    expect(result[0].materials[1].name).toBe('Customer Paint');
    expect(result[0].materials[1].isCustomerMaterial).toBe(true);
  });
});
