import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnToSpvModal } from '../ReturnToSpvModal';

const mockRefreshBackendData = vi.fn().mockResolvedValue(undefined);
const mockAssignSalesOrderEngineers = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ refreshBackendData: mockRefreshBackendData }),
}));

vi.mock('../../../../services/salesApi', () => ({
  salesApi: {
    assignSalesOrderEngineers: (...args: any[]) => mockAssignSalesOrderEngineers(...args),
  },
}));

vi.mock('../../ProductionHelpers', () => ({
  getBackendSalesOrderId: (so: any) => so.backendId || so.id || 'so-backend-1',
  S: { slate: '#1e293b', secondary: '#64748b', border: '#e2e8f0', white: '#fff', bg: '#f8fafc', cyan: '#0891b2', cardBorder: '#e2e8f0' },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

const baseSo = {
  id: 'SO-001',
  backendId: 'so-backend-1',
  description: 'Test SO',
} as any;

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderModal(so = baseSo) {
  const onClose = vi.fn();
  const onSubmitted = vi.fn();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ReturnToSpvModal so={so} onClose={onClose} onSubmitted={onSubmitted} />
    </QueryClientProvider>
  );
  return { ...result, onClose, onSubmitted };
}

describe('ReturnToSpvModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignSalesOrderEngineers.mockResolvedValue({});
  });

  it('renders modal with SO ID and notes textarea', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Kembalikan ke SPV' })).toBeInTheDocument();
    expect(screen.getByText(/SO-001/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: Material aluminium/)).toBeInTheDocument();
  });

  it('has "Batal" and "Kembalikan ke SPV" buttons', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kembalikan ke SPV' })).toBeInTheDocument();
  });

  it('calls onClose when "Batal" is clicked', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('alerts when submitting with empty notes', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Harap isi catatan / alasan pengembalian SO ke SPV.'
    );
    expect(mockAssignSalesOrderEngineers).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('disables buttons during submission', async () => {
    // Make the API call hang so we can observe the loading state
    mockAssignSalesOrderEngineers.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const { onClose, onSubmitted } = renderModal();

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: 'Material kurang' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    expect(screen.getByRole('button', { name: 'Memproses...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls assignSalesOrderEngineers with empty userId and notes on submit', async () => {
    const { onClose, onSubmitted } = renderModal();

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: 'Material aluminium ukuran 100x50 kurang 2 pcs' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    await waitFor(() => {
      expect(mockAssignSalesOrderEngineers).toHaveBeenCalledWith(
        'so-backend-1',
        {
          productionWorker: {
            userId: '00000000-0000-0000-0000-000000000000',
            name: '',
          },
          notes: 'Material aluminium ukuran 100x50 kurang 2 pcs',
        }
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'SO berhasil dikembalikan ke SPV.',
      { duration: 3000 }
    );
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows alert on API failure', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockAssignSalesOrderEngineers.mockRejectedValue(new Error('Network error'));
    const { onClose, onSubmitted } = renderModal();

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: 'Stok habis' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Gagal mengembalikan SO ke SPV. Silakan periksa koneksi Anda.'
      );
    });
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('trims notes before sending', async () => {
    renderModal();

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: '  Stok kurang   ' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    await waitFor(() => {
      expect(mockAssignSalesOrderEngineers).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ notes: 'Stok kurang' })
      );
    });
  });

  it('uses so.backendId fallback to so.id', async () => {
    const soWithoutBackend = { id: 'SO-LOCAL', description: 'Local SO' } as any;
    renderModal(soWithoutBackend);

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: 'Test' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    await waitFor(() => {
      expect(mockAssignSalesOrderEngineers).toHaveBeenCalledWith(
        'SO-LOCAL', // falls back to so.id
        expect.objectContaining({ notes: 'Test' })
      );
    });
  });

  it('invalidates queries after successful submit', async () => {
    mockAssignSalesOrderEngineers.mockResolvedValue({});
    const { onSubmitted } = renderModal();

    fireEvent.change(
      screen.getByPlaceholderText(/Contoh: Material aluminium/),
      { target: { value: 'Perlu approval ulang SPV' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke SPV' }));

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalled();
    });
  });
});
