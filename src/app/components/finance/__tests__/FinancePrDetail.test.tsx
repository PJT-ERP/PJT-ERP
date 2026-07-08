import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancePrDetail } from '../FinancePrDetail';
import * as appContext from '../../context/AppContext';
import { purchasingApi } from '../../../services/purchasingApi';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    listPurchaseRequests: vi.fn(),
    reviewPurchaseRequest: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn().mockResolvedValue([])
  }
}));

describe('FinancePrDetail - Finance Rejection Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(appContext, 'useApp').mockReturnValue({
      currentUser: { id: 'finance1', name: 'Finance Admin', role: 'Finance' },
      refreshBackendData: vi.fn()
    } as any);
  });

  it('allows finance to reject a PR with a reason', async () => {
    (purchasingApi.listPurchaseRequests as any).mockResolvedValue([
      {
        id: 'backend-pr-1',
        prNumber: 'PR-FINANCE-1',
        projectName: 'Production',
        requesterName: 'Req1',
        requestDate: '2026-07-08',
        status: 'SupervisorApproved',
        items: [
          { 
            id: 'item-1', 
            itemName: 'Item 1', 
            quantity: 10, 
            unit: 'pcs', 
            estimatedPrice: 500000,
            supplierName: 'Supplier A'
          }
        ]
      }
    ]);

    render(
      <MemoryRouter initialEntries={['/erp/finance/pr/PR-FINANCE-1']}>
        <Routes>
          <Route path="/erp/finance/pr/:id" element={<FinancePrDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('PR-FINANCE-1')).toBeInTheDocument();
    });

    // 1. Click "Tolak Anggaran"
    const rejectBtn = screen.getByRole('button', { name: /Tolak Anggaran/i });
    fireEvent.click(rejectBtn);

    // 2. Reject reason modal opens
    expect(screen.getByText('Tolak Persetujuan Anggaran')).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/Contoh: Harga dari supplier X/i);

    // 3. Fill reason
    fireEvent.change(reasonInput, { target: { value: 'Melebihi budget' } });

    // 4. Click "Konfirmasi Tolak"
    const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Tolak/i });
    fireEvent.click(confirmBtn);

    // 5. Verify API call
    await waitFor(() => {
      expect(purchasingApi.reviewPurchaseRequest).toHaveBeenCalledWith('backend-pr-1', expect.objectContaining({
        reviewedByUserId: 'finance1',
        decision: 'Reject',
        reviewStage: 'Finance',
        rejectionReason: 'Melebihi budget'
      }));
    });
  });
});
