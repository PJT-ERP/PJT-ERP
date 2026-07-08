import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    // Change supplier name
    const nameInput = screen.getByDisplayValue('Test Supplier');
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
  it('shows purchase history on Riwayat Pembelian tab', async () => {
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
          history: [
            { month: 'Jul', pos: 4, value: 10 },
            { month: 'Aug', pos: 0, value: 0 }
          ],
          totalPOs: 4,
          totalValue: 10,
          onTimeRate: 100,
          defectRate: 0,
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    
    // Click on the supplier to open details
    fireEvent.click(screen.getByText('History Supplier'));

    // Click on the 'Riwayat Pembelian' tab
    fireEvent.click(screen.getByText('Riwayat Pembelian'));

    // Check if the history chart/table title is rendered
    await waitFor(() => {
      expect(screen.getByText('Nilai Pembelian 6 Bulan Terakhir (Juta Rp)')).toBeInTheDocument();
    });
    
    // Check if table data is rendered correctly
    expect(screen.getByText('Jul 2026')).toBeInTheDocument();
    expect(screen.getByText('4 PO')).toBeInTheDocument();
    expect(screen.getByText('Rp 10 Jt')).toBeInTheDocument();

    expect(screen.getByText('Aug 2026')).toBeInTheDocument();
    expect(screen.getByText('0 PO')).toBeInTheDocument();
  });

  it('shows performance metrics on Performa tab', async () => {
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
          history: [],
          totalPOs: 12,
          totalValue: 50,
          onTimeRate: 92,
          defectRate: 1.5,
        }
      ],
      purchaseRequests: [],
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(<SuppliersPage />);
    
    // Click on the supplier to open details
    fireEvent.click(screen.getByText('History Supplier'));

    // Click on the 'Performa' tab
    fireEvent.click(screen.getByText('Performa'));

    // Check if the performance metrics are rendered correctly
    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument(); // On-Time Delivery
    });
    expect(screen.getByText('1.5%')).toBeInTheDocument(); // Defect Rate
    expect(screen.getByText('12')).toBeInTheDocument(); // Total PO (6 bln)
    expect(screen.getByText('4.5/5.0')).toBeInTheDocument(); // Rating
    
    // Check for target texts
    expect(screen.getByText('Target: ≥ 90%')).toBeInTheDocument();
    expect(screen.getByText('Target: ≤ 2%')).toBeInTheDocument();
  });
});
