import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesApi } from '../../../services/salesApi';
import { financeApi } from '../../../services/financeApi';
import { productionApi } from '../../../services/productionApi';
import { qcApi } from '../../../services/qcApi';
import axios from 'axios';

// Mock axios completely
const { mockPost, mockPut, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockGet: vi.fn()
}));

vi.mock('axios', () => {
  return {
    default: {
      create: () => ({
        post: mockPost,
        put: mockPut,
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })
    }
  };
});

describe('Sales Order Lifecycle: Existing Product with New Design Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully traverse from SO creation to QC Completion by triggering the right APIs with correct statuses', async () => {
    
    // 1. CREATE SO (Sales requests new design for existing product, sets designId to customer)
    mockPost.mockResolvedValueOnce({
      data: { id: 'SO-100', status: 'Pending Design', backendDesignStatus: 'PendingDesign' }
    });

    const createPayload: any = {
      order: {
        soDate: '2026-07-21',
        targetDate: '2026-08-21',
        designStatus: 'PendingDesign',
        customerDrawingUrl: 'https://example.com/ref',
        designReference: null,
        items: [{
          existingProductId: 'prod-123',
          qty: 10,
          designId: 'customer'
        }]
      }
    };
    
    const soCreated = await salesApi.createCompleteSalesOrder(createPayload);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/production/sales-orders/complete', createPayload);
    expect(soCreated.status).toBe('Pending Design');

    // 2. ENGINEERING: Submit Design
    mockPost.mockResolvedValueOnce({
      data: { id: 'SO-100', status: 'Waiting Spv Approval' }
    });
    const engineered = await salesApi.submitSalesOrderDesign('SO-100', {
      designReference: 'https://cad.link',
      drawingFileUrl: 'https://cad.link',
      updatedByName: 'Engineer 1'
    });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-100/submit-design', expect.any(Object));

    // 3. SUPERVISOR: Approve Design
    mockPut.mockResolvedValueOnce({
      data: { id: 'SO-100', status: 'Waiting Pricing' }
    });
    const spvApproved = await salesApi.updateSalesOrderDesignStatus('SO-100', {
      designStatus: 'Approved',
      approvedByName: 'Spv 1'
    } as any);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-100/design-status', { designStatus: 'Approved', approvedByName: 'Spv 1' });

    // 4. PRODUCTION: Start Production
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-100', status: 'In Progress' }
    });
    const production = await productionApi.startProduction('SO-100', { workerUserId: 'usr-1', workerName: 'Prod Mgr' } as any);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-100/production/start', expect.any(Object));

    // 5. QC: Submit QC (Go)
    mockPut.mockResolvedValueOnce({
      data: { id: 'QC-100', decision: 'Go' }
    });
    const qcResult = await qcApi.uploadResult('SO-100', {
      decision: 'Go',
      notes: 'All good',
      reviewerName: 'QC Tester',
      reviewerUserId: 'qc-usr',
      productionPhotos: [],
      qcPhotos: []
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/qc/inspections/SO-100/result', expect.any(Object));
  });

  it('should successfully pause and resume production due to material shortage', async () => {
    // 1. Start Production
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-101', status: 'In Progress' }
    });
    await productionApi.startProduction('SO-101', { workerUserId: 'usr-1', workerName: 'Prod Mgr' } as any);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-101/production/start', expect.any(Object));

    // 2. Pause Production (Material Kurang)
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-101', status: 'Paused', reason: 'Material Kurang' }
    });
    const pauseResult = await productionApi.pauseProduction('SO-101', {
      workerUserId: 'usr-1',
      workerName: 'Prod Mgr',
      reason: 'Material Kurang'
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-101/production/pause', {
      workerUserId: 'usr-1',
      workerName: 'Prod Mgr',
      reason: 'Material Kurang'
    });
    expect((pauseResult as any).status).toBe('Paused');
    expect((pauseResult as any).reason).toBe('Material Kurang');

    // 3. Resume Production
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-101', status: 'In Progress' }
    });
    const resumeResult = await productionApi.resumeProduction('SO-101', {
      workerUserId: 'usr-1',
      workerName: 'Prod Mgr'
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-101/production/resume', {
      workerUserId: 'usr-1',
      workerName: 'Prod Mgr'
    });
    expect((resumeResult as any).status).toBe('In Progress');
  });

  it('should handle QC NoGo, triggering rework until a final Go is achieved', async () => {
    // 1. Finish Production
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-102', status: 'QC Ready' }
    });
    await productionApi.finishProduction('SO-102', { workerUserId: 'usr-1', workerName: 'Prod Mgr' } as any);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-102/production/finish', expect.any(Object));

    // 2. QC NoGo
    mockPut.mockResolvedValueOnce({
      data: { id: 'QC-102', decision: 'NoGo', notes: 'Defect found' }
    });
    const qcNoGo = await qcApi.uploadResult('SO-102', {
      decision: 'NoGo',
      notes: 'Defect found',
      reviewerName: 'QC Tester',
      reviewerUserId: 'qc-usr',
      productionPhotos: [],
      qcPhotos: []
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/qc/inspections/SO-102/result', expect.objectContaining({ decision: 'NoGo' }));
    expect(qcNoGo.decision).toBe('NoGo');

    // 3. Resume Production for Rework
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-102', status: 'In Progress (Rework)' }
    });
    await productionApi.resumeProduction('SO-102', {
      workerUserId: 'usr-1',
      workerName: 'Prod Mgr'
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/production/sales-orders/SO-102/production/resume', expect.any(Object));

    // 4. Finish Rework
    mockPut.mockResolvedValueOnce({
      data: { id: 'PROD-102', status: 'QC Ready' }
    });
    await productionApi.finishProduction('SO-102', { workerUserId: 'usr-1', workerName: 'Prod Mgr' } as any);

    // 5. QC Go (Finally approved)
    mockPut.mockResolvedValueOnce({
      data: { id: 'QC-102', decision: 'Go' }
    });
    const qcGo = await qcApi.uploadResult('SO-102', {
      decision: 'Go',
      notes: 'Fixed defect',
      reviewerName: 'QC Tester',
      reviewerUserId: 'qc-usr',
      productionPhotos: [],
      qcPhotos: []
    });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/qc/inspections/SO-102/result', expect.objectContaining({ decision: 'Go' }));
    expect(qcGo.decision).toBe('Go');
  });
});
