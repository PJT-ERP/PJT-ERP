import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePurchaseOrderPage } from '../create-purchase-order-page';
import * as usePurchasingDataHook from '../usePurchasingData';
import { purchasingApi } from '../../../services/purchasingApi';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    createPurchaseOrder: vi.fn().mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-001' }),
  }
}));

describe('CreatePurchaseOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps material size to specification (spec) when selecting a PR', async () => {
    // Mock the data hook to return a PR with an item containing a 'size'
    vi.spyOn(usePurchasingDataHook, 'usePurchasingData').mockReturnValue({
      inventoryItems: [],
      suppliers: [{ id: 'sup-1', name: 'PT Surya Baja' }],
      purchaseRequests: [
        {
          id: 'pr-1',
          prNumber: 'PR-2026-001',
          requestDate: '2026-07-08',
          requestedByUserId: 'u1',
          requesterName: 'Budi',
          status: 'Approved',
          items: [
            {
              id: 'item-1',
              itemName: 'Besi Beton',
              size: '12mm x 12m SNI', // This should map to spec
              qty: 100,
              purchaseStatus: 'Pending',
              urgency: 'Normal',
              purchaseCategory: 'Project',
              supplierName: 'PT Surya Baja'
            }
          ],
          updatedAtUtc: '2026-07-08T00:00:00Z',
        }
      ],
      refresh: vi.fn(),
      isLoading: false,
      isUsingBackend: false
    } as any);

    render(<CreatePurchaseOrderPage />);

    // Wait for the form to render
    await waitFor(() => expect(screen.getByText('Pilih PR disetujui Supervisor')).toBeInTheDocument());

    // Select the PR from the dropdown
    const prSelect = screen.getAllByRole('combobox')[0]; // The first select is the PR select
    fireEvent.change(prSelect, { target: { value: 'pr-1' } });

    // The specification should be populated in the input field for "Spesifikasi"
    await waitFor(() => {
      // Find the input containing the specification value
      const specInput = screen.getByDisplayValue('12mm x 12m SNI');
      expect(specInput).toBeInTheDocument();
    });
  });
});
