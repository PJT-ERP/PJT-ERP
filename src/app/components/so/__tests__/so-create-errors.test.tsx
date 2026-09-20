import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOCreate } from '../so-create';
import { useApp } from '../../context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProductsQuery } from '../../../services/queries';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCustomersQuery: vi.fn(() => ({ data: [],
    useUsersQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcInspectionsQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcQueuesQuery: vi.fn().mockReturnValue({ data: [] }), isLoading: false })),
  useProductsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCustomerMutation: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    getNextCustomerCode: vi.fn().mockResolvedValue({ code: 'CUST-001' }),
  },
}));

const mockNavigate = vi.fn();

describe('SOCreate — error states', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    vi.mocked(useProductsQuery).mockReturnValue({
      data: [],
      isLoading: false
    } as any);
    vi.mocked(useApp).mockReturnValue({
      customers: [],
      productCatalog: [],
      salesOrders: [],
      currentUser: { id: 'u1', role: 'Sales', name: 'Sales' },
      users: [],
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn().mockResolvedValue(undefined),
      purchasingRequests: [],
    } as any);
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders empty state without crashing when no product catalog', () => {
    renderWithClient(<SOCreate onNavigate={mockNavigate} />);
    expect(screen.getByText('Pesanan Baru (New Order)')).toBeInTheDocument();
    expect(screen.getByText('Repeat Order')).toBeInTheDocument();
  });

  it('shows Pesanan Baru form with submit button', async () => {
    renderWithClient(<SOCreate onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));

    await waitFor(() => {
      const submitBtn = screen.getByText('Submit Sales Order');
      expect(submitBtn).toBeInTheDocument();
    });
  });

  it('shows Kode Pelanggan as Auto-generated', async () => {
    renderWithClient(<SOCreate onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));

    await waitFor(() => {
      expect(screen.getByText('Kode Pelanggan (Auto)')).toBeInTheDocument();
    });
  });
});
