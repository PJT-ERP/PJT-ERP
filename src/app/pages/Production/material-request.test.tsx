import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { ProductionMaterialRequestPage } from './material-request';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApp } from "../../components/context/AppContext";

vi.mock('../../components/context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn().mockResolvedValue([]),
    createPurchaseRequest: vi.fn(),
  }
}));

vi.mock('../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn().mockReturnValue({ data: [{ id: 'SO-123', description: 'Test Order' }] }),
  usePurchasingRequestsQuery: vi.fn().mockReturnValue({ data: [] }),
}));

// Mock react-router so we can pass location state
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useLocation: vi.fn().mockReturnValue({
      state: {
        stockIssues: [
          { itemName: 'Aluminium', required: 10, available: 8 },
          { itemName: 'Baja', required: 5, available: 0 },
          { itemName: 'Kayu', required: 3, available: 5 } // surplus
        ]
      },
      key: '',
      pathname: '',
      search: '',
      hash: '',
    }),
    useParams: vi.fn().mockReturnValue({ id: 'SO-123' }),
    useNavigate: vi.fn(),
  };
});

describe('ProductionMaterialRequestPage', () => {
  it('calculates correct MR quantity when available stock is provided from location state', async () => {
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [
        { id: 'SO-123', description: 'Test Order' }
      ],
      purchasingRequests: [],
      currentUser: { role: 'Engineering Supervisor' },
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProductionMaterialRequestPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    // Aluminium: required 10, available 8 => missing 2
    expect(await screen.findByDisplayValue('2')).toBeInTheDocument();
    
    // Baja: required 5, available 0 => missing 5
    expect(await screen.findByDisplayValue('5')).toBeInTheDocument();
    
    // Kayu: required 3, available 5 => missing 0
    expect(await screen.findByDisplayValue('0')).toBeInTheDocument();
  });

  it('explodes stock issues into multiple rows based on specs and shows correct warning', async () => {
    const { useLocation } = await import('react-router');
    vi.mocked(useLocation).mockReturnValue({
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
      },
      key: '', pathname: '', search: '', hash: '',
    });

    vi.mocked(useApp).mockReturnValue({
      salesOrders: [{ id: 'SO-123', description: 'Test Order' }],
      purchasingRequests: [],
      currentUser: { role: 'Engineering Supervisor' },
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProductionMaterialRequestPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // It should render two rows for Aluminium, one for each spec
    expect(screen.getByDisplayValue('Aluminium (100x50)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Aluminium (200x300)')).toBeInTheDocument();

    // It should render the specifications
    expect(screen.getByDisplayValue('100x50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200x300')).toBeInTheDocument();

    // It should show the specific warning message for multiple specs
    expect(screen.getByText(/Terdapat beberapa spesifikasi berbeda untuk material yang kurang/)).toBeInTheDocument();
  });

  it('keeps single row if only one spec is provided', async () => {
    const { useLocation } = await import('react-router');
    vi.mocked(useLocation).mockReturnValue({
      state: {
        stockIssues: [
          {
            itemName: 'Besi',
            required: 5,
            available: 2,
            specs: [
              { spec: '5mm', quantity: 5 }
            ]
          }
        ]
      },
      key: '', pathname: '', search: '', hash: '',
    });

    vi.mocked(useApp).mockReturnValue({
      salesOrders: [{ id: 'SO-123', description: 'Test Order' }],
      purchasingRequests: [],
      currentUser: { role: 'Engineering' },
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProductionMaterialRequestPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // It should render one row for Besi with its spec in the dropdown
    expect(screen.getByDisplayValue('Besi (5mm)')).toBeInTheDocument();

    // It should render the specification
    expect(screen.getByDisplayValue('5mm')).toBeInTheDocument();

    // Missing qty is 3 (5 - 2), so quantity input should be 3
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    // It should show the normal warning message for single spec
    expect(screen.getByText(/material tidak mencukupi untuk memulai produksi/)).toBeInTheDocument();
  });
});
