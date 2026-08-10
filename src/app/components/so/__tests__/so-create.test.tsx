import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOCreate } from '../so-create';
import { useApp } from '../../context/AppContext';
import { useSalesOrdersQuery, useCustomersQuery, useProductsQuery } from '../../../services/queries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCustomersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useProductsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCustomerMutation: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    listCustomers: vi.fn().mockResolvedValue([]),
    listProducts: vi.fn().mockResolvedValue([]),
    listSalesOrders: vi.fn().mockResolvedValue([]),
    getNextCustomerCode: vi.fn().mockResolvedValue({ code: 'CUST-020' }),
    createCustomer: vi.fn().mockResolvedValue({ id: 'cust-1', code: 'CUST-020' }),
    createProduct: vi.fn().mockResolvedValue({ id: 'prod-1' }),
    createSalesOrder: vi.fn().mockResolvedValue({ id: 'so-1', soNumber: 'SO-2026-076' }),
  },
}));

const mockProductCatalog = [
  {
    id: 'prod-1', label: 'PART-001 - Shaft D20', partNumber: 'PART-001', unit: 'pcs',
    materialSpec: 'S45C Carbon Steel, D20mm x 150mm',
    bomItems: [
      { inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'S45C Round Bar D20', quantity: 1, unit: 'batang' },
    ],
  },
];

describe('SOCreate Component', () => {
  const onNavigate = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      customers: [{ code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi', phone: '0812', email: 'budi@maju.com', address: 'Jakarta', contact: 'budi@maju.com' }],
      productCatalog: mockProductCatalog,
      salesOrders: [
        {
          id: 'so-unpriced',
          soNumber: 'SO-2026-001',
          customerId: 'CUST-001',
          description: 'Test Repeat Unpriced',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 0 }
          ]
        },
        {
          id: 'so-priced',
          soNumber: 'SO-2026-002',
          customerId: 'CUST-001',
          description: 'Test Repeat Priced',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 500 }
          ]
        }
      ],
      currentUser: { id: 'u1', role: 'Sales', name: 'Sales Staff' },
      users: [],
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn().mockResolvedValue(undefined),
      purchasingRequests: [],
    } as any);

    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'so-unpriced',
          soNumber: 'SO-2026-001',
          customerId: 'CUST-001',
          description: 'Test Repeat Unpriced',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 0 }
          ]
        },
        {
          id: 'so-priced',
          soNumber: 'SO-2026-002',
          customerId: 'CUST-001',
          description: 'Test Repeat Priced',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 500 }
          ]
        }
      ],
      isLoading: false
    } as any);

    vi.mocked(useCustomersQuery).mockReturnValue({
      data: [{ code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi', phone: '0812', email: 'budi@maju.com', address: 'Jakarta', contact: 'budi@maju.com' }],
      isLoading: false
    } as any);

    vi.mocked(useProductsQuery).mockReturnValue({
      data: mockProductCatalog,
      isLoading: false
    } as any);
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders order type selection cards', () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    expect(screen.getByText('Pesanan Baru (New Order)')).toBeInTheDocument();
    expect(screen.getByText('Repeat Order')).toBeInTheDocument();
  });

  it('navigates to new order form', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Submit Sales Order')).toBeInTheDocument());
  });

  it('shows customer info and detail order sections', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => {
      expect(screen.getByText('Informasi Pelanggan')).toBeInTheDocument();
      expect(screen.getByText('Detail Order')).toBeInTheDocument();
    });
  });

  it('allows switching to Pelanggan Terdaftar tab', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => fireEvent.click(screen.getByText('Pelanggan Terdaftar')));
    await waitFor(() => expect(screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...')).toBeInTheDocument());
  });

  it('shows Terdaftar / Custom product type toggle', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => {
      expect(screen.getByText('Terdaftar')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  it('shows Add Product button in product list', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Tambah Produk')).toBeInTheDocument());
  });

  it('shows Penetapan Harga section in new order form', async () => {
    renderWithClient(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Penetapan Harga')).toBeInTheDocument());
  });
  it('does NOT fallback to estimated amount if original SO is unpriced by Finance', async () => {
    const { container } = renderWithClient(<SOCreate onNavigate={onNavigate} />);
    
    // Select Repeat Order
    fireEvent.click(screen.getByText('Repeat Order'));
    
    // Ensure customer is selected
    const customerSelect = screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...');
    fireEvent.change(customerSelect, { target: { value: 'CUST-001' } });
    fireEvent.click(screen.getByText('PT Maju Jaya'));
    
    // Select previous unpriced SO
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
      const soSelect = selects[selects.length - 1];
      fireEvent.change(soSelect, { target: { value: 'so-unpriced' } });
    });
    
    await waitFor(() => {
      const inputs = container.querySelectorAll('input');
      const inputValues = Array.from(inputs).map(i => (i as HTMLInputElement).value);
      expect(inputValues).toContain('10'); // qty
      expect(inputValues).not.toContain('500');
    });
  });

  it('autofills unit price correctly if original SO was already priced by Finance', async () => {
    const { container } = renderWithClient(<SOCreate onNavigate={onNavigate} />);
    
    // Select Repeat Order
    fireEvent.click(screen.getByText('Repeat Order'));
    
    // Ensure customer is selected
    const customerSelect = screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...');
    fireEvent.change(customerSelect, { target: { value: 'CUST-001' } });
    fireEvent.click(screen.getByText('PT Maju Jaya'));
    
    // Select previous priced SO
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
      const soSelect = selects[selects.length - 1];
      fireEvent.change(soSelect, { target: { value: 'so-priced' } });
    });
    
    await waitFor(() => {
      const inputs = container.querySelectorAll('input');
      const inputValues = Array.from(inputs).map(i => (i as HTMLInputElement).value);
      expect(inputValues).toContain('10'); // qty
      expect(inputValues).toContain('500'); // unitPrice
    });
  });
});
