import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOCreate } from '../so-create';
import { useApp } from '../../context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { salesApi } from '../../../services/salesApi';
import { useSalesOrdersQuery, useCustomersQuery, useProductsQuery } from '../../../services/queries';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCustomersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useProductsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn() })),
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
    createSalesOrder: vi.fn().mockResolvedValue({ id: 'so-new', soNumber: 'SO-2026-100' }),
    createCompleteSalesOrder: vi.fn().mockResolvedValue({ id: 'so-new', soNumber: 'SO-2026-100' }),
  },
}));

const mockProductCatalog = [
  {
    id: 'prod-1', label: 'PART-001 - Shaft D20', partNumber: 'PART-001', unit: 'pcs',
    materialSpec: 'S45C Carbon Steel',
    bomItems: [],
  },
  {
    id: 'prod-2', label: 'PART-002 - Block 10x10', partNumber: 'PART-002', unit: 'pcs',
    materialSpec: 'Aluminium 6061',
    bomItems: [],
  }
];

describe('SOCreate - Repeat Order Detailed Tests', () => {
  const onNavigate = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      customers: [
        { code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi' },
        { code: 'CUST-002', name: 'CV Makmur Sejahtera', contactPerson: 'Andi' }
      ],
      productCatalog: mockProductCatalog,
      salesOrders: [
        {
          id: 'so-1',
          soNumber: 'SO-2026-001',
          customerId: 'CUST-001',
          description: 'SO Pertama',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 0 }
          ]
        },
        {
          id: 'so-2',
          soNumber: 'SO-2026-002',
          customerId: 'CUST-001',
          description: 'SO Kedua - Priced',
          estimatedAmount: 150000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 20, unitPrice: 5000 },
            { productId: 'prod-2', productName: 'PART-002', qty: 10, unitPrice: 5000 }
          ]
        },
        {
          id: 'so-3',
          soNumber: 'SO-2026-003',
          customerId: 'CUST-002',
          description: 'SO Milik Customer 2',
          estimatedAmount: 20000,
          items: [
            { productId: 'prod-2', productName: 'PART-002', qty: 5, unitPrice: 4000 }
          ]
        }
      ]
    } as any);

    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'so-1',
          soNumber: 'SO-2026-001',
          customerId: 'CUST-001',
          description: 'SO Pertama',
          estimatedAmount: 5000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 10, unitPrice: 0 }
          ]
        },
        {
          id: 'so-2',
          soNumber: 'SO-2026-002',
          customerId: 'CUST-001',
          description: 'SO Kedua - Priced',
          estimatedAmount: 150000,
          items: [
            { productId: 'prod-1', productName: 'PART-001', qty: 20, unitPrice: 5000 },
            { productId: 'prod-2', productName: 'PART-002', qty: 10, unitPrice: 5000 }
          ]
        },
        {
          id: 'so-3',
          soNumber: 'SO-2026-003',
          customerId: 'CUST-002',
          description: 'SO Milik Customer 2',
          estimatedAmount: 20000,
          items: [
            { productId: 'prod-2', productName: 'PART-002', qty: 5, unitPrice: 4000 }
          ]
        }
      ],
      isLoading: false
    } as any);

    vi.mocked(useCustomersQuery).mockReturnValue({
      data: [
        { code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi' },
        { code: 'CUST-002', name: 'CV Makmur Sejahtera', contactPerson: 'Andi' }
      ],
      isLoading: false
    } as any);

    vi.mocked(useProductsQuery).mockReturnValue({
      data: mockProductCatalog,
      isLoading: false
    } as any);
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('filters previous SO list by selected customer', async () => {
    const { container } = renderWithClient(<SOCreate onNavigate={onNavigate} />);
    
    // Select Repeat Order
    fireEvent.click(screen.getByText('Repeat Order'));
    
    // Ensure customer is selected as CUST-001
    const customerSelect = screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...');
    fireEvent.change(customerSelect, { target: { value: 'CUST-001' } });
    fireEvent.click(screen.getByText(/PT Maju Jaya/));

    // Check SO dropdown
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
      const soSelect = selects[selects.length - 1];
      
      // Should contain so-1 and so-2 but NOT so-3
      const options = Array.from(soSelect.options).map(o => o.value);
      expect(options).toContain('so-1');
      expect(options).toContain('so-2');
      expect(options).not.toContain('so-3');
    });
  });

  it('populates product list correctly when a previous SO is selected', async () => {
    const { container } = renderWithClient(<SOCreate onNavigate={onNavigate} />);
    
    fireEvent.click(screen.getByText('Repeat Order'));
    
    const customerSelect = screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...');
    fireEvent.change(customerSelect, { target: { value: 'CUST-001' } });
    fireEvent.click(screen.getByText(/PT Maju Jaya/));
    
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      const soSelect = selects[selects.length - 1];
      fireEvent.change(soSelect, { target: { value: 'so-2' } });
    });
    
    await waitFor(() => {
      // Check that two products are loaded
      expect(screen.getByText(/PART-001/i)).toBeInTheDocument();
      expect(screen.getByText(/PART-002/i)).toBeInTheDocument();
      
      // Verify quantities
      const inputs = container.querySelectorAll('input');
      const inputValues = Array.from(inputs).map(i => (i as HTMLInputElement).value);
      expect(inputValues).toContain('20'); // Qty for prod-1
      expect(inputValues).toContain('10'); // Qty for prod-2
      expect(inputValues).toContain('5000'); // unitPrice autofilled
    });
  });

});
