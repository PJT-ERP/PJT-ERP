import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuppliersPage } from './suppliers-page';
import { usePurchasingData } from './usePurchasingData';
import { masterDataApi } from '../../services/masterDataApi';

vi.mock('../../services/masterDataApi', () => ({
  masterDataApi: {
    updateSupplier: vi.fn(),
  }
}));

vi.mock('./usePurchasingData', () => ({
  usePurchasingData: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useApp: vi.fn(() => ({ currentUser: { role: 'Purchasing', name: 'Test User' } })),
}));

describe('SuppliersPage', () => {
  it('renders correctly with supplier data', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      suppliers: [
        {
          id: 's1',
          code: 'SUP-001',
          name: 'Test Supplier',
          type: 'PT',
          category: 'Raw Material',
          city: 'Jakarta',
          status: 'Active',
          rating: 4.5
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    expect(screen.getByText('Supplier Management')).toBeInTheDocument();
    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
  });

  it('filters suppliers by search input', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      suppliers: [
        {
          id: 's1',
          code: 'SUP-001',
          name: 'Alpha Corp',
          type: 'PT',
          category: 'Raw Material',
          city: 'Jakarta',
          status: 'Active',
          rating: 4.5
        },
        {
          id: 's2',
          code: 'SUP-002',
          name: 'Beta Ltd',
          type: 'CV',
          category: 'Packaging',
          city: 'Bandung',
          status: 'Inactive',
          rating: 3.5
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Ltd')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Cari nama, kode/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta Ltd')).not.toBeInTheDocument();
  });

  it('allows editing a supplier', async () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      suppliers: [
        {
          id: 's1',
          code: 'SUP-001',
          name: 'Test Supplier',
          type: 'PT',
          category: 'Raw Material',
          city: 'Jakarta',
          status: 'Active',
          rating: 4.5,
          contacts: []
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);
    
    vi.mocked(masterDataApi.updateSupplier).mockResolvedValue({} as any);

    render(<SuppliersPage />);
    
    // Click on the supplier to open details
    fireEvent.click(screen.getByText('Test Supplier'));
    
    // Wait for detail view and click Edit
    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);

    // Change supplier name (wait for modal)
    const nameInput = await screen.findByLabelText(/Nama Perusahaan/i);
    fireEvent.change(nameInput, { target: { value: 'Test Supplier Updated' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Simpan/i });
    fireEvent.click(saveBtn);

    // Verify API call
    expect(masterDataApi.updateSupplier).toHaveBeenCalledWith(
      'SUP-001',
      expect.objectContaining({
        name: 'Test Supplier Updated',
      })
    );
  });
  it('shows supplier detail with KPI cards and tabs after clicking a supplier', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      suppliers: [
        {
          id: 's1',
          code: 'SUP-001',
          name: 'History Supplier',
          type: 'PT',
          category: 'Raw Material',
          city: 'Jakarta',
          status: 'Active',
          rating: 4.5,
          contacts: [],
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    
    // Click the supplier to open detail view
    fireEvent.click(screen.getByText('History Supplier'));

    // KPI cards render with computed values (zero since no purchase data)
    expect(screen.getByText('0 PO')).toBeInTheDocument();

    // Tab triggers should render
    expect(screen.getByText('Riwayat Pembelian')).toBeInTheDocument();
    expect(screen.getByText('Performa')).toBeInTheDocument();

    // Detail view tabs are present
    expect(screen.getByText('Informasi')).toBeInTheDocument();
    expect(screen.getByText('Kontak')).toBeInTheDocument();
  });

  it('shows supplier info in detail view info tab', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      suppliers: [
        {
          id: 's1',
          code: 'SUP-001',
          name: 'History Supplier',
          type: 'PT',
          category: 'Raw Material',
          city: 'Jakarta',
          status: 'Active',
          rating: 4.5,
          contacts: [],
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    
    fireEvent.click(screen.getByText('History Supplier'));

    // The Info tab is the default active tab and shows supplier details
    expect(screen.getByText('SUP-001 · PT · Raw Material')).toBeInTheDocument();
    expect(screen.getAllByText('Jakarta,').length).toBeGreaterThanOrEqual(1);
  });
});
