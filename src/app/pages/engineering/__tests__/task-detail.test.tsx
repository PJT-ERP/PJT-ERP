import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineeringTaskDetailPage } from '../task-detail';
import * as appContext from '../../../components/context/AppContext';
import { salesApi } from '../../../services/salesApi';
import { productionApi } from '../../../services/productionApi';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    updateSalesOrderDesignStatus: vi.fn().mockResolvedValue({}),
    submitSalesOrderDesign: vi.fn().mockResolvedValue({}),
    updateSalesOrderItems: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../../services/productionApi', () => ({
  productionApi: {
    submitBoms: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn().mockResolvedValue([])
  }
}));

describe('EngineeringTaskDetailPage - Engineer Resubmission Flow', () => {
  const updateSalesOrderMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the prompt/alert to prevent blocking test
    window.alert = vi.fn();
    
    vi.spyOn(appContext, 'useApp').mockReturnValue({
      customers: [{ code: 'CUST-1', name: 'Customer A' }],
      currentUser: { id: 'u1', name: 'Engineer 1', role: 'Engineering' },
      updateSalesOrder: updateSalesOrderMock,
      refreshBackendData: vi.fn(),
      productCatalog: [],
      salesOrders: [
        {
          id: 'so-eng-1',
          backendId: '123e4567-e89b-12d3-a456-426614174001',
          soNumber: 'SO-2026-ENG',
          customerId: 'CUST-1',
          partNumber: 'PART-ENG',
          status: 'Revision Required', // Currently rejected
          backendDesignStatus: 'RevisionRequired',
          rejectionReason: 'Please change the base material to aluminum.',
          designAssignedTo: 'u1',
          designLink: 'https://old-design.com',
          createdAt: '2026-07-08T10:00:00Z',
          quantity: 10,
          deadline: '2026-07-15',
          items: [
            { id: 'item-1', productName: 'Item A', quantity: 5, unit: 'pcs' }
          ]
        }
      ]
    } as any);
  });

  it('allows engineer to see rejection reason and resubmit design', async () => {
    render(
      <MemoryRouter initialEntries={['/erp/engineer-tasks/so-eng-1']}>
        <Routes>
          <Route path="/erp/engineer-tasks/:id" element={<EngineeringTaskDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Verify rejection reason is displayed
    await waitFor(() => {
      expect(screen.getByText('⚠️ Desain Ditolak / Perlu Revisi')).toBeInTheDocument();
      expect(screen.getByText('Catatan Supervisor: Please change the base material to aluminum.')).toBeInTheDocument();
    });

    // 2. Click "Edit Link" to edit the design link
    const editLinkBtn = screen.getByRole('button', { name: /Edit Link/i });
    fireEvent.click(editLinkBtn);

    // 3. Update the design link
    const linkInput = screen.getByRole('textbox', { name: '' }) as HTMLInputElement; 
    // Usually it's an input type="url". We can find it by its value or type
    const urlInputs = screen.getAllByRole('textbox').filter(input => (input as HTMLInputElement).type === 'url');
    fireEvent.change(urlInputs[0] || linkInput, { target: { value: 'https://new-design-link.com' } });

    // 4. Click "Submit & Forward"
    const submitBtn = screen.getByRole('button', { name: /Submit & Forward/i });
    fireEvent.click(submitBtn);

    // 5. Confirmation screen appears, click "Forward ke Supervisor"
    const confirmBtn = screen.getByRole('button', { name: /Forward ke Supervisor/i });
    fireEvent.click(confirmBtn);

    // 6. Verify APIs were called
    await waitFor(() => {
      expect(salesApi.submitSalesOrderDesign).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', expect.objectContaining({
        designReference: 'https://new-design-link.com',
        drawingFileUrl: 'https://new-design-link.com'
      }));

      expect(updateSalesOrderMock).toHaveBeenCalledWith('so-eng-1', expect.objectContaining({
        status: 'Waiting Spv Approval', // Goes back to Spv
        designLink: 'https://new-design-link.com'
      }));
    });
  });
});
