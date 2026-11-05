import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { EngineeringTasksPage } from './tasks';
import { useApp } from "../../components/context/AppContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { salesApi } from '../../services/salesApi';

const quotationState = vi.hoisted(() => ({ value: null as any }));

vi.mock('../../components/context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../services/queries', () => ({
  useCustomersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useSalesOrdersQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../services/productionApi', () => ({
  productionApi: {
    getEngineeringQueues: vi.fn().mockResolvedValue({
      pendingDesign: [
        {
          id: 'q1',
          status: 'Pending Design',
          soNumber: 'Custom Mold A',
          backendDesignStatus: 'PendingDesign',
        }
      ],
      revisionRequired: [],
      waitingApproval: [],
      completed: []
    })
  }
}));

vi.mock('../../services/salesApi', () => ({
  salesApi: {
    listQuotations: vi.fn(async () => quotationState.value ? [structuredClone(quotationState.value)] : []),
    assignQuotationEngineer: vi.fn(async (_id: string, request: any) => {
      quotationState.value.assignedEngineerId = request.engineerId;
      quotationState.value.assignedEngineerName = request.engineerName;
      return quotationState.value;
    }),
    assignSalesOrderEngineers: vi.fn(),
  },
}));

describe('EngineeringTasksPage', () => {
  it('renders engineering queue with Input Desain button for pending tasks', async () => {
    vi.mocked(useApp).mockReturnValue({
      quotations: [],
      customers: [],
      users: [],
      salesOrders: [],
      currentUser: { role: 'Engineering Supervisor' },
      updateQuotation: vi.fn(),
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EngineeringTasksPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Daftar Tugas Desain')).toBeInTheDocument();
    
    // Wait for data to load, it will render Custom Mold A in both SO Number and Product columns
    const moldElements = await screen.findAllByText('Custom Mold A');
    expect(moldElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('Input Desain')).toBeInTheDocument();
  });

  it('shows quotation API failures instead of presenting them as an empty task queue', async () => {
    vi.mocked(useApp).mockReturnValue({
      quotations: [], customers: [], users: [], salesOrders: [],
      currentUser: { id: '22222222-2222-4222-8222-222222222222', name: 'Engineering User', role: 'Engineering' },
    } as any);
    vi.mocked(salesApi.listQuotations).mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Forbidden' } },
      message: 'Request failed with status code 403',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><EngineeringTasksPage /></MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.queryByText('Semua pesanan sudah selesai didesain.')).not.toBeInTheDocument();
  });

  it('preserves assigned quotation tasks when salesOrders query returns backend-mapped SalesOrders', async () => {
    const { useSalesOrdersQuery } = await import('../../services/queries');
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'QU-2026-003',
          backendId: 'b-003',
          isQuotation: true,
          status: 'Pending Design',
          designAssignedTo: '22222222-2222-4222-8222-222222222222',
          designAssignedName: 'Engineering User',
          description: 'NOT Shaft CNC 1 m',
          customerId: 'CUST-01'
        } as any
      ],
      isLoading: false
    } as any);

    vi.mocked(useApp).mockReturnValue({
      quotations: [],
      customers: [],
      users: [],
      salesOrders: [],
      currentUser: { id: '22222222-2222-4222-8222-222222222222', name: 'Engineering User', role: 'Engineering' },
      updateQuotation: vi.fn(),
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EngineeringTasksPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('QU-2026-003')).toBeInTheDocument();
    expect(screen.getByText('NOT Shaft CNC 1 m')).toBeInTheDocument();
  });

  it('does not show a quotation assigned to a different authenticated Engineer', async () => {
    const { useSalesOrdersQuery } = await import('../../services/queries');
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [{
        id: 'QU-2026-003',
        backendId: 'b-003',
        isQuotation: true,
        status: 'Pending Design',
        designAssignedTo: '22222222-2222-4222-8222-222222222222',
        designAssignedName: 'Engineer A',
        description: 'Assigned quotation',
      } as any],
      isLoading: false,
    } as any);
    vi.mocked(useApp).mockReturnValue({
      quotations: [], customers: [], users: [], salesOrders: [],
      currentUser: { id: '33333333-3333-4333-8333-333333333333', name: 'Engineer B', role: 'Engineering' },
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><EngineeringTasksPage /></MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Daftar Tugas Desain')).toBeInTheDocument();
    expect(screen.queryByText('QU-2026-003')).not.toBeInTheDocument();
  });

  it('assigns a quotation by its database GUID through the dedicated quotation endpoint and refreshes the assigned name', async () => {
    const quotationId = '11111111-1111-4111-8111-111111111111';
    const engineerId = '22222222-2222-4222-8222-222222222222';
    quotationState.value = {
      id: quotationId,
      quotationNumber: 'QU-2026-001',
      status: 'pending_design',
      designSource: 'Engineering',
      engineeringReviewRequired: true,
      assignedEngineerId: null,
      assignedEngineerName: null,
      items: [{ id: 'item-1', productName: 'Custom part', quantity: 1, unit: 'pcs' }],
      bomItems: [],
    };
    const { useSalesOrdersQuery } = await import('../../services/queries');
    vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(salesApi.assignQuotationEngineer).mockClear();
    vi.mocked(salesApi.assignSalesOrderEngineers).mockClear();
    vi.mocked(useApp).mockReturnValue({
      quotations: [], customers: [], salesOrders: [],
      users: [{ id: engineerId, name: 'Engineer A', role: 'Engineering', isActive: true }],
      currentUser: { id: '33333333-3333-4333-8333-333333333333', name: 'Supervisor', role: 'Engineering Supervisor' },
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><EngineeringTasksPage /></MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText('QU-2026-001');
    fireEvent.click(screen.getAllByRole('button', { name: 'Tugaskan' })[1]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Pilih Engineer Penanggung Jawab' }), { target: { value: engineerId } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Penugasan' }));

    await waitFor(() => expect(salesApi.assignQuotationEngineer).toHaveBeenCalledWith(quotationId, {
      engineerId,
      engineerName: 'Engineer A',
    }));
    expect(salesApi.assignSalesOrderEngineers).not.toHaveBeenCalled();
    expect(await screen.findByText('Engineer A')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tugaskan' })).toHaveLength(1);
  });
});
