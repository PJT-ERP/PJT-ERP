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
    updateProductBom: vi.fn(),
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
      salesOrders: [],
      setSalesOrders: vi.fn(),
      updateSalesOrder: vi.fn(),
      currentUser: { role: 'Supervisor' }
    } as any);
    vi.mocked(masterDataApi.listInventory).mockResolvedValue([
      { id: 'INV-1', name: 'Plastik', code: 'P-01', unit: 'kg' }
    ] as any);
    vi.mocked(masterDataApi as any).updateProductBom = vi.fn().mockResolvedValue({});
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

  it('allows adding a new BOM if materials are empty', async () => {
    const { updateSalesOrder } = vi.mocked(useApp)();
    
    const so = {
      id: 'SO-TAMBAH',
      status: 'Produksi',
      quantity: 1,
      materials: [], // Empty BOM triggers "Tambah BOM" badge and button
      items: [
        { productId: 'PROD-X', productName: 'Produk Baru X' }
      ]
    } as any;

    render(<ProductionDetailModal so={so} onClose={vi.fn()} />);

    // Wait for inventory fetch
    await waitFor(() => {
      expect(masterDataApi.listInventory).toHaveBeenCalled();
    });

    // Should render the Tambah BOM button
    const tambahBtn = screen.getByText('+ Tambah BOM');
    expect(tambahBtn).toBeInTheDocument();

    const { fireEvent } = await import('@testing-library/react');

    // Click Tambah BOM
    fireEvent.click(tambahBtn);

    // Check if the form is rendered for the product
    expect(screen.getByText('Produk Baru X')).toBeInTheDocument();
    
    // Add a material row
    const addMaterialBtn = screen.getByText('+ Tambah Material');
    fireEvent.click(addMaterialBtn);

    // Select inventory item using MaterialAutocomplete input
    const autocompleteInput = screen.getByPlaceholderText('Pilih dari Master Data atau ketik manual...');
    expect(autocompleteInput).toBeInTheDocument();
    
    // Type into autocomplete
    fireEvent.change(autocompleteInput, { target: { value: 'Pla' } });
    
    // Select the option from dropdown
    const option = await screen.findByText('Plastik');
    fireEvent.mouseDown(option);

    // Set quantity
    const input = screen.getByPlaceholderText('Qty');
    fireEvent.change(input, { target: { value: '5' } });

    // Save
    const saveBtn = screen.getByText('Simpan BOM');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // 1. Should save to MasterData
      expect(masterDataApi.updateProductBom).toHaveBeenCalledWith('PROD-X', {
        bomItems: [{ inventoryItemId: 'INV-1', quantity: 5 }]
      });

      // 2. Should update current SO
      expect(updateSalesOrder).toHaveBeenCalledWith('SO-TAMBAH', {
        bomsPerItem: {
          'PROD-X': [{ inventoryItemId: 'INV-1', name: 'Plastik', quantity: 5, unit: 'kg' }]
        }
      });
    });
  });
});
