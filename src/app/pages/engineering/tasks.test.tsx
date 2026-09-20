import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { EngineeringTasksPage } from './tasks';
import { useApp } from "../../components/context/AppContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

  it('preserves assigned engineering user tasks when salesOrders query returns pre-mapped SalesOrders', async () => {
    const { useSalesOrdersQuery } = await import('../../services/queries');
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'QU-2026-003',
          backendId: 'b-003',
          status: 'Pending Design',
          designAssignedTo: 'u-eng',
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
      currentUser: { id: 'u-eng', name: 'Engineering User', role: 'Engineering' },
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
});
