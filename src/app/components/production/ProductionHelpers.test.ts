import { describe, it, expect } from 'vitest';
import { getMaterialOptions } from './ProductionHelpers';
import { SalesOrder } from '../data/mockData';

describe('ProductionHelpers - getMaterialOptions', () => {
  it('should aggregate material quantities without multiplying by product quantity', () => {
    // Scenario: Sales Order with an item that has a quantity > 1.
    // The BOM material should NOT be multiplied by the item's quantity.
    // The previous bug was that (Material Qty) * (Product Qty) was being returned.
    const mockSO: SalesOrder = {
      id: 'SO-123',
      soNumber: 'SO-123',
      customerName: 'Test Customer',
      status: 'Ready for Production',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Table',
          productPartNumber: 'TBL',
          quantity: 5 // 5 Tables
        }
      ],
      bomsPerItem: {
        'item-1': [
          {
            name: 'Wood Board',
            quantity: 3, // Each BOM specifies 3 Wood Boards total for this production run, should NOT be 3 * 5 = 15
            unit: 'pcs',
            isCustomerMaterial: false
          }
        ]
      }
    };

    const materials = getMaterialOptions(mockSO, true);

    expect(materials).toHaveLength(1);
    expect(materials[0].itemName).toBe('Wood Board');
    // Crucial assertion: the quantity should be exactly what's in the BOM (3), not multiplied by item quantity (5)
    expect(materials[0].quantity).toBe(3);
    expect(materials[0].isCustomerMaterial).toBe(false);
  });

  it('should correctly filter out customer materials when includeCustomerMaterials is false', () => {
    // Scenario: The SO contains a "Dari Pelanggan" material.
    // When checking for MR (Material Request) or Stock Checks, these materials should be ignored.
    const mockSO: SalesOrder = {
      id: 'SO-124',
      soNumber: 'SO-124',
      customerName: 'Test Customer 2',
      status: 'Ready for Production',
      items: [
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Chair',
          quantity: 1
        }
      ],
      bomsPerItem: {
        'item-2': [
          {
            name: 'Standard Wood',
            quantity: 2,
            isCustomerMaterial: false // Internal stock
          },
          {
            name: 'Special Fabric (Dari Pelanggan)',
            quantity: 5,
            isCustomerMaterial: true // Customer material
          }
        ]
      }
    };

    // When includeCustomerMaterials = false (e.g. for MR and Stock checks)
    const materialsForStockCheck = getMaterialOptions(mockSO, false);

    expect(materialsForStockCheck).toHaveLength(1);
    expect(materialsForStockCheck[0].itemName).toBe('Standard Wood');
    expect(materialsForStockCheck.find(m => m.itemName.includes('Special Fabric'))).toBeUndefined();
  });

  it('should correctly include customer materials when includeCustomerMaterials is true', () => {
    // Scenario: The SO contains a "Dari Pelanggan" material.
    // When displaying the full BOM list to operators, we want to include customer materials.
    const mockSO: SalesOrder = {
      id: 'SO-125',
      soNumber: 'SO-125',
      customerName: 'Test Customer 3',
      status: 'In Production',
      items: [
        {
          id: 'item-3',
          productId: 'prod-3',
          productName: 'Desk',
          quantity: 1
        }
      ],
      bomsPerItem: {
        'item-3': [
          {
            name: 'Standard Wood',
            quantity: 2,
            isCustomerMaterial: false
          },
          {
            name: 'Special Fabric (Dari Pelanggan)',
            quantity: 5,
            isCustomerMaterial: true
          }
        ]
      }
    };

    // When includeCustomerMaterials = true (e.g. for displaying the BOM list in UI)
    const allMaterials = getMaterialOptions(mockSO, true);

    expect(allMaterials).toHaveLength(2);
    
    const standardWood = allMaterials.find(m => m.itemName === 'Standard Wood');
    expect(standardWood).toBeDefined();
    expect(standardWood?.isCustomerMaterial).toBe(false);

    const specialFabric = allMaterials.find(m => m.itemName === 'Special Fabric (Dari Pelanggan)');
    expect(specialFabric).toBeDefined();
    expect(specialFabric?.isCustomerMaterial).toBe(true);
  });

  it('should correctly aggregate quantities for the same material across multiple items', () => {
    // Scenario: An SO has multiple items that use the same material.
    // The materials should be grouped by name + specification.
    const mockSO: SalesOrder = {
      id: 'SO-126',
      soNumber: 'SO-126',
      customerName: 'Test Customer 4',
      status: 'Ready for Production',
      items: [
        { id: 'item-A', productId: 'prod-A', productName: 'Item A', quantity: 1 },
        { id: 'item-B', productId: 'prod-B', productName: 'Item B', quantity: 1 }
      ],
      bomsPerItem: {
        'item-A': [
          { name: 'Nails', spec: '5cm', quantity: 10, isCustomerMaterial: false }
        ],
        'item-B': [
          { name: 'Nails', spec: '5cm', quantity: 20, isCustomerMaterial: false },
          { name: 'Wood', spec: 'Oak', quantity: 2, isCustomerMaterial: false }
        ]
      }
    };

    const materials = getMaterialOptions(mockSO, false);

    expect(materials).toHaveLength(2); // Nails and Wood
    
    const nails = materials.find(m => m.itemName === 'Nails');
    expect(nails).toBeDefined();
    expect(nails?.quantity).toBe(30); // 10 + 20
    expect(nails?.specification).toBe('5cm');

    const wood = materials.find(m => m.itemName === 'Wood');
    expect(wood).toBeDefined();
    expect(wood?.quantity).toBe(2);
  });
});
