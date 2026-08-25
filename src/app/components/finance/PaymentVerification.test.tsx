import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentVerification } from './PaymentVerification';
import { useFinanceData } from './useFinanceData';

// Mock the hook to provide predictable state during tests
vi.mock('./useFinanceData', () => ({
  useFinanceData: vi.fn(),
}));

// Mock financeApi just in case
vi.mock('../../services/financeApi', () => ({
  financeApi: {
    verifyPaymentProof: vi.fn(),
    rejectPaymentProof: vi.fn(),
    recordPayment: vi.fn(),
  }
}));

describe('PaymentVerification Component', () => {
  it('renders the payment verification header and empty state properly', () => {
    vi.mocked(useFinanceData).mockReturnValue({
      payments: [],
      invoices: [],
      refresh: vi.fn(),
      isLoading: false,
    } as any);

    render(<PaymentVerification />);

    expect(screen.getByText('Verifikasi Pembayaran')).toBeInTheDocument();
    expect(screen.getByText('Belum ada data pembayaran')).toBeInTheDocument();
  });

  it('renders pending payment items and shows warning count', () => {
    vi.mocked(useFinanceData).mockReturnValue({
      payments: [
        {
          id: '1',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-1001',
          soNumber: 'SO-1001',
          customerName: 'Test Customer A',
          paymentDate: '2026-06-10',
          amount: 5000000,
          paymentMethod: 'Transfer',
          bankName: 'BCA',
          bankRef: 'REF-123',
          proofAvailable: true,
          status: 'PENDING',
        }
      ],
      invoices: [],
      refresh: vi.fn(),
      isLoading: false,
    } as any);

    render(<PaymentVerification />);

    expect(screen.getByText('Pembayaran Baru')).toBeInTheDocument();
    expect(screen.getByText('Test Customer A')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 5.000.000').length).toBeGreaterThan(0);
  });

  it('calls financeApi.verifyPaymentProof when Verifikasi button is clicked', async () => {
    const mockRefresh = vi.fn();
    vi.mocked(useFinanceData).mockReturnValue({
      payments: [
        {
          id: 'pay-1',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-1001',
          customerName: 'Test Customer A',
          paymentDate: '2026-06-10',
          amount: 5000000,
          status: 'PENDING',
          proofAvailable: true,
        }
      ],
      invoices: [],
      refresh: mockRefresh,
      isLoading: false,
    } as any);

    const { financeApi } = await import('../../services/financeApi');
    
    render(<PaymentVerification />);

    const verifyBtns = screen.getAllByRole('button', { name: /Verifikasi/i });
    const verifyActionBtn = verifyBtns.find(btn => btn.textContent?.includes('Verifikasi') && !btn.textContent?.includes('Menunggu'));
    if (verifyActionBtn) {
      fireEvent.click(verifyActionBtn); // Opens modal
    }

    // Wait for modal to open
    const modalTitle = await screen.findByText('Detail Pembayaran');
    expect(modalTitle).toBeInTheDocument();

    const allVerifikasiBtns = screen.getAllByRole('button', { name: 'Verifikasi' });
    // The button inside the modal is the last one rendered in the DOM
    const exactVerifyBtn = allVerifikasiBtns[allVerifikasiBtns.length - 1];
    fireEvent.click(exactVerifyBtn); // Enters verify mode

    // Wait for confirmation button to appear
    const confirmBtn = await screen.findByRole('button', { name: /Ya, Verifikasi/i });
    fireEvent.click(confirmBtn);

    expect(financeApi.verifyPaymentProof).toHaveBeenCalledWith('pay-1');
  });

  it('calls financeApi.rejectPaymentProof when Tolak flow is completed in modal', async () => {
    const mockRefresh = vi.fn();
    vi.mocked(useFinanceData).mockReturnValue({
      payments: [
        {
          id: 'pay-2',
          invoiceId: 'inv-2',
          invoiceNumber: 'INV-1002',
          customerName: 'Test Customer B',
          paymentDate: '2026-06-11',
          amount: 2000000,
          status: 'PENDING',
          proofAvailable: true,
        }
      ],
      invoices: [],
      refresh: mockRefresh,
      isLoading: false,
    } as any);

    const { financeApi } = await import('../../services/financeApi');
    const { fireEvent, waitFor } = await import('@testing-library/react');
    
    render(<PaymentVerification />);

    // Click the card to open the modal
    const cardTitle = screen.getByText('Test Customer B');
    fireEvent.click(cardTitle);

    // Modal should be open. Wait for it.
    const modalTitle = await screen.findByText('Detail Pembayaran');
    expect(modalTitle).toBeInTheDocument();

    // Click Tolak in the modal.
    const allTolakBtns2 = await screen.findAllByRole('button', { name: /Tolak/i });
    fireEvent.click(allTolakBtns2[allTolakBtns2.length - 1]);
    
    // Now textarea should be visible
    const reasonInput = await screen.findByPlaceholderText(/wajib diisi/i);
    fireEvent.change(reasonInput, { target: { value: 'Bukti transfer buram' } });

    // Click confirm
    const confirmBtn = await screen.findByRole('button', { name: /Konfirmasi Penolakan/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(financeApi.rejectPaymentProof).toHaveBeenCalledWith('pay-2', { reason: 'Bukti transfer buram' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
