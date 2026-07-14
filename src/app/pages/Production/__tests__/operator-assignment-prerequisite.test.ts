import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the operator assignment prerequisite logic from
 * Production/index.tsx.
 *
 * Replicates:
 *   - getMaterialRequestState()
 *   - mrReadyForAssignment (mrState === 'completed')
 *   - canAssignToOperator = hasBom && hasMr && mrReadyForAssignment
 */

type MrState = 'none' | 'requested' | 'finance_pending' | 'approved' | 'completed' | 'rejected';

interface PurchaseRequest {
  id: string;
  backendId?: string;
  backendStatus?: string;
  status?: string;
  requestedBy?: string;
  requesterName?: string;
  salesOrderId?: string;
  soId?: string;
}

function getMaterialRequestState(
  request: PurchaseRequest | undefined,
  hasLocalMr: boolean,
  isSupervisor: boolean,
): MrState {
  if (!request) {
    if (hasLocalMr) {
      return isSupervisor ? 'finance_pending' : 'requested';
    }
    return 'none';
  }

  if (
    request.backendStatus === 'SupervisorRejected' ||
    request.backendStatus === 'FinanceRejected' ||
    request.backendStatus === 'Rejected'
  ) return 'rejected';

  if (request.backendStatus === 'Completed' || request.status === 'Selesai') return 'completed';

  if (
    request.backendStatus === 'Processing' ||
    request.backendStatus === 'FinanceApproved' ||
    request.status === 'Diproses'
  ) return 'approved';

  if (request.backendStatus === 'SupervisorApproved') return 'finance_pending';

  if (request.status === 'Ditolak') return 'rejected';

  const reqBy = request.requestedBy || request.requesterName || '';
  const isSpvMade =
    reqBy.toLowerCase().includes('supervisor') ||
    reqBy.toLowerCase().includes('spv') ||
    reqBy === 'Admin' ||
    reqBy === 'Owner' ||
    isSupervisor;

  if (isSpvMade) return 'finance_pending';

  return 'requested';
}

function canAssignOperator(mrState: MrState, hasBom: boolean): boolean {
  const hasMr = mrState !== 'none';
  const mrReady = mrState === 'completed';
  return hasBom && hasMr && mrReady;
}

// ─────────────────────────────────────────────────────────
//  MR State detection
// ─────────────────────────────────────────────────────────

describe('getMaterialRequestState', () => {
  it('returns "none" when no MR exists and no local MR', () => {
    expect(getMaterialRequestState(undefined, false, true)).toBe('none');
  });

  it('returns "finance_pending" for supervisor when local MR exists but no backend request', () => {
    expect(getMaterialRequestState(undefined, true, true)).toBe('finance_pending');
  });

  it('returns "requested" for non-supervisor when local MR exists but no backend request', () => {
    expect(getMaterialRequestState(undefined, true, false)).toBe('requested');
  });

  it('returns "rejected" when backendStatus is SupervisorRejected', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'SupervisorRejected' };
    expect(getMaterialRequestState(req, false, false)).toBe('rejected');
  });

  it('returns "rejected" when backendStatus is FinanceRejected', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'FinanceRejected' };
    expect(getMaterialRequestState(req, false, false)).toBe('rejected');
  });

  it('returns "completed" when backendStatus is Completed', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'Completed' };
    expect(getMaterialRequestState(req, false, false)).toBe('completed');
  });

  it('returns "completed" when local status is Selesai', () => {
    const req: PurchaseRequest = { id: '1', status: 'Selesai' };
    expect(getMaterialRequestState(req, false, false)).toBe('completed');
  });

  it('returns "approved" when backendStatus is Processing', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'Processing' };
    expect(getMaterialRequestState(req, false, false)).toBe('approved');
  });

  it('returns "approved" when backendStatus is FinanceApproved', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'FinanceApproved' };
    expect(getMaterialRequestState(req, false, false)).toBe('approved');
  });

  it('returns "finance_pending" when backendStatus is SupervisorApproved', () => {
    const req: PurchaseRequest = { id: '1', backendStatus: 'SupervisorApproved' };
    expect(getMaterialRequestState(req, false, false)).toBe('finance_pending');
  });

  it('returns "finance_pending" for supervisor-made request by requesterName', () => {
    const req: PurchaseRequest = { id: '1', requesterName: 'Engineering Supervisor' };
    expect(getMaterialRequestState(req, false, true)).toBe('finance_pending');
  });

  it('returns "finance_pending" for admin-made request', () => {
    const req: PurchaseRequest = { id: '1', requestedBy: 'Admin' };
    expect(getMaterialRequestState(req, false, false)).toBe('finance_pending');
  });

  it('returns "requested" for non-spv non-backend request', () => {
    const req: PurchaseRequest = { id: '1', requestedBy: 'Engineering Worker' };
    expect(getMaterialRequestState(req, false, false)).toBe('requested');
  });

  it('returns "rejected" when local status is Ditolak', () => {
    const req: PurchaseRequest = { id: '1', status: 'Ditolak' };
    expect(getMaterialRequestState(req, false, false)).toBe('rejected');
  });
});

// ─────────────────────────────────────────────────────────
//  Operator assignment prerequisite
// ─────────────────────────────────────────────────────────

describe('canAssignOperator (Tugaskan Operator)', () => {
  it('allows assignment when BOM exists, MR completed', () => {
    expect(canAssignOperator('completed', true)).toBe(true);
  });

  it('blocks when no BOM, even with completed MR', () => {
    expect(canAssignOperator('completed', false)).toBe(false);
  });

  it('blocks when no MR (none)', () => {
    expect(canAssignOperator('none', true)).toBe(false);
  });

  it('blocks when MR is only requested (not yet reviewed)', () => {
    expect(canAssignOperator('requested', true)).toBe(false);
  });

  it('blocks when MR is finance_pending (waiting for Purchasing)', () => {
    expect(canAssignOperator('finance_pending', true)).toBe(false);
  });

  it('blocks when MR is approved (PO/Finance done but not received)', () => {
    expect(canAssignOperator('approved', true)).toBe(false);
  });

  it('blocks when MR is rejected', () => {
    expect(canAssignOperator('rejected', true)).toBe(false);
  });

  it('blocks when no BOM and no MR', () => {
    expect(canAssignOperator('none', false)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  Full flow: from creation to operator assignment
// ─────────────────────────────────────────────────────────

describe('MR full lifecycle → operator assignment', () => {
  it('new supervisor PR (auto-approved) → finance_pending → NOT assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'SupervisorApproved',
      requesterName: 'Engineering Supervisor',
    };
    const mrState = getMaterialRequestState(req, false, true);
    expect(mrState).toBe('finance_pending');
    expect(canAssignOperator(mrState, true)).toBe(false);
  });

  it('purchasing saves pricing (SupervisorApproved + isReadyForFinance) → NOT assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'SupervisorApproved',
      requesterName: 'Engineering Supervisor',
    };
    const mrState = getMaterialRequestState(req, false, true);
    expect(mrState).toBe('finance_pending');
    expect(canAssignOperator(mrState, true)).toBe(false);
  });

  it('purchasing creates PO → Processing → approved → NOT assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'Processing',
    };
    const mrState = getMaterialRequestState(req, false, false);
    expect(mrState).toBe('approved');
    expect(canAssignOperator(mrState, true)).toBe(false);
  });

  it('Finance approves → FinanceApproved → approved → NOT assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'FinanceApproved',
    };
    const mrState = getMaterialRequestState(req, false, false);
    expect(mrState).toBe('approved');
    expect(canAssignOperator(mrState, true)).toBe(false);
  });

  it('items received → Completed → completed → assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'Completed',
    };
    const mrState = getMaterialRequestState(req, false, false);
    expect(mrState).toBe('completed');
    expect(canAssignOperator(mrState, true)).toBe(true);
  });

  it('rejected PR → rejected → NOT assignable', () => {
    const req: PurchaseRequest = {
      id: '1',
      backendStatus: 'SupervisorRejected',
    };
    const mrState = getMaterialRequestState(req, false, false);
    expect(mrState).toBe('rejected');
    expect(canAssignOperator(mrState, true)).toBe(false);
  });
});
