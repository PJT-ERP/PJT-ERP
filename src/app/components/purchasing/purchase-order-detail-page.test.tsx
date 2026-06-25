import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PurchaseOrderDetailPage } from './purchase-order-detail-page';
import { purchasingApi } from '../../services/purchasingApi';

vi.mock('../../services/purchasingApi', () => ({
  purchasingApi: {
    listPurchaseRequests: vi.fn(),
    receivePurchaseRequestItem: vi.fn(),
  }
}));

vi.mock('../../services/financeApi', () => ({
  financeApi: {
    listSupplierPayments: vi.fn().mockResolvedValue([]),
  }
}));

const mockRefreshBackendData = vi.fn();

vi.mock('../context/AppContext', () => ({
  useApp: vi.fn(() => ({ 
    currentUser: { role: 'Purchasing', name: 'Test User' },
    refreshBackendData: mockRefreshBackendData
  })),
}));

describe('PurchaseOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls receivePurchaseRequestItem API and refreshes data on Konfirmasi Terima', async () => {
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([
      {
        id: 'mr-1',
        prNumber: 'MR-1001',
        requestDate: '2026-06-10',
        status: 'FinanceApproved',
        financeReviewedAtUtc: '2026-06-10T12:00:00Z',
        items: [
          {
            id: 'item-1',
            itemName: 'Steel Pipe',
            qty: 10,
            purchaseStatus: 'Ordered',
            poNumber: 'PO-2001',
            supplierName: 'PT Steel',
            expectedArrivalDate: '2026-06-15',
            totalPrice: 5000000
          }
        ]
      }
    ] as any);

    render(
      <MemoryRouter initialEntries={['/erp/purchasing/orders/PO-2001']}>
        <Routes>
          <Route path="/erp/purchasing/orders/:id" element={<PurchaseOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the data to load and render the overview
    await screen.findByText('Detail Purchase Order');
    
    // Switch to Items tab
    const itemsTab = screen.getByRole('tab', { name: /Daftar Item/i });
    await userEvent.click(itemsTab);

    // Wait for the items tab content
    await screen.findByText('Steel Pipe');

    // Click the "Terima" button for the item
    // The accessible name is "Terima" (text content)
    let receiveButton: HTMLElement;
    await waitFor(async () => {
      receiveButton = screen.getByRole('button', { name: 'Terima' });
      expect(receiveButton).not.toBeDisabled();
    });
    await userEvent.click(receiveButton!);

    // Wait for the receive form to appear
    await waitFor(() => {
      expect(screen.getByText('Form Penerimaan Barang')).toBeInTheDocument();
    });

    // Submit the form (Konfirmasi Terima)
    const confirmButton = screen.getByRole('button', { name: /Konfirmasi Terima/i });
    fireEvent.click(confirmButton);

    // Assert that the API was called with the correct IDs
    await waitFor(() => {
      expect(purchasingApi.receivePurchaseRequestItem).toHaveBeenCalledWith(
        'mr-1',
        'item-1',
        expect.objectContaining({
          purchaseNotes: undefined
        })
      );
      // Assert that we also call refresh logic
      expect(mockRefreshBackendData).toHaveBeenCalled();
    });
  });
});
