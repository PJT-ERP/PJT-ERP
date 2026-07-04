import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { SODetail } from '../so-detail';
import { useApp } from '../../context/AppContext';
import { useFinanceData } from '../../finance/useFinanceData';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../finance/useFinanceData', () => ({ useFinanceData: vi.fn() }));

describe('SODetail — error states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFinanceData).mockReturnValue({ invoices: [], payments: [], refresh: vi.fn(), isLoading: false } as any);
  });

  it('renders not-found message when order does not exist', async () => {
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [],
      customers: [],
      productCatalog: [],
      currentUser: null,
      users: [],
      purchasingRequests: [],
    } as any);

    render(<MemoryRouter><SODetail orderId="NONEXISTENT" onNavigate={vi.fn()} /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Sales Order tidak ditemukan')).toBeInTheDocument();
      expect(screen.getByText('Kembali ke Daftar SO')).toBeInTheDocument();
    });
  });

  it('renders rejected status banner for cancelled SO', async () => {
    vi.mocked(useApp).mockReturnValue({
      salesOrders: [{
        id: 'SO-REJ-1', customerId: 'CUST-1', customerName: 'PT X',
        description: 'Cancelled Order', quantity: 1, unit: 'pcs',
        deadline: '2026-01-01', status: 'Rejected', createdAt: '2026-01-01',
        items: [],
      }],
      customers: [{ code: 'CUST-1', name: 'PT X', contactPerson: 'A', email: 'a@x.com' }],
      productCatalog: [],
      currentUser: { role: 'Sales' },
      users: [],
      purchasingRequests: [],
      updateSalesOrder: vi.fn(),
      updateCustomer: vi.fn(),
      refreshBackendData: vi.fn(),
    } as any);

    render(<MemoryRouter><SODetail orderId="SO-REJ-1" onNavigate={vi.fn()} /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Sales Order ini telah dibatalkan.')).toBeInTheDocument();
    });
  });
});
