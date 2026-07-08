import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePurchaseOrderPage } from '../create-purchase-order-page';
import * as usePurchasingDataHook from '../usePurchasingData';
import { purchasingApi } from '../../../services/purchasingApi';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    previewNextPoNumber: vi.fn().mockResolvedValue('PO-2026-001'),
    processPurchaseRequestItem: vi.fn().mockResolvedValue({}),
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

  it('submits a PO from a PR without an SO (manual PR)', async () => {
    vi.spyOn(usePurchasingDataHook, 'usePurchasingData').mockReturnValue({
      inventoryItems: [],
      suppliers: [{ id: 'sup-1', name: 'PT Surya Baja' }],
      purchaseRequests: [
        {
          id: 'pr-manual',
          prNumber: 'PR-MANUAL',
          requestDate: '2026-07-08',
          requestedByUserId: 'u1',
          requesterName: 'Budi',
          status: 'Approved',
          projectName: 'Manual PR Test',
          salesOrderId: null,
          salesOrderNumber: null,
          items: [
            {
              id: 'item-1',
              itemName: 'Besi Beton',
              spec: '10mm',
              qty: 50,
              purchaseStatus: 'Pending',
              urgency: 'Normal',
              purchaseCategory: 'Consumable',
              estimatedPrice: 5000,
              supplierName: 'PT Surya Baja'
            }
          ],
        }
      ],
      refresh: vi.fn(),
      isLoading: false,
    } as any);

    render(<CreatePurchaseOrderPage />);
    
    const prSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(prSelect, { target: { value: 'pr-manual' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Besi Beton')).toBeInTheDocument();
    });

    // Fill expected arrival date
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '2026-07-20' } });

    // Select Term
    const termSelect = screen.getAllByRole('combobox')[2];
    fireEvent.change(termSelect, { target: { value: 'Net 30' } });

    // Fill shipping address
    const addressInput = screen.getByPlaceholderText(/Alamat pengiriman/i);
    fireEvent.change(addressInput, { target: { value: 'Gudang Pusat' } });

    const createBtn = screen.getByRole('button', { name: /Buat PO/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(purchasingApi.processPurchaseRequestItem).toHaveBeenCalledWith(
        'pr-manual',
        'item-1',
        expect.objectContaining({
          supplierName: 'PT Surya Baja',
          poNumber: 'PO-2026-001',
          purchaseCategory: 'Consumable'
        })
      );
    });
  });

  it('submits a PO from a PR with an SO', async () => {
    vi.spyOn(usePurchasingDataHook, 'usePurchasingData').mockReturnValue({
      inventoryItems: [],
      suppliers: [{ id: 'sup-1', name: 'PT Surya Baja' }],
      purchaseRequests: [
        {
          id: 'pr-so',
          prNumber: 'PR-SO',
          requestDate: '2026-07-08',
          requestedByUserId: 'u1',
          requesterName: 'Budi',
          status: 'Approved',
          projectName: 'SO-101 - Project Test',
          salesOrderId: 'b-so-1',
          salesOrderNumber: 'SO-101',
          items: [
            {
              id: 'item-1',
              itemName: 'Baja',
              spec: 'Grade A',
              qty: 100,
              purchaseStatus: 'Pending',
              urgency: 'Normal',
              purchaseCategory: 'Project',
              estimatedPrice: 10000,
              supplierName: 'PT Surya Baja'
            }
          ],
        }
      ],
      refresh: vi.fn(),
      isLoading: false,
    } as any);

    render(<CreatePurchaseOrderPage />);
    
    const prSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(prSelect, { target: { value: 'pr-so' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Baja')).toBeInTheDocument();
    });

    // Fill expected arrival date
    const dateInput = document.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '2026-07-20' } });

    // Select Term
    const termSelect = screen.getAllByRole('combobox')[2];
    fireEvent.change(termSelect, { target: { value: 'Cash' } });

    // Fill shipping address
    const addressInput = screen.getByPlaceholderText(/Alamat pengiriman/i);
    fireEvent.change(addressInput, { target: { value: 'Site Project' } });

    const createBtn = screen.getByRole('button', { name: /Buat PO/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(purchasingApi.processPurchaseRequestItem).toHaveBeenCalledWith(
        'pr-so',
        'item-1',
        expect.objectContaining({
          supplierName: 'PT Surya Baja',
          poNumber: 'PO-2026-001',
          purchaseCategory: 'Project'
        })
      );
    });
  });
});
