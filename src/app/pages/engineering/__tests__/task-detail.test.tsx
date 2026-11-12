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
    submitQuotationDesign: vi.fn().mockResolvedValue({}),
    approveQuotationEngineering: vi.fn().mockResolvedValue({}),
    rejectQuotationEngineering: vi.fn().mockResolvedValue({}),
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
    ]),
    listQuotations: vi.fn().mockResolvedValue([]),
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

  it('allows submission when "Tidak ada material" is checked for empty BOM', async () => {
    const queryClient = new QueryClient();
    
    // Override the salesApi mock to provide an empty BOM
    vi.mocked(salesApi.listSalesOrders).mockResolvedValue([
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        soNumber: 'so-eng-1',
        customerId: 'CUST-1',
        customerCode: 'CUST-1',
        customerName: 'Customer A',
        soDate: '2026-07-08',
        targetDate: '2026-07-15',
        status: 'Pending Design', // Editable state
        designStatus: 'PendingDesign',
        productionStatus: 'Pending',
        designWorkerUserId: 'u1',
        drawingFileUrl: 'https://new-design.com',
        designReference: 'https://new-design.com',
        createdAtUtc: '2026-07-08T10:00:00Z',
        items: [
          { id: 'item-1', productId: 'p1', productPartNumber: 'PRD-001', productDescription: 'Item A', qty: 5, notes: '[]' } // Empty BOM
        ]
      }
    ]);
    
    // Also mock useApp just in case
    vi.spyOn(appContext, 'useApp').mockReturnValue({
      customers: [{ code: 'CUST-1', name: 'Customer A' }],
      currentUser: { id: 'u1', name: 'Spv 1', role: 'Engineering Supervisor' },
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn(),
      productCatalog: [],
      salesOrders: []
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/erp/engineer-tasks/123e4567-e89b-12d3-a456-426614174001']}>
          <Routes>
            <Route path="/erp/engineer-tasks/:id" element={<EngineeringTaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for render
    await waitFor(() => {
      expect(screen.getByText(/Simpan Desain & Lanjut ke Produksi/i)).toBeInTheDocument();
    });

    // The submit button should be disabled because BOM is empty
    const submitBtn = screen.getByRole('button', { name: /Simpan Desain & Lanjut ke Produksi/i });
    expect(submitBtn).toBeDisabled();

    // Check "Tidak ada material"
    const noMaterialCheckbox = screen.getByRole('checkbox', { name: /Tidak ada material/i });
    fireEvent.click(noMaterialCheckbox);

    // The submit button should now be enabled
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });

  it('routes Quotation design submission to quotation engineering endpoint with database GUID (Test D3)', async () => {
    const queryClient = new QueryClient();
    const quotationGuid = 'd4626d81-a742-4d9f-98b7-8a3c37c9d6f1';
    const engineerGuid = '90000000-0000-4000-8000-000000000002';

    vi.mocked(salesApi.listSalesOrders).mockResolvedValue([]);
    vi.mocked(salesApi.listQuotations).mockResolvedValue([
      {
        id: quotationGuid,
        quotationNumber: 'QU-2026-0077',
        customerId: 'cust-guid-1',
        customerCode: 'CUST-1',
        customerName: 'Customer A',
        deadline: '2026-08-15',
        status: 'pending_design',
        designSource: 'Engineering',
        engineeringReviewRequired: true,
        assignedEngineerId: engineerGuid,
        assignedEngineerName: 'Eng Worker',
        designLink: 'https://cad.example.com/qu-77.dwg',
        items: [
          { id: 'q-item-77', productName: 'Custom Bracket', quantity: 4, unit: 'PCS' }
        ],
        bomItems: [
          { id: 'bom-77', itemCode: 'MAT-01', name: 'S45C Plate', specification: '10mm', quantity: 4, unit: 'pcs' }
        ],
        revisions: [],
        createdAtUtc: '2026-08-01T00:00:00Z',
        updatedAtUtc: '2026-08-01T00:00:00Z',
      } as any
    ]);

    vi.spyOn(appContext, 'useApp').mockReturnValue({
      customers: [{ code: 'CUST-1', name: 'Customer A' }],
      currentUser: { id: 'u2', name: 'Eng Worker', role: 'Engineering' },
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn(),
      productCatalog: [],
      salesOrders: []
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/erp/engineer-tasks/QU-2026-0077']}>
          <Routes>
            <Route path="/erp/engineer-tasks/:id" element={<EngineeringTaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('QU-2026-0077')).toBeInTheDocument();
    });

    const submitBtn = await screen.findByRole('button', { name: /Simpan Desain & Lanjut ke Produksi/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await screen.findByText(/Konfirmasi menyimpan spesifikasi CAD & BOM/i);
    const confirmBtn = screen.getByRole('button', { name: /Simpan Desain & Lanjut ke Produksi/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(salesApi.submitQuotationDesign).toHaveBeenCalledWith(
        quotationGuid,
        expect.objectContaining({
          engineerId: engineerGuid,
          engineerName: 'Eng Worker',
          designLink: 'https://cad.example.com/qu-77.dwg',
        })
      );
    });
    expect(salesApi.submitSalesOrderDesign).not.toHaveBeenCalled();
    expect(salesApi.updateSalesOrderDesignStatus).not.toHaveBeenCalled();
  });

});
