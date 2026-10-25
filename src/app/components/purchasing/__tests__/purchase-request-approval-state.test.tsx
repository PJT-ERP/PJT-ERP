import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { mapPurchaseRequestToMr } from '../material-requests-page';
import { PurchaseRequestDto } from '../../../services/purchasingApi';
import { PrBudgetTab } from '../../finance/components/PurchasingApproval/PrBudgetTab';

const request = (finance: string, owner: string, blocked = false): PurchaseRequestDto => ({
  id: 'pr-id', prNumber: 'PR-1', requestDate: '2026-08-01', requestedByUserId: 'requester', requesterName: 'Requester', status: 'SupervisorApproved', updatedAtUtc: '', items: [],
  activeApprovalCycleNumber: 3,
  financeApproval: { role: 'Finance', decision: finance, actorUserId: 'finance-id', decidedAtUtc: '2026-08-02T00:00:00Z', rejectionReason: finance === 'Rejected' ? 'Finance reason' : null },
  ownerApproval: { role: 'Owner', decision: owner, actorUserId: 'owner-id', decidedAtUtc: '2026-08-03T00:00:00Z', rejectionReason: owner === 'Rejected' ? 'Owner reason' : null },
  isFullyApproved: finance === 'Approved' && owner === 'Approved',
  isApprovalBlocked: blocked,
});

describe('parallel Purchase Request approval mapping', () => {
  it.each([
    ['Pending', 'Pending', false, false],
    ['Approved', 'Pending', false, false],
    ['Pending', 'Approved', false, false],
    ['Approved', 'Approved', true, false],
    ['Rejected', 'Approved', false, true],
    ['Approved', 'Rejected', false, true],
  ])('preserves Finance %s and Owner %s independently', (finance, owner, fullyApproved, blocked) => {
    const mr = mapPurchaseRequestToMr(request(finance, owner, blocked));
    expect(mr.financeApproval).toBe(finance);
    expect(mr.ownerApproval).toBe(owner);
    expect(mr.isFullyApproved).toBe(fullyApproved);
    expect(mr.isApprovalBlocked).toBe(blocked);
    expect(mr.activeApprovalCycleNumber).toBe(3);
    expect(mr.financeApprovalActorUserId).toBe('finance-id');
    expect(mr.ownerApprovalActorUserId).toBe('owner-id');
  });

  it('renders Finance and Owner as separate columns in the PR/item table', () => {
    const mr = mapPurchaseRequestToMr({
      ...request('Approved', 'Pending'),
      prNumber: 'PR-TABLE',
      items: [{ id: 'item-1', itemName: 'Bolt', qty: 4, urgency: 'Normal', purchaseCategory: 'Project', supplierName: 'Supplier A', unitPrice: 25, totalPrice: 100, purchaseStatus: 'Pending' }],
    });
    render(<MemoryRouter><PrBudgetTab filteredMrs={[mr]} search="" setSearch={() => {}} /></MemoryRouter>);
    for (const column of ['Tgl Pengajuan', 'Supplier', 'Nama Item', 'Qty', 'Harga/pcs', 'Nominal', 'KET', 'SO', 'PO', 'Yang Mengajukan', 'Finance', 'Owner']) {
      expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
    }
    expect(screen.queryByRole('columnheader', { name: 'Aksi' })).not.toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Cycle 3')).toBeInTheDocument();
    expect(screen.queryByText('Fully approved')).not.toBeInTheDocument();
  });
});
