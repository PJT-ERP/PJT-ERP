import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { usePurchasingData } from './usePurchasingData';
import { BrowserRouter } from 'react-router';

vi.mock('./usePurchasingData', () => ({
  usePurchasingData: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useApp: vi.fn(() => ({ currentUser: { role: 'Purchasing', name: 'Test User' } })),
}));

describe('Purchasing DashboardPage Component', () => {
  it('renders procurement overview and headers correctly', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      materialRequirements: [],
      purchaseRequests: [],
      isUsingBackend: true,
      isLoading: false,
      refresh: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard Purchasing')).toBeInTheDocument();
    expect(screen.getByText('Menunggu Tindakan Purchasing')).toBeInTheDocument();
  });

});
