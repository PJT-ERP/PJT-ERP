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
  useCustomersQuery: vi.fn(() => ({ data: [], isLoading: false }))
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
});
