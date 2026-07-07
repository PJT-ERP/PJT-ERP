import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { StartProductionModal } from './StartProductionModal';
import { useApp } from '../../context/AppContext';
import { masterDataApi } from '../../../services/masterDataApi';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    getBomStock: vi.fn(),
  },
}));

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('StartProductionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      currentUser: { role: 'Engineering' },
      productCatalog: [],
      refreshBackendData: vi.fn(),
    } as any);
  });

  it('bypasses stock check when resuming a non-material paused production', async () => {
    const so = {
      id: 'SO-123',
      status: 'Paused',
      pauseReason: 'Kapasitas Penuh',
      items: [{ productId: 'PROD-1', quantity: 5 }]
    } as any;

    vi.mocked(masterDataApi.getBomStock).mockResolvedValue([
      {
        productId: 'PROD-1',
        items: [{ inventoryItemName: 'Aluminium', bomQuantity: 2, currentStock: 0 }]
      }
    ] as any);

    render(
      <MemoryRouter>
        <StartProductionModal so={so} onClose={vi.fn()} />
      </MemoryRouter>
    );
    
    // It should instantly skip stock checking and allow "Lanjutkan Produksi"
    // Since getBomStock shouldn't even be called:
    expect(masterDataApi.getBomStock).not.toHaveBeenCalled();

    // The submit button should be enabled and say "Lanjutkan Produksi"
    await waitFor(() => {
      expect(screen.getAllByText('Lanjutkan Produksi').length).toBeGreaterThan(0);
      expect(screen.queryByText('Stok Material Tidak Cukup')).not.toBeInTheDocument();
    });
  });

  it('bypasses stock check when resuming a material paused production as well', async () => {
    const so = {
      id: 'SO-123',
      status: 'Paused',
      pauseReason: 'Kurang material baja',
      items: [{ productId: 'PROD-1', quantity: 5 }]
    } as any;

    vi.mocked(masterDataApi.getBomStock).mockResolvedValue([
      {
        productId: 'PROD-1',
        items: [{ inventoryItemName: 'Baja', bomQuantity: 2, currentStock: 0 }]
      }
    ] as any);

    render(
      <MemoryRouter>
        <StartProductionModal so={so} onClose={vi.fn()} />
      </MemoryRouter>
    );
    
    // Stock check is bypassed for ALL paused productions — materials were already
    // allocated/checked at first start and shortages are handled manually.
    expect(masterDataApi.getBomStock).not.toHaveBeenCalled();

    // The submit button should be enabled and say "Lanjutkan Produksi"
    await waitFor(() => {
      expect(screen.getAllByText('Lanjutkan Produksi').length).toBeGreaterThan(0);
      expect(screen.queryByText('Stok Material Tidak Cukup')).not.toBeInTheDocument();
    });
  });

  it('captures specific material specifications from bomsPerItem when there is a stock shortage', async () => {
    const mockNavigate = vi.fn();
    const { useNavigate } = await import('react-router');
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    const so = {
      id: 'SO-123',
      status: 'Ready',
      items: [{ id: 'ITEM-1', productId: 'PROD-1', quantity: 1 }],
      bomsPerItem: {
        'ITEM-1': [
          { inventoryItemId: 'INV-1', name: 'Aluminium', spec: '100x50', quantity: 1 },
          { inventoryItemId: 'INV-1', name: 'Aluminium', spec: '200x300', quantity: 1 }
        ]
      }
    } as any;

    vi.mocked(masterDataApi.getBomStock).mockResolvedValue([
      {
        productId: 'PROD-1',
        items: [{ inventoryItemId: 'INV-1', inventoryItemName: 'Aluminium', bomQuantity: 2, currentStock: 1 }]
      }
    ] as any);

    render(
      <MemoryRouter>
        <StartProductionModal so={so} onClose={vi.fn()} />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Stok Material Tidak Cukup')).toBeInTheDocument();
    });

    const createMrButton = screen.getByText('Buat Material Request');
    createMrButton.click();

    expect(mockNavigate).toHaveBeenCalledWith('/erp/production/mr/SO-123', {
      state: {
        stockIssues: [
          {
            itemName: 'Aluminium',
            required: 2,
            available: 1,
            bomQty: 2,
            productQty: 1,
            specs: [
              { spec: '100x50', quantity: 1 },
              { spec: '200x300', quantity: 1 }
            ]
          }
        ]
      }
    });
  });

  it('aggregates duplicate bomStock items and does not duplicate custom specifications', async () => {
    const mockNavigate = vi.fn();
    const { useNavigate } = await import('react-router');
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    const so = {
      id: 'SO-123',
      status: 'Ready',
      items: [{ id: 'ITEM-1', productId: 'PROD-1', quantity: 1 }],
      bomsPerItem: {
        'ITEM-1': [
          { inventoryItemId: 'INV-1', name: 'Aluminium', spec: '100x50', quantity: 1 },
          { inventoryItemId: 'INV-1', name: 'Aluminium', spec: '200x300', quantity: 1 }
        ]
      }
    } as any;

    vi.mocked(masterDataApi.getBomStock).mockResolvedValue([
      {
        productId: 'PROD-1',
        items: [
          // Simulate the backend returning the identical item twice (e.g. from Custom Product saving)
          { inventoryItemId: 'INV-1', inventoryItemName: 'Aluminium', bomQuantity: 1, currentStock: 0 },
          { inventoryItemId: 'INV-1', inventoryItemName: 'Aluminium', bomQuantity: 1, currentStock: 0 }
        ]
      }
    ] as any);

    render(
      <MemoryRouter>
        <StartProductionModal so={so} onClose={vi.fn()} />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Stok Material Tidak Cukup')).toBeInTheDocument();
    });

    const createMrButton = screen.getByText('Buat Material Request');
    createMrButton.click();

    expect(mockNavigate).toHaveBeenCalledWith('/erp/production/mr/SO-123', {
      state: {
        stockIssues: [
          {
            itemName: 'Aluminium',
            // Aggregated bomQty should be 2, required should be 2
            required: 2,
            available: 0,
            bomQty: 2,
            productQty: 1,
            // Specifications should exactly match the 2 unique custom specs, without duplicating to 4
            specs: [
              { spec: '100x50', quantity: 1 },
              { spec: '200x300', quantity: 1 }
            ]
          }
        ]
      }
    });
  });
});
