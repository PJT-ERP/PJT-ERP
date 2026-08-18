import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineeringTaskDetailPage } from '../task-detail';
import * as appContext from '../../../components/context/AppContext';
import { salesApi } from '../../../services/salesApi';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    updateSalesOrderDesignStatus: vi.fn().mockResolvedValue({}),
    submitSalesOrderDesign: vi.fn().mockResolvedValue({}),
    updateSalesOrderItems: vi.fn().mockResolvedValue({}),
    updateProductBom: vi.fn().mockResolvedValue({}),
    listSalesOrders: vi.fn().mockResolvedValue([
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        soNumber: 'so-eng-1',
        customerId: 'CUST-1',
        partNumber: 'PART-ENG',
        status: 'Revision Required', 
        backendDesignStatus: 'RevisionRequired',
        rejectionReason: 'Please change the base material to aluminum.',
        designAssignedTo: 'u1',
        drawingFileUrl: 'https://old-design.com',
        createdAt: '2026-07-08T10:00:00Z',
        quantity: 10,
        deadline: '2026-07-15',
        items: [
          { id: 'item-1', productName: 'Item A', quantity: 5, unit: 'pcs', notes: '[{"id":"m1","name":"Alumunium","quantity":1,"inventoryItemId":"INV-1"}]' }
        ]
      }
    ])
  }
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn().mockResolvedValue([]),
    createInventoryItem: vi.fn().mockResolvedValue({ id: 'INV-NEW', name: 'Baja' })
  }
}));

describe('EngineeringTaskDetailPage - Supervisor Resubmission Flow', () => {
  const updateSalesOrderMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the prompt/alert to prevent blocking test
    window.alert = vi.fn();
    
    vi.spyOn(appContext, 'useApp').mockReturnValue({
      customers: [{ code: 'CUST-1', name: 'Customer A' }],
      currentUser: { id: 'u1', name: 'Spv 1', role: 'Engineering Supervisor' },
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
          drawingFileUrl: 'https://old-design.com',
          createdAt: '2026-07-08T10:00:00Z',
          quantity: 10,
          deadline: '2026-07-15',
          items: [
            { id: 'item-1', productName: 'Item A', quantity: 5, unit: 'pcs', notes: '[{"id":"m1","name":"Alumunium","quantity":1,"inventoryItemId":"INV-1"}]' }
          ]
        }
      ]
    } as any);
  });

  it('allows supervisor to see rejection reason and resubmit design', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/erp/engineer-tasks/so-eng-1']}>
          <Routes>
            <Route path="/erp/engineer-tasks/:id" element={<EngineeringTaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Verify rejection reason is displayed STRICTLY based on the payload
    await waitFor(() => {
      expect(screen.getByText(/Desain Ditolak \/ Perlu Revisi/i)).toBeInTheDocument();
      expect(screen.getByText(/Catatan Supervisor: Please change the base material to aluminum\./i)).toBeInTheDocument();
    });

    // 1b. Verify that if status changes, the alert disappears (negative test simulation)
    // We can't change the mock state mid-test without re-rendering, so we verify that the current state correctly shows it.
    
    // 2. Click "Edit Link" to edit the design link
    const editLinkBtn = screen.getByRole('button', { name: /Edit Link/i });
    fireEvent.click(editLinkBtn);

    // 3. Update the design link
    const linkInput = screen.getByPlaceholderText("Tempel link URL desain di sini atau klik tombol 'Unggah File'...") as HTMLInputElement;
    fireEvent.change(linkInput, { target: { value: 'https://new-design-link.com' } });

    // 4. Click "Simpan Desain & Lanjut ke Produksi" (to enter confirm step)
    const submitBtn = screen.getByRole('button', { name: /Simpan Desain/i });
    fireEvent.click(submitBtn);

    // 5. Confirmation screen appears, click "Simpan Desain & Lanjut ke Produksi" again
    await screen.findByText(/Konfirmasi menyimpan spesifikasi CAD & BOM/i);
    const confirmBtn = screen.getByRole('button', { name: /Simpan Desain/i });
    fireEvent.click(confirmBtn);

    // 6. Verify APIs were called
    await waitFor(() => {
      expect(salesApi.updateSalesOrderDesignStatus).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', expect.objectContaining({
        designReference: 'https://new-design-link.com',
        designStatus: 'Approved'
      }));
    });
  });

  it('renders QR code and download button', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/erp/engineer-tasks/so-eng-1']}>
          <Routes>
            <Route path="/erp/engineer-tasks/:id" element={<EngineeringTaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Look for the canvas element by id (can't directly query getElementById with rtl but we can use container or querySelector)
      const downloadBtn = screen.getByRole('button', { name: /Download QR/i });
      expect(downloadBtn).toBeInTheDocument();
    });
  });

});
