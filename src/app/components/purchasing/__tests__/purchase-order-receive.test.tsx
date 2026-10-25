import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PurchaseOrderDetailPage } from '../purchase-order-detail-page';
import { purchasingApi } from '../../../services/purchasingApi';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    listMaterialRequirements: vi.fn().mockResolvedValue([]),
    listPurchaseRequests: vi.fn(),
    receivePurchaseRequestItem: vi.fn(),
  }
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: { listSuppliers: vi.fn().mockResolvedValue([]), listInventory: vi.fn().mockResolvedValue([]) }
}));

vi.mock('../../../services/financeApi', () => ({
  financeApi: { listSupplierPayments: vi.fn().mockResolvedValue([]) }
}));

const mockRefresh = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(() => ({ currentUser: { role: 'Purchasing', name: 'Test User' }, refreshBackendData: mockRefresh })),
}));

const baseItem = () => ({ id: 'item-1', itemName: 'Steel Pipe', qty: 10, purchaseStatus: 'Ordered', poNumber: 'PO-2001', supplierName: 'PT Steel', expectedArrivalDate: '2026-06-15', totalPrice: 5000000 });

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = (itemOverrides = {}) => {
  vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([{ id: 'mr-1', prNumber: 'MR-1001', requestDate: '2026-06-10', status: 'FinanceApproved', financeReviewedAtUtc: '2026-06-10T12:00:00Z', items: [{ ...baseItem(), ...itemOverrides }] }] as any);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/erp/purchasing/orders/PO-2001']}>
        <Routes><Route path="/erp/purchasing/orders/:id" element={<PurchaseOrderDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => { vi.clearAllMocks(); });

describe('PurchaseOrderDetailPage — Receive Item', () => {
  it('sends partial receive qty of 5 in RCV note', async () => {
    renderPage();
    await screen.findByText('Detail Purchase Order');
    await userEvent.click(screen.getByRole('tab', { name: /Daftar Item/i }));
    await screen.findAllByText('Steel Pipe');
    await waitFor(async () => { const btn = screen.getByRole('button', { name: 'Terima Sebagian' }); expect(btn).not.toBeDisabled(); await userEvent.click(btn); });
    await waitFor(() => expect(screen.getByText(/Form Penerimaan Barang/i)).toBeInTheDocument());

    const qtyInput = screen.getByRole('spinbutton');
    fireEvent.change(qtyInput, { target: { value: '5' } });
    fireEvent.submit(screen.getByRole('button', { name: /Konfirmasi Terima/i }).closest('form')!);

    await waitFor(() => {
      expect(purchasingApi.receivePurchaseRequestItem).toHaveBeenCalledWith('mr-1', 'item-1', expect.objectContaining({ purchaseNotes: "RCV:5" }));
    });
  });

  it('sends full receive qty of 10 when no changes made', async () => {
    renderPage();
    await screen.findByText('Detail Purchase Order');
    await userEvent.click(screen.getByRole('tab', { name: /Daftar Item/i }));
    await screen.findAllByText('Steel Pipe');
    await waitFor(async () => { const btn = screen.getByRole('button', { name: 'Terima Penuh' }); await userEvent.click(btn); });
    await waitFor(() => expect(screen.getByText(/Form Penerimaan Barang/i)).toBeInTheDocument());

    fireEvent.submit(screen.getByRole('button', { name: /Konfirmasi Terima/i }).closest('form')!);

    await waitFor(() => {
      expect(purchasingApi.receivePurchaseRequestItem).toHaveBeenCalledWith('mr-1', 'item-1', expect.objectContaining({ purchaseNotes: "RCV:10" }));
    });
  });

  it('refreshes data after successful receive', async () => {
    renderPage();
    await screen.findByText('Detail Purchase Order');
    await userEvent.click(screen.getByRole('tab', { name: /Daftar Item/i }));
    await screen.findAllByText('Steel Pipe');
    await waitFor(async () => { const btn = screen.getByRole('button', { name: 'Terima Penuh' }); await userEvent.click(btn); });
    await waitFor(() => expect(screen.getByText(/Form Penerimaan Barang/i)).toBeInTheDocument());
    fireEvent.submit(screen.getByRole('button', { name: /Konfirmasi Terima/i }).closest('form')!);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });
});
