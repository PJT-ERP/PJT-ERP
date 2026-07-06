import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOCreate } from '../so-create';
import { useApp } from '../../context/AppContext';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    getNextCustomerCode: vi.fn().mockResolvedValue({ code: 'CUST-001' }),
  },
}));

const mockNavigate = vi.fn();

describe('SOCreate — error states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      customers: [],
      productCatalog: [],
      salesOrders: [],
      currentUser: { id: 'u1', role: 'Sales', name: 'Sales' },
      users: [],
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn().mockResolvedValue(undefined),
      purchasingRequests: [],
    } as any);
  });

  it('renders empty state without crashing when no product catalog', () => {
    render(<SOCreate onNavigate={mockNavigate} />);
    expect(screen.getByText('Pesanan Baru (New Order)')).toBeInTheDocument();
    expect(screen.getByText('Repeat Order')).toBeInTheDocument();
  });

  it('shows Pesanan Baru form with submit button', async () => {
    render(<SOCreate onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));

    await waitFor(() => {
      const submitBtn = screen.getByText('Submit Sales Order');
      expect(submitBtn).toBeInTheDocument();
    });
  });

  it('shows Kode Pelanggan as Auto-generated', async () => {
    render(<SOCreate onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));

    await waitFor(() => {
      expect(screen.getByText('Kode Pelanggan (Auto)')).toBeInTheDocument();
    });
  });
});
