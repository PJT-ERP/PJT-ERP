import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as appContext from '../../../components/context/AppContext';
import * as queryHooks from '../../../services/queries';
import { productionApi } from '../../../services/productionApi';
import { purchasingApi } from '../../../services/purchasingApi';
import { OwnerPurchaseRequestApprovals } from '../../../components/purchasing/components/OwnerPurchaseRequestApprovals';
import { DashboardPage } from '../../../components/purchasing/dashboard-page';
import { usePurchasingData } from '../../../components/purchasing/usePurchasingData';
import { OwnerApprovalPage } from '../approvals';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    listPurchaseRequests: vi.fn(),
    reviewPurchaseRequestOwnerApproval: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('../../../services/productionApi', () => ({
  productionApi: { getApprovalQueues: vi.fn().mockResolvedValue({ waitingClientApproval: [], log: [] }) },
}));
vi.mock('../../../components/purchasing/usePurchasingData', () => ({ usePurchasingData: vi.fn() }));
vi.mock('../../../components/shared/MentionsReminderWidget', () => ({ MentionsReminderWidget: () => null }));
vi.mock('react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const pendingRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'pr-id',
  prNumber: 'PR-1',
  requestDate: '2026-08-01',
  requestedByUserId: 'requester',
  requesterName: 'Requester',
  status: 'SupervisorApproved',
  updatedAtUtc: '',
  items: [{ id: 'item-1', itemName: 'Steel', qty: 3, size: 'M10', urgency: 'Normal', purchaseCategory: 'Project', supplierName: 'Supplier A', unitPrice: 25, totalPrice: 75, purchaseStatus: 'Requested' }],
  activeApprovalCycleNumber: 2,
  financeApproval: { role: 'Finance', decision: 'Pending', actorUserId: null, decidedAtUtc: null, rejectionReason: null },
  ownerApproval: { role: 'Owner', decision: 'Pending', actorUserId: null, decidedAtUtc: null, rejectionReason: null },
  isFullyApproved: false,
  isApprovalBlocked: false,
  ...overrides,
}) as any;

const renderOwnerApprovals = (role: string = 'Owner') => {
  vi.spyOn(appContext, 'useApp').mockReturnValue({ currentUser: { id: 'owner-user', name: role, role } } as any);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><OwnerPurchaseRequestApprovals /></QueryClientProvider>);
};

describe('Owner Purchase Request approvals in Purchasing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queryHooks, 'useCustomersQuery').mockReturnValue({ data: [] } as any);
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([pendingRequest()]);
  });

  it('shows parallel Finance/Owner status and lets Owner approve independently', async () => {
    let ownerDecision = 'Pending';
    vi.mocked(purchasingApi.listPurchaseRequests).mockImplementation(async () => [pendingRequest({ ownerApproval: { role: 'Owner', decision: ownerDecision } })]);
    vi.mocked(purchasingApi.reviewPurchaseRequestOwnerApproval).mockImplementation(async (_id, request) => {
      ownerDecision = request.decision;
      return {} as any;
    });
    const { container } = renderOwnerApprovals();

    await screen.findByText('PR-1');
    for (const column of ['Tgl Pengajuan', 'Supplier', 'Nama Item', 'Qty', 'Harga/pcs', 'Nominal', 'KET', 'SO', 'PO', 'Yang Mengajukan', 'Finance', 'Owner', 'Aksi']) {
      expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
    }
    expect(screen.queryByRole('columnheader', { name: 'Cycle' })).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Pending');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(purchasingApi.reviewPurchaseRequestOwnerApproval).toHaveBeenCalledWith('pr-id', { decision: 'Approved' }));
    expect(JSON.stringify(vi.mocked(purchasingApi.reviewPurchaseRequestOwnerApproval).mock.calls[0][1])).not.toMatch(/actorUserId|reviewedByUserId/);
    await waitFor(() => expect(screen.getByText('Keputusan tersimpan')).toBeInTheDocument());
  });

  it('requires a reason before submitting Owner rejection', async () => {
    renderOwnerApprovals();
    await screen.findByText('PR-1');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const submit = screen.getByRole('button', { name: 'Konfirmasi Tolak' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Alasan penolakan/), { target: { value: 'Perlu koreksi' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(purchasingApi.reviewPurchaseRequestOwnerApproval).toHaveBeenCalledWith('pr-id', { decision: 'Rejected', rejectionReason: 'Perlu koreksi' }));
  });

  it('hides Owner actions after the decision and when both roles fully approve', async () => {
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([pendingRequest({
      financeApproval: { role: 'Finance', decision: 'Approved' },
      ownerApproval: { role: 'Owner', decision: 'Approved' },
      isFullyApproved: true,
    })]);
    renderOwnerApprovals();
    await screen.findByText('PR-1');
    expect(screen.getByText('Fully approved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('hides Owner actions after Owner approval while Finance is still pending', async () => {
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([pendingRequest({
      ownerApproval: { role: 'Owner', decision: 'Approved' },
      isFullyApproved: false,
    })]);
    renderOwnerApprovals();
    await screen.findByText('Approved');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('navigates Owner PR rows to Purchasing PR detail', async () => {
    renderOwnerApprovals();
    fireEvent.click(await screen.findByText('PR-1'));
    expect(navigateMock).toHaveBeenCalledWith('/erp/purchasing/requests/pr-id');
  });

  it('does not show Owner actions for a blocked cycle', async () => {
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([pendingRequest({
      financeApproval: { role: 'Finance', decision: 'Rejected' },
      isApprovalBlocked: true,
    })]);
    renderOwnerApprovals();
    await screen.findByText('PR-1');
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('preserves the Admin override and does not expose controls to Engineering Supervisor', async () => {
    const { unmount } = renderOwnerApprovals('Admin');
    await screen.findByRole('button', { name: 'Approve' });
    unmount();
    vi.clearAllMocks();
    renderOwnerApprovals('Engineering Supervisor');
    expect(screen.queryByText('Approval Purchase Request')).not.toBeInTheDocument();
    expect(purchasingApi.listPurchaseRequests).not.toHaveBeenCalled();
  });

  it('renders Owner approvals in the Manajemen Pembelian dashboard and keeps PO navigation', async () => {
    vi.spyOn(appContext, 'useApp').mockReturnValue({ currentUser: { id: 'owner-user', name: 'Owner', role: 'Owner' } } as any);
    vi.mocked(usePurchasingData).mockReturnValue({ purchaseRequests: [], isLoading: false, refresh: vi.fn() } as any);
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><DashboardPage /></QueryClientProvider>);

    expect(screen.getByRole('heading', { name: 'Dashboard Purchasing' })).toBeInTheDocument();
    expect(await screen.findByText('Tidak ada Purchase Request untuk ditampilkan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lihat Daftar PO' })).toBeInTheDocument();
  });

  it('keeps the Approval Desain page focused on SalesOrder/design review', async () => {
    vi.spyOn(appContext, 'useApp').mockReturnValue({ currentUser: { id: 'owner-user', name: 'Owner', role: 'Owner' } } as any);
    vi.mocked(productionApi.getApprovalQueues).mockResolvedValue({
      waitingClientApproval: [{ id: 'SO-DESIGN-1', deadline: '2026-12-01', customerId: 'C-1', description: 'Design review', quantity: 1, unit: 'pcs', status: 'Waiting Approval' }],
      log: [],
    } as any);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><OwnerApprovalPage /></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: 'Approval Desain' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Review Desain' })).toBeInTheDocument();
    expect(screen.queryByText('Approval Purchase Request')).not.toBeInTheDocument();
    expect(screen.queryByText('PR-1')).not.toBeInTheDocument();
  });
});
