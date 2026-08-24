import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionDetailModal } from './ProductionDetailModal';
import { useApp } from '../../context/AppContext';
import { productionApi } from '../../../services/productionApi';
import { masterDataApi } from '../../../services/masterDataApi';

import { useUpdateSalesOrderMutation } from '../../../services/queries';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/queries', () => ({
  useUpdateSalesOrderMutation: vi.fn(),
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
      currentUser: { role: 'Supervisor' }
    } as any);
    vi.mocked(useUpdateSalesOrderMutation).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) } as any);
    vi.mocked(masterDataApi.listInventory).mockResolvedValue([
      { id: '90000000-0000-4000-8000-000000000001', name: 'Plastik', code: 'P-01', unit: 'kg' }
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
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateSalesOrderMutation).mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    
    const so = {
      id: 'SO-TAMBAH',
      status: 'Produksi',
      quantity: 1,
      materials: [], // Empty BOM triggers "Tambah BOM" badge and button
      items: [
        { productId: '44444444-5555-4666-8777-888888888888', productName: 'Produk Baru X', id: 'ITEM-NEW' }
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
      expect(masterDataApi.updateProductBom).toHaveBeenCalledWith('44444444-5555-4666-8777-888888888888', {
        bomItems: [{ inventoryItemId: '90000000-0000-4000-8000-000000000001', quantity: 5 }]
      });

      // 2. Should update current SO
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'SO-TAMBAH',
        data: {
          bomsPerItem: {
            'ITEM-NEW': [{ inventoryItemId: '90000000-0000-4000-8000-000000000001', name: 'Plastik', quantity: 5, unit: 'kg', isCustomerMaterial: undefined }]
          },
          notes: "[{\"name\":\"Plastik\",\"quantity\":5,\"unit\":\"kg\",\"inventoryItemId\":\"90000000-0000-4000-8000-000000000001\"}]"
        }
      });
    });
  });

  it('saves custom BOM and excludes non-GUID materials from Master Data updates (dari pelanggan scenario)', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateSalesOrderMutation).mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    
    const so = {
      id: 'SO-125',
      backendId: '22222222-3333-4444-8555-666666666666',
      status: 'Persiapan Material',
      quantity: 1,
      items: [
        { productId: '11111111-2222-4333-8444-555555555555', productName: 'Custom Table', id: 'ITEM-1' }
      ],
      bomsPerItem: {
        'ITEM-1': [
          { inventoryItemId: '33333333-4444-4555-8666-777777777777', name: 'Kayu', quantity: 1, unit: 'pcs' },
          { inventoryItemId: 'temp-dari-pelanggan', name: 'Cat Khusus', quantity: 2, unit: 'pcs', isCustomerMaterial: true }
        ]
      }
    } as any;

    vi.mocked(masterDataApi.listInventory).mockResolvedValue([] as any);

    render(<ProductionDetailModal so={so} onClose={vi.fn()} />);

    // Wait for the Edit BOM button to be available
    const editBtn = await screen.findByText('Edit BOM');
    
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(editBtn);

    // Change quantity of Cat Khusus from 2 to 3
    const inputs = await screen.findAllByPlaceholderText('Qty');
    // inputs[0] is Kayu, inputs[1] is Cat Khusus
    fireEvent.change(inputs[1], { target: { value: '3' } });

    // Save
    const saveBtn = screen.getByText('Simpan BOM');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // 1. Master Data should ONLY receive the valid GUID item (Kayu), not the temp customer material
      expect(masterDataApi.updateProductBom).toHaveBeenCalledWith('11111111-2222-4333-8444-555555555555', {
        bomItems: [{ inventoryItemId: '33333333-4444-4555-8666-777777777777', quantity: 1 }]
      });

      // 2. Sales Order mutation should receive BOTH items to save to the SO notes
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '22222222-3333-4444-8555-666666666666',
        data: expect.objectContaining({
          bomsPerItem: {
            'ITEM-1': [
              { inventoryItemId: '33333333-4444-4555-8666-777777777777', name: 'Kayu', quantity: 1, unit: 'pcs', isCustomerMaterial: undefined },
              { inventoryItemId: 'temp-dari-pelanggan', name: 'Cat Khusus', quantity: 3, unit: 'pcs', isCustomerMaterial: true }
            ]
          }
        })
      });
    });
  });
});
