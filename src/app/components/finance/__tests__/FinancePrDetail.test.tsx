import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancePrDetail } from '../FinancePrDetail';
import * as appContext from '../../context/AppContext';
import { purchasingApi } from '../../../services/purchasingApi';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    listPurchaseRequests: vi.fn(),
    reviewPurchaseRequestFinanceApproval: vi.fn().mockResolvedValue({})
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
    let financeDecision = 'Pending';
    (purchasingApi.listPurchaseRequests as any).mockImplementation(async () => [
      {
        id: 'backend-pr-1',
        prNumber: 'PR-FINANCE-1',
        projectName: 'Production',
        requesterName: 'Req1',
        requestDate: '2026-07-08',
        status: 'SupervisorApproved',
        activeApprovalCycleNumber: 1,
        financeApproval: { role: 'Finance', decision: financeDecision, actorUserId: null, decidedAtUtc: null, rejectionReason: null },
        ownerApproval: { role: 'Owner', decision: 'Pending', actorUserId: null, decidedAtUtc: null, rejectionReason: null },
        isFullyApproved: false,
        isApprovalBlocked: financeDecision === 'Rejected',
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

    vi.mocked(purchasingApi.reviewPurchaseRequestFinanceApproval).mockImplementation(async (_id, body) => {
      financeDecision = body.decision;
      return {} as any;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/erp/finance/pr/PR-FINANCE-1']}>
        <Routes>
          <Route path="/erp/finance/pr/:id" element={<FinancePrDetail />} />
        </Routes>
      </MemoryRouter>
      </QueryClientProvider>
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
    expect(screen.getByRole('button', { name: /Konfirmasi Tolak/i })).toBeDisabled();

    // 3. Fill reason
    fireEvent.change(reasonInput, { target: { value: 'Melebihi budget' } });

    // 4. Click "Konfirmasi Tolak"
    const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Tolak/i });
    fireEvent.click(confirmBtn);

    // 5. Verify API call
    await waitFor(() => {
      expect(purchasingApi.reviewPurchaseRequestFinanceApproval).toHaveBeenCalledWith('backend-pr-1', {
        decision: 'Rejected',
        rejectionReason: 'Melebihi budget'
      });
    });
    expect(screen.getByText(/Owner Pending/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Setujui Anggaran/i })).not.toBeInTheDocument());
  });

  it('approves the Finance decision without a reviewer identity', async () => {
    (purchasingApi.listPurchaseRequests as any).mockResolvedValue([{
      id: 'backend-pr-2', prNumber: 'PR-FINANCE-2', projectName: 'Production', requesterName: 'Req2', requestDate: '2026-07-08', status: 'SupervisorApproved',
      activeApprovalCycleNumber: 1,
      financeApproval: { role: 'Finance', decision: 'Pending' },
      ownerApproval: { role: 'Owner', decision: 'Pending' },
      isFullyApproved: false, isApprovalBlocked: false,
      items: [{ id: 'item-2', itemName: 'Item 2', qty: 1, estimatedPrice: 500000, supplierName: 'Supplier A' }]
    }]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/erp/finance/pr/PR-FINANCE-2']}><Routes><Route path="/erp/finance/pr/:id" element={<FinancePrDetail />} /></Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByText('PR-FINANCE-2');
    fireEvent.click(screen.getByRole('button', { name: /Setujui Anggaran/i }));
    await waitFor(() => expect(purchasingApi.reviewPurchaseRequestFinanceApproval).toHaveBeenCalledWith('backend-pr-2', { decision: 'Approved' }));
    expect(JSON.stringify(vi.mocked(purchasingApi.reviewPurchaseRequestFinanceApproval).mock.calls[0][1])).not.toMatch(/actorUserId|reviewedByUserId/);
  });
});
