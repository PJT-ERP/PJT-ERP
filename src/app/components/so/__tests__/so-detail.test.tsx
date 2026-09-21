import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SODetail } from '../so-detail';
import { useApp } from '../../context/AppContext';
import { useFinanceData } from '../../finance/useFinanceData';

afterEach(() => {
  cleanup();
});

// Partial mock for lucide-react to avoid SVG syntax errors in jest/vitest environment
// Mock lucide-react with explicit icon exports to prevent Vitest missing export errors
vi.mock('lucide-react', () => {
  const Icon = (props: any) => <div {...props} />;
  const iconNames = [
    'CheckCircle2', 'Clock', 'AlertCircle', 'FileText', 'Info', 'ExternalLink',
    'Package', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
    'Building2', 'Phone', 'Mail', 'MapPin', 'AlertTriangle', 'Edit', 'Copy',
    'Printer', 'Pencil', 'Hammer', 'Circle', 'Play', 'CheckSquare', 'XSquare',
    'Check', 'X', 'Image', 'Maximize2', 'ZoomIn', 'ZoomOut', 'RotateCw',
    'Download', 'Plus', 'Trash2', 'Save', 'Camera', 'Paperclip', 'MessageSquare',
    'Send', 'File', 'Upload', 'ArrowRight', 'CheckCircle', 'XCircle', 'User',
    'Box', 'Calendar', 'Hash', 'Receipt', 'QrCode', 'RefreshCw', 'Reply',
    'UserIcon', 'GripVertical', 'Link', 'DollarSign', 'Search', 'Eye',
    'UploadCloud', 'Banknote', 'List', 'History', 'Shield', 'ImageIcon',
    'Activity', 'PenTool', 'PlayCircle', 'PauseCircle', 'FileWarning',
    'ArrowLeft', 'ArrowRightLeft', 'ShoppingCart', 'UserPlus', 'Lock',
    'AppWindow', 'AlignLeft', 'Type', 'PanelBottom', 'Loader2'
  ];
  const mockExports: Record<string, any> = {};
  iconNames.forEach(name => {
    mockExports[name] = Icon;
  });
  return mockExports;
});

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../finance/useFinanceData', () => ({ useFinanceData: vi.fn() }));

vi.mock('../../../services/financeApi', () => ({
  financeApi: { submitPaymentProof: vi.fn() },
}));

const queryClient = new QueryClient();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const { registeredOrder, customOrder, mockCustomer } = vi.hoisted(() => {
  const registered = {
    id: 'SO-2026-002', backendId: 'guid-so-2', soNumber: 'SO-2026-002',
    customerId: 'CUST-001', customerName: 'PT Maju Jaya',
    partNumber: 'PART-001', description: 'Shaft Diameter 20mm', quantity: 10, unit: 'pcs',
    deadline: '2026-07-15', status: 'Ready for Production', createdBy: 'backend', createdAt: '2026-07-01',
    backendDesignStatus: 'Approved', designApprovedAt: '2026-07-02',
    items: [{ id: 'item-2', productName: 'Shaft Diameter 20mm', productPartNumber: 'PART-001', quantity: 10, unit: 'pcs', unitPrice: 150000, notes: '' }],
    estimatedAmount: 1500000,
    materials: [{ id: 'mat-1', name: 'S45C Round Bar D20', spec: 'MAT-001', specification: 'MAT-001', quantity: 10, unit: 'batang' }],
  } as any;

  const custom = {
    id: 'SO-2026-001', backendId: 'guid-so-1', soNumber: 'SO-2026-001',
    customerId: 'CUST-001', customerName: 'PT Maju Jaya', partNumber: '-',
    description: 'Custom Jig Assembly', quantity: 2, unit: 'set', deadline: '2026-07-20',
    status: 'Pending Design', createdBy: 'Sales Staff', createdAt: '2026-07-01',
    designReference: 'INTERNAL_DESIGN', backendDesignStatus: 'PendingDesign',
    items: [{ id: 'item-1', productName: 'Custom Jig Assembly', productPartNumber: '-', quantity: 2, unit: 'set', unitPrice: 0, notes: '' }],
    estimatedAmount: 0,
  } as any;

  const customer = {
    code: 'CUST-001',
    name: 'PT Maju Jaya',
    contact: 'Budi (08123456789)'
  };
  
  return { registeredOrder: registered, customOrder: custom, mockCustomer: customer };
});

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));
vi.mock('../../../services/queries', () => {
  return {
    useProductsQuery: vi.fn().mockReturnValue({ data: [] }),
    useCustomersQuery: vi.fn().mockReturnValue({ data: [mockCustomer] }),
    useUsersQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcInspectionsQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcQueuesQuery: vi.fn().mockReturnValue({ data: [] }),
    useSalesOrdersQuery: vi.fn().mockReturnValue({ data: [registeredOrder, customOrder] }),
    useUpdateSalesOrderMutation: vi.fn().mockReturnValue({ mutate: mockMutate }),
    useDeleteSalesOrderMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
    useUpdateCustomerMutation: vi.fn().mockReturnValue({ mutate: vi.fn() }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useApp).mockReturnValue({
    salesOrders: [customOrder, registeredOrder],
    customers: [mockCustomer],
    productCatalog: [{ id: 'prod-1', partNumber: 'PART-001', description: 'Shaft Diameter 20mm', materialSpec: 'S45C', unit: 'pcs', bomItems: [] }],
    currentUser: { id: 'u1', role: 'Sales', name: 'Sales Staff' },
    users: [], purchasingRequests: [],
    updateSalesOrder: vi.fn(), updateCustomer: vi.fn(), refreshBackendData: vi.fn(),
  } as any);
  vi.mocked(useFinanceData).mockReturnValue({ invoices: [], payments: [], refresh: vi.fn(), isLoading: false } as any);
});

describe('SODetail Component', () => {
  const onNavigate = vi.fn();

  it('renders basic details correctly', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-002" onNavigate={onNavigate} />);
    await waitFor(() => {
      const elements = screen.getAllByText('PT Maju Jaya');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('renders invoice section', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-002" onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Informasi Invoice')).toBeInTheDocument());
  });

  it('shows Workflow Pipeline for both custom and registered orders', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-001" onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Workflow Pipeline')).toBeInTheDocument());
  });

  it('shows design source info for custom/internal design SO', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-001" onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Butuh Desain Engineering Internal')).toBeInTheDocument());
  });

  it('shows BOM section for registered product', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-002" onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Bill of Materials (Kebutuhan Bahan)')).toBeInTheDocument());
  });

  it('can enter edit mode and save quantity changes', async () => {
    renderWithProviders(<SODetail orderId="SO-2026-001" onNavigate={onNavigate} />);
    
    // Ensure data is loaded
    await waitFor(() => expect(screen.getAllByText('PT Maju Jaya').length).toBeGreaterThan(0));

    // Enter edit mode
    const editBtn = screen.getByText('Edit');
    editBtn.click();

    // Change quantity from 10 to 16
    const qtyInput = await screen.findByRole('spinbutton');
    fireEvent.change(qtyInput, { target: { value: '16' } });

    // Click Simpan Perubahan
    const saveBtns = screen.getAllByText('Simpan Perubahan');
    fireEvent.click(saveBtns[0]);

    // Verify mutation was called with updated quantity
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'guid-so-1',
      data: expect.objectContaining({
        quantity: 16
      })
    }));
  });
});
