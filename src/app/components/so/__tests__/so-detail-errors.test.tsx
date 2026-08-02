import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { SODetail } from '../so-detail';
import { useApp } from '../../context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinanceData } from '../../finance/useFinanceData';
import { useSalesOrdersQuery, useCustomersQuery, useProductsQuery } from '../../../services/queries';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn(),
  useCustomersQuery: vi.fn(),
  useProductsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateSalesOrderMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateCustomerMutation: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock('../../finance/useFinanceData', () => ({ useFinanceData: vi.fn() }));

describe('SODetail — error states', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();

    vi.mocked(useProductsQuery).mockReturnValue({
      data: [], isLoading: false
    } as any);
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [],
      customers: [],
      productCatalog: [],
      currentUser: { role: 'Sales' },
      users: [],
      purchasingRequests: [],
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn().mockResolvedValue(undefined),
    } as any);

    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [{ id: 'SO-101', status: 'Rejected' }],
      isLoading: false
    } as any);

    vi.mocked(useCustomersQuery).mockReturnValue({
      data: [],
      isLoading: false
    } as any);

    vi.mocked(useFinanceData).mockReturnValue({ invoices: [], payments: [], refresh: vi.fn(), isLoading: false } as any);
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders not-found message when order does not exist', async () => {
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [],
      customers: [],
      productCatalog: [],
      currentUser: null,
      users: [],
      purchasingRequests: [],
    } as any);

    renderWithClient(<SODetail orderId="NONEXISTENT" onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Order tidak ditemukan')).toBeInTheDocument();
      expect(screen.getByText('Kembali ke Daftar SO')).toBeInTheDocument();
    });
  });

  it('renders rejected status banner for cancelled SO', async () => {
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [{
        id: 'SO-REJ-1', customerId: 'CUST-1', customerName: 'PT X',
        description: 'Cancelled Order', quantity: 1, unit: 'pcs',
        deadline: '2026-01-01', status: 'Rejected', createdAt: '2026-01-01',
        items: [],
      }],
      isLoading: false
    } as any);
    
    vi.mocked(useCustomersQuery).mockReturnValue({
      data: [{ code: 'CUST-1', name: 'PT X', contactPerson: 'A', email: 'a@x.com' }],
      isLoading: false
    } as any);

    renderWithClient(<SODetail orderId="SO-REJ-1" onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Order ini telah dibatalkan.')).toBeInTheDocument();
    });
  });
});
