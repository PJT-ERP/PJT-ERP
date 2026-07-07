import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionDetailModal } from './ProductionDetailModal';
import { useApp } from '../../context/AppContext';
import { productionApi } from '../../../services/productionApi';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/productionApi', () => ({
  productionApi: {
    getSalesOrderMaterialTracking: vi.fn(),
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
  });

  it('renders custom BOM specifications even when Material Tracking data is loaded', async () => {
    const so = {
      id: 'SO-123',
      backendId: '11111111-2222-3333-4444-555555555555',
      status: 'Ready',
      customerName: 'Test Customer',
      materials: [
        { itemName: 'Kayu', specification: '100x50' },
        { itemName: 'Kayu', specification: '100x100' }
      ]
    } as any;

    // Simulate material tracking data being loaded (which previously hid the BOM section)
    vi.mocked(productionApi.getSalesOrderMaterialTracking).mockResolvedValue({
      salesOrderId: '11111111-2222-3333-4444-555555555555',
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
      expect(productionApi.getSalesOrderMaterialTracking).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555');
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
});
