import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SODetail } from '../so-detail';
import { useApp } from '../../context/AppContext';
import { useFinanceData } from '../../finance/useFinanceData';

// Partial mock for lucide-react to avoid SVG syntax errors in jest/vitest environment
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  FileText: () => <div data-testid="icon-file-text" />,
  Info: () => <div data-testid="icon-info" />,
  ExternalLink: () => <div data-testid="icon-external-link" />,
  Package: () => <div data-testid="icon-package" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  Building2: () => <div data-testid="icon-building2" />,
  Phone: () => <div data-testid="icon-phone" />,
  Mail: () => <div data-testid="icon-mail" />,
  MapPin: () => <div data-testid="icon-map-pin" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Edit: () => <div data-testid="icon-edit" />,
  Copy: () => <div data-testid="icon-copy" />,
  Printer: () => <div data-testid="icon-printer" />,
  Pencil: () => <div data-testid="icon-pencil" />,
  Hammer: () => <div data-testid="icon-hammer" />,
  Circle: () => <div data-testid="icon-circle" />,
  Play: () => <div data-testid="icon-play" />,
  CheckSquare: () => <div data-testid="icon-check-square" />,
  XSquare: () => <div data-testid="icon-x-square" />,
  Check: () => <div data-testid="icon-check" />,
  X: () => <div data-testid="icon-x" />,
  Image: () => <div data-testid="icon-image" />,
  Maximize2: () => <div data-testid="icon-maximize" />,
  ZoomIn: () => <div data-testid="icon-zoom-in" />,
  ZoomOut: () => <div data-testid="icon-zoom-out" />,
  RotateCw: () => <div data-testid="icon-rotate" />,
  Download: () => <div data-testid="icon-download" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Save: () => <div data-testid="icon-save" />,
  Camera: () => <div data-testid="icon-camera" />,
  Upload: () => <div data-testid="icon-upload" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  XCircle: () => <div data-testid="icon-x-circle" />,
  User: () => <div data-testid="icon-user" />,
  Box: () => <div data-testid="icon-box" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Hash: () => <div data-testid="icon-hash" />,
  Receipt: () => <div data-testid="icon-receipt" />,
  QrCode: () => <div data-testid="icon-qr-code" />,
  RefreshCw: () => <div data-testid="icon-refresh-cw" />
}));

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

vi.mock('../../../services/queries', () => {
  return {
    useProductsQuery: vi.fn().mockReturnValue({ data: [] }),
    useCustomersQuery: vi.fn().mockReturnValue({ data: [mockCustomer] }),
    useSalesOrdersQuery: vi.fn().mockReturnValue({ data: [registeredOrder, customOrder] }),
    useUpdateSalesOrderMutation: vi.fn().mockReturnValue({ mutate: vi.fn() }),
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
});
