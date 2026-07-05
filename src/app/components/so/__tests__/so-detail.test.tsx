import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { SODetail } from '../so-detail';
import { useApp } from '../../context/AppContext';
import { useFinanceData } from '../../finance/useFinanceData';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../finance/useFinanceData', () => ({ useFinanceData: vi.fn() }));

vi.mock('../../../services/financeApi', () => ({
  financeApi: { submitPaymentProof: vi.fn() },
}));

const registeredOrder = {
  id: 'SO-2026-002', backendId: 'guid-so-2', soNumber: 'SO-2026-002',
  customerId: 'CUST-001', customerName: 'PT Maju Jaya',
  partNumber: 'PART-001', description: 'Shaft Diameter 20mm', quantity: 10, unit: 'pcs',
  deadline: '2026-07-15', status: 'Ready for Production', createdBy: 'backend', createdAt: '2026-07-01',
  backendDesignStatus: 'Approved', designApprovedAt: '2026-07-02',
  items: [{ id: 'item-2', productName: 'Shaft Diameter 20mm', productPartNumber: 'PART-001', quantity: 10, unit: 'pcs', unitPrice: 150000, notes: '' }],
  estimatedAmount: 1500000,
  materials: [{ id: 'mat-1', name: 'S45C Round Bar D20', spec: 'MAT-001', specification: 'MAT-001', quantity: 10, unit: 'batang' }],
} as any;

const customOrder = {
  id: 'SO-2026-001', backendId: 'guid-so-1', soNumber: 'SO-2026-001',
  customerId: 'CUST-001', customerName: 'PT Maju Jaya', partNumber: '-',
  description: 'Custom Jig Assembly', quantity: 2, unit: 'set', deadline: '2026-07-20',
  status: 'Pending Design', createdBy: 'Sales Staff', createdAt: '2026-07-01',
  designReference: 'INTERNAL_DESIGN', backendDesignStatus: 'PendingDesign',
  items: [{ id: 'item-1', productName: 'Custom Jig Assembly', productPartNumber: '-', quantity: 2, unit: 'set', unitPrice: 0, notes: '' }],
  estimatedAmount: 0,
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useApp).mockReturnValue({
    salesOrders: [customOrder, registeredOrder],
    customers: [{ code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi', phone: '0812', email: 'budi@maju.com', address: 'Jakarta', contact: 'budi@maju.com' }],
    productCatalog: [{ id: 'prod-1', partNumber: 'PART-001', description: 'Shaft Diameter 20mm', materialSpec: 'S45C', unit: 'pcs', bomItems: [] }],
    currentUser: { id: 'u1', role: 'Sales', name: 'Sales Staff' },
    users: [], purchasingRequests: [],
    updateSalesOrder: vi.fn(), updateCustomer: vi.fn(), refreshBackendData: vi.fn(),
  } as any);
  vi.mocked(useFinanceData).mockReturnValue({ invoices: [], payments: [], refresh: vi.fn(), isLoading: false } as any);
});

describe('SODetail Component', () => {
  const onNavigate = vi.fn();

  it('renders invoice section', async () => {
    render(<MemoryRouter><SODetail orderId="SO-2026-002" onNavigate={onNavigate} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Informasi Invoice')).toBeInTheDocument());
  });

  it('shows Workflow Pipeline for both custom and registered orders', async () => {
    render(<MemoryRouter><SODetail orderId="SO-2026-001" onNavigate={onNavigate} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Workflow Pipeline')).toBeInTheDocument());
  });

  it('shows design source info for custom/internal design SO', async () => {
    render(<MemoryRouter><SODetail orderId="SO-2026-001" onNavigate={onNavigate} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Butuh Desain Engineering Internal')).toBeInTheDocument());
  });

  it('shows BOM section for registered product', async () => {
    render(<MemoryRouter><SODetail orderId="SO-2026-002" onNavigate={onNavigate} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Bill of Materials (Kebutuhan Bahan)')).toBeInTheDocument());
  });
});
