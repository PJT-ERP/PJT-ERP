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
    expect(await screen.findByDisplayValue('Aluminium (100x50)')).toBeInTheDocument();
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
    expect(await screen.findByDisplayValue('Besi (5mm)')).toBeInTheDocument();

    // It should render the specification
    expect(screen.getByDisplayValue('5mm')).toBeInTheDocument();

    // Missing qty is 3 (5 - 2), so quantity input should be 3
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    // It should show the normal warning message for single spec
    expect(screen.getByText(/material tidak mencukupi untuk memulai produksi/)).toBeInTheDocument();
  });

  it('loads inherited BOM materials from a converted Sales Order when opened without location.state', async () => {
    const { useLocation } = await import('react-router');
    const { useSalesOrdersQuery } = await import('../../services/queries');
    const { masterDataApi } = await import('../../services/masterDataApi');

    (masterDataApi as any).getBomStock = vi.fn().mockResolvedValue([]);

    vi.mocked(useLocation).mockReturnValue({
      state: null,
      key: '', pathname: '', search: '', hash: '',
    });

    const convertedSo = {
      id: 'SO-123',
      soNumber: 'SO-123',
      description: 'Converted Custom Part',
      items: [{ id: 'so-item-1', productId: 'custom-prod-1', productName: 'test2', quantity: 2 }],
      materials: [
        {
          id: 'quo-bom-1',
          code: 'MAT-001',
          name: 'Bor 2mm',
          spec: 'HSS M2',
          specification: 'HSS M2',
          quantity: 20,
          unit: 'PCS',
          isCustomerMaterial: false,
        },
      ],
      bomsPerItem: {
        'so-item-1': [
          {
            id: 'quo-bom-1',
            code: 'MAT-001',
            name: 'Bor 2mm',
            spec: 'HSS M2',
            specification: 'HSS M2',
            quantity: 20,
            unit: 'PCS',
            isCustomerMaterial: false,
          },
        ],
      },
    };

    vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [convertedSo] } as any);
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [convertedSo],
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

    expect(await screen.findByDisplayValue('Bor 2mm (HSS M2)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HSS M2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });
});
