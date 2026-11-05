import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { purchasingApi } from '../../../services/purchasingApi';
import { masterDataApi } from '../../../services/masterDataApi';
import { PRApprovalSection } from '../components/pr-detail/PRApprovalSection';
import { PRDetailItemsTable } from '../components/pr-detail/PRDetailItemsTable';
import { usePurchaseRequestDetail } from '../hooks/usePurchaseRequestDetail';

const { currentRole, routeId } = vi.hoisted(() => ({ currentRole: { value: 'Purchasing' }, routeId: { value: 'PR-003' } }));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useParams: () => ({ id: routeId.value }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser: { role: currentRole.value }, refreshBackendData: vi.fn() }),
}));

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    listPurchaseRequests: vi.fn(),
  },
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listSuppliers: vi.fn(),
    listInventory: vi.fn(),
  },
}));

describe('approved Purchase Request detail actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole.value = 'Purchasing';
    routeId.value = 'PR-003';
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([{
      id: 'request-003',
      prNumber: 'PR-003',
      requestDate: '2026-10-01',
      requestedByUserId: 'requester-id',
      requesterName: 'Requester',
      status: 'Approved',
      activeApprovalCycleNumber: 1,
      financeApproval: { role: 'Finance', decision: 'Approved' },
      ownerApproval: { role: 'Owner', decision: 'Approved' },
      isFullyApproved: true,
      isApprovalBlocked: false,
      updatedAtUtc: '2026-10-01T00:00:00Z',
      items: [{
        id: 'item-003',
        itemName: 'Steel',
        qty: 15,
        supplierName: 'PT Sumber Abadi',
        unitPrice: 2_000_000,
        estimatedPrice: 30_000_000,
        totalPrice: 30_000_000,
        purchaseStatus: 'Requested',
        urgency: 'Normal',
        purchaseCategory: 'Project',
      }],
    }] as any);
    vi.mocked(masterDataApi.listSuppliers).mockResolvedValue([] as any);
    vi.mocked(masterDataApi.listInventory).mockResolvedValue([] as any);
  });

  it('hides pricing approval request after both approvals and keeps the PO action', async () => {
    const { result } = renderHook(() => usePurchaseRequestDetail());
    await waitFor(() => expect(result.current.detail?.isFullyApproved).toBe(true));

    render(<PRApprovalSection board={result.current} />);

    expect(screen.queryByRole('button', { name: /Simpan Harga & Minta Approval/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat PO Sekarang/i })).toBeInTheDocument();
  });

  const renderEditableStateForRole = async (role: string) => {
    currentRole.value = role;
    routeId.value = 'PR-EDITABLE';
    vi.mocked(purchasingApi.listPurchaseRequests).mockResolvedValue([{
      id: 'request-editable',
      prNumber: 'PR-EDITABLE',
      requestDate: '2026-10-01',
      requestedByUserId: 'requester-id',
      requesterName: 'Requester',
      status: 'SupervisorRejected',
      updatedAtUtc: '2026-10-01T00:00:00Z',
      items: [{
        id: 'item-editable', itemName: 'Steel', qty: 15, supplierName: 'PT Sumber Abadi',
        unitPrice: 2_000_000, estimatedPrice: 30_000_000, totalPrice: 30_000_000,
        purchaseStatus: 'Requested', urgency: 'Normal', purchaseCategory: 'Project',
      }],
    }] as any);
    const { result } = renderHook(() => usePurchaseRequestDetail());
    await waitFor(() => expect(result.current.detail?.backendStatus).toBe('SupervisorRejected'));
    render(<><PRDetailItemsTable board={result.current} /><PRApprovalSection board={result.current} /></>);
  };

  it('does not expose pricing or revision controls to Owner', async () => {
    await renderEditableStateForRole('Owner');

    expect(screen.queryByPlaceholderText('Ketik untuk cari supplier...')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajukan Revisi ke SPV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simpan Revisi & Ajukan Ulang/i })).not.toBeInTheDocument();
    expect(screen.getByText('PT Sumber Abadi')).toBeInTheDocument();
  });

  it.each(['Purchasing', 'Admin'])('%s retains eligible pricing and revision controls', async role => {
    await renderEditableStateForRole(role);

    expect(screen.getByPlaceholderText('Ketik untuk cari supplier...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ajukan Revisi ke SPV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Revisi & Ajukan Ulang/i })).toBeInTheDocument();
  });
});
