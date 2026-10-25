import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient';
import { purchasingApi } from './purchasingApi';

vi.mock('./apiClient', () => ({ default: { post: vi.fn() } }));

describe('Purchase Request approval API methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} } as any);
  });

  it('uses the Finance approval route and identity-free payload', async () => {
    await purchasingApi.reviewPurchaseRequestFinanceApproval('pr-1', { decision: 'Approved' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/purchasing/purchase-requests/pr-1/finance-approval', { decision: 'Approved' });
  });

  it('uses the Owner approval route and sends the rejection reason without actor identity', async () => {
    await purchasingApi.reviewPurchaseRequestOwnerApproval('pr-2', { decision: 'Rejected', rejectionReason: 'Outside policy' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/purchasing/purchase-requests/pr-2/owner-approval', { decision: 'Rejected', rejectionReason: 'Outside policy' });
  });
});
