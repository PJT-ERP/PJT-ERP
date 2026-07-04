import { render, screen } from '@testing-library/react';
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
    verifyActionBtn?.click();

    expect(financeApi.verifyPaymentProof).toHaveBeenCalledWith('pay-1');
  });
});
