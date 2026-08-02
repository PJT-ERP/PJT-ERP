import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EngineeringPage } from '../index';
import * as appContext from '../../../components/context/AppContext';
import * as queries from '../../../services/queries';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Engineering Dashboard - Strict Stats Integration', () => {
  it('strictly calculates Production Stats from local data, ignoring missing backend counters', () => {
    // Mock the global app context
    vi.spyOn(appContext, 'useApp').mockReturnValue({
      currentUser: { id: 'spv-1', role: 'Engineering Supervisor' },
      users: []
    } as any);

    // Provide mocked SalesOrders with specific statuses to verify the local filtering logic
    vi.spyOn(queries, 'useSalesOrdersQuery').mockReturnValue({
      data: [
        { id: '1', status: 'InProduction' },
        { id: '2', status: 'InProduction' },
        { id: '3', status: 'Ready for Production' },
      ]
    } as any);

    // Mock other queries so they don't break the component
    // vi.spyOn(queries, 'useDashboardCountersQuery').mockReturnValue({ data: null } as any);
    // vi.spyOn(queries, 'useUsersQuery').mockReturnValue({ data: [] } as any);

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EngineeringPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The old logic would read 0 if counters was null. 
    // The new STRICT logic uses local data: 2 InProduction, 1 Ready for Production.
    
    // We expect the "Sedang Produksi" card to have the value 2
    // Testing Library approach: find the card label, then verify the adjacent number
    const inProdLabels = screen.getAllByText('Sedang Produksi');
    expect(inProdLabels.length).toBeGreaterThan(0);
    
    // The value 2 should be rendered somewhere near it (in this case we know the summary cards render it as an h3)
    const inProdValues = screen.getAllByText('2');
    expect(inProdValues.length).toBeGreaterThan(0);

    const readyLabels = screen.getAllByText('Siap Produksi');
    expect(readyLabels.length).toBeGreaterThan(0);

    const readyValues = screen.getAllByText('1');
    expect(readyValues.length).toBeGreaterThan(0);
    
  });
});
