import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionDetailModal } from './ProductionDetailModal';
import { useApp } from '../../context/AppContext';
import { productionApi } from '../../../services/productionApi';
import { masterDataApi } from '../../../services/masterDataApi';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/productionApi', () => ({
  productionApi: {
    getSalesOrderMaterialTracking: vi.fn(),
  },
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn(),
  },
}));

// Mock the status badge so we don't have to worry about rendering complexity
vi.mock('../ProductionHelpers', async () => {
  const actual = await vi.importActual('../ProductionHelpers');
  return {
    ...actual,
    StatusBadge: () => <div>Status</div>,
  };
});

describe('ProductionDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      purchasingRequests: [],
    } as any);
    vi.mocked(masterDataApi.listInventory).mockResolvedValue([]);
  });

  it('renders custom BOM specifications even when Material Tracking data is loaded', async () => {
    const so = {
      id: 'SO-123',
      backendId: '11111111-2222-3333-8444-555555555555',
      status: 'Produksi',
      customerName: 'Test Customer',
      materials: [
        { itemName: 'Kayu', specification: '100x50' },
        { itemName: 'Kayu', specification: '100x100' }
      ]
    } as any;

    // Simulate material tracking data being loaded (which previously hid the BOM section)
    vi.mocked(productionApi.getSalesOrderMaterialTracking).mockResolvedValue({
      salesOrderId: '11111111-2222-3333-8444-555555555555',
      items: [
        {
          productId: 'PROD-1',
          materialRequirements: [
            { inventoryItemName: 'Kayu', inventoryItemCode: 'MAT-005', requiredQty: 10, stockOnHand: 5 }
          ]
        }
      ]
    } as any);

    render(<ProductionDetailModal so={so} onClose={vi.fn()} />);

    // Wait for the async useEffect to trigger the API mock
    await waitFor(() => {
      expect(productionApi.getSalesOrderMaterialTracking).toHaveBeenCalledWith('11111111-2222-3333-8444-555555555555');
    });

    // The BOM header should always be present
    expect(screen.getByText('Bill of Materials (BOM) / Kebutuhan')).toBeInTheDocument();

    // The custom specifications should be visible
    expect(screen.getAllByText('Kayu').length).toBeGreaterThan(0);
    expect(screen.getByText('- 100x50')).toBeInTheDocument();
    expect(screen.getByText('- 100x100')).toBeInTheDocument();

    // The Material Tracking section should ALSO be visible
    expect(screen.getAllByText('Material Tracking').length).toBeGreaterThan(0);
  });

  it('matches inventory items by name ignoring BOM specification for stock checks', async () => {
    const so = {
      id: 'SO-124',
      status: 'Produksi',
      quantity: 2,
      materials: [
        { itemName: 'batu', specification: 'bata', quantity: 10 } // Butuh: 10
      ]
    } as any;

    vi.mocked(masterDataApi.listInventory).mockResolvedValue([
      { name: 'batu', code: 'MAT-001', currentStock: 121 } // Master Data has no spec
    ] as any);

    render(<ProductionDetailModal so={so} onClose={vi.fn()} />);

    // Wait for inventory fetch
    await waitFor(() => {
      expect(masterDataApi.listInventory).toHaveBeenCalled();
    });

    // The reqQty should be 2 * 5 = 10
    expect(screen.getByText('10')).toBeInTheDocument(); // Butuh: 10
    
    // The stock should be 121, meaning it matched successfully
    expect(screen.getByText('121')).toBeInTheDocument(); // Stok Gudang: 121
  });
});
