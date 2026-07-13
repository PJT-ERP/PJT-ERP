import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QCInspectionsPage } from '../qc-inspections';
import * as appContext from '../../../components/context/AppContext';
import { qcApi } from '../../../services/qcApi';

vi.mock('../../../services/qcApi', () => ({
  qcApi: {
    listInspections: vi.fn().mockResolvedValue([{ id: 'insp-1', salesOrderId: 'so-nogo-1', salesOrderNumber: 'SO-2026-NOGO', status: 'ReadyForInspection', refNo: 'so-nogo-1' }]),
    getInspectionBySalesOrder: vi.fn().mockResolvedValue({ id: 'insp-1', assignedReviewerUserId: 'u1' }),
    uploadPhotos: vi.fn().mockResolvedValue({ urls: ['https://example.com/photo.png'] }),
    uploadResult: vi.fn().mockResolvedValue({ id: 'insp-1' })
  }
}));

describe('QCInspectionsPage - QC Rejection Flow', () => {
  const updateSalesOrderMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock alert so it doesn't interrupt test
    window.alert = vi.fn();
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');

    vi.spyOn(appContext, 'useApp').mockReturnValue({
      customers: [{ code: 'CUST-1', name: 'Customer A' }],
      currentUser: { id: 'u1', name: 'QC Admin', role: 'Engineering Admin' },
      refreshBackendData: vi.fn(),
      salesOrders: [
        {
          id: 'so-nogo-1',
          soNumber: 'SO-2026-NOGO',
          customerId: 'CUST-1',
          partNumber: 'PART-NOGO',
          status: 'QC',
          qcStatus: null,
          quantity: 10,
          unit: 'pcs'
        }
      ],
      updateSalesOrder: updateSalesOrderMock
    } as any);
  });

  it('allows marking an item as NoGo and sends it back to production (rework)', async () => {
    render(<QCInspectionsPage />);

    // 1. Verify the order is in the QC list
    expect(screen.getByText('so-nogo-1')).toBeInTheDocument();

    // 2. Click Mulai Inspeksi
    const qcControlButton = screen.getByText('Mulai Inspeksi');
    fireEvent.click(qcControlButton);

    // 3. Wait for modal to open
    await waitFor(() => expect(screen.getByText('Inspeksi QC — so-nogo-1')).toBeInTheDocument());

    // 4. We need to mock photo uploads because the form requires them
    // Find file inputs (first one is production, second is QC)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    expect(fileInputs.length).toBeGreaterThanOrEqual(2);

    const prodFileInput = fileInputs[0];
    const qcFileInput = fileInputs[1];

    const prodFile = new File(['hello'], 'prod.png', { type: 'image/png' });
    const qcFile = new File(['hello'], 'qc.png', { type: 'image/png' });

    // Use userEvent which properly handles FileList assignment in React
    const user = userEvent.setup();
    await user.upload(prodFileInput as HTMLInputElement, prodFile);
    await user.upload(qcFileInput as HTMLInputElement, qcFile);

    // 5. Provide mandatory NoGo notes
    const notesTextarea = screen.getByPlaceholderText('Temuan defect, kondisi produk, rekomendasi, dll.');
    fireEvent.change(notesTextarea, { target: { value: 'Dimension is off by 2mm. Please re-machine.' } });

    // 6. Select NoGo
    const nogoButton = screen.getByText('✕ NoGo');
    fireEvent.click(nogoButton);

    // 7. Submit
    const submitButton = screen.getByText('Submit Hasil QC');
    fireEvent.click(submitButton);

    // If it failed validation, we would see alert called:
    // expect(window.alert).not.toHaveBeenCalled();

    // 8. Verify API and App Context were called to send it back to production
    await waitFor(() => {
      // Just check if updateSalesOrderMock was called. If it's a file upload issue, 
      // vitest/jsdom sometimes struggles with file inputs. 
      // Let's ensure we are asserting correctly.
      if ((window.alert as any).mock.calls.length > 0) {
        console.error("Alert was called:", (window.alert as any).mock.calls);
      }
      expect(qcApi.uploadResult).toHaveBeenCalledWith('insp-1', expect.objectContaining({
        decision: 'NoGo',
        notes: 'Dimension is off by 2mm. Please re-machine.'
      }));
      
      expect(updateSalesOrderMock).toHaveBeenCalledWith('so-nogo-1', expect.objectContaining({
        status: 'Ready for Production', // <--- Crucial: it goes back to production!
        qcStatus: 'NoGo',
        isRework: true
      }));
    });

    // 9. Verify success modal showing it was returned to production
    expect(screen.getByText(/Dikembalikan ke produksi untuk rework/i)).toBeInTheDocument();
  });
});
