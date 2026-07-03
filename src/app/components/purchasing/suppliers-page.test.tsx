import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuppliersPage } from './suppliers-page';
import { usePurchasingData } from './usePurchasingData';

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
});
