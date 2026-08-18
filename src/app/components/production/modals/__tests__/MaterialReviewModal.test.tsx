import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MaterialReviewModal } from '../MaterialReviewModal';

describe('MaterialReviewModal - Supervisor Rejection Flow', () => {
  it('allows supervisor to reject a material request with a reason', async () => {
    const so = {
      id: 'so-mr-1',
      description: 'Test SO',
      spec: 'Spec 1',
    } as any;

    const request = {
      id: 'PR-123',
      itemName: 'Item 1',
      status: 'Menunggu Supervisor',
      urgency: 'Normal',
      items: [{ itemName: 'Item 1', quantity: 5, unit: 'PCS', specification: 'Spec 1' }]
    } as any;

    const onClose = vi.fn();
    const onApprove = vi.fn().mockResolvedValue(true);
    const onReject = vi.fn().mockResolvedValue(true);

    render(
      <MaterialReviewModal
        so={so}
        request={request}
        onClose={onClose}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    const user = userEvent.setup();

    // 1. Verify modal is open
    expect(screen.getByText('PR-123')).toBeInTheDocument();
    
    // 2. Click "Tolak" button
    const tolakBtn = screen.getByRole('button', { name: 'Tolak' });
    await user.click(tolakBtn);

    // 3. Reject reason input appears
    expect(screen.getByText('Catatan Penolakan Supervisor')).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/Contoh: qty terlalu banyak/i);

    // 4. Input reason
    await user.type(reasonInput, 'Qty terlalu banyak');

    // 5. Submit rejection
    const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Tolak/i });
    await user.click(confirmBtn);

    // 6. Verify callbacks
    await waitFor(() => {
      expect(onReject).toHaveBeenCalledWith('Qty terlalu banyak');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
