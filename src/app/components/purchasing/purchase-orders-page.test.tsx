import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import { PurchaseOrdersPage } from './purchase-orders-page';
import { purchasingApi } from '../../services/purchasingApi';

vi.mock('../../services/purchasingApi', () => ({
  purchasingApi: {
    listMaterialRequirements: vi.fn().mockResolvedValue([]),
    listPurchaseRequests: vi.fn(),
    receivePurchaseRequestItem: vi.fn(),
  }
}));

vi.mock('../../services/masterDataApi', () => ({
  masterDataApi: {
    listSuppliers: vi.fn().mockResolvedValue([]),
    listInventory: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../context/AppContext', () => ({
  useApp: vi.fn(() => ({ currentUser: { role: 'Purchasing', name: 'Test User' } })),
}));

vi.mock('../../services/financeApi', () => ({
  financeApi: {
    listSupplierPayments: vi.fn().mockResolvedValue([]),
  }
}));

describe('PurchaseOrdersPage', () => {
  it('renders purchase orders derived from MR API data', async () => {
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([
      {
        id: 'mr-1',
        prNumber: 'MR-1001',
        requestDate: '2026-06-10',
        status: 'Approved',
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
      <BrowserRouter>
        <PurchaseOrdersPage />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Daftar Pesanan ke Toko')).toBeInTheDocument();
      expect(screen.getByText('PO-2001')).toBeInTheDocument();
      expect(screen.getByText('PT Steel')).toBeInTheDocument();
    });
  });
});
