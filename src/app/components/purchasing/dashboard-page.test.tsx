import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { usePurchasingData } from './usePurchasingData';
import { BrowserRouter } from 'react-router';

vi.mock('./usePurchasingData', () => ({
  usePurchasingData: vi.fn(),
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

    expect(screen.getByText('Procurement Overview')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
  });

  it('renders low stock alert when material requirement is below stock', () => {
    vi.mocked(usePurchasingData).mockReturnValue({
      materialRequirements: [
        { id: '1', stockOnHand: 10, requiredQty: 50 }, // low stock
        { id: '2', stockOnHand: 100, requiredQty: 20 }, // sufficient
      ],
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

    expect(screen.getByText(/1 material/)).toBeInTheDocument();
    expect(screen.getByText(/berada di bawah stok minimum/)).toBeInTheDocument();
  });
});
