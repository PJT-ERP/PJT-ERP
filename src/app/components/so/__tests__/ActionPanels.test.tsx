import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionPanels } from '../detail/ActionPanels';

const props = (overrides: Record<string, unknown> = {}) => ({
  order: {
    id: 'SO-2026-100',
    status: 'Pending Design',
    invoice: { invoiceId: 'invoice-1', invoiceNumber: 'INV-2026-100', status: 'waiting' },
    ...overrides,
  } as any,
  currentUserRole: 'Finance',
  currentUserName: 'Finance User',
  actionForm: { estimatedAmount: 0, engineerName: '', designUrl: '' },
  setActionForm: vi.fn(),
  handleAction: vi.fn(),
});

describe('ActionPanels finance completion', () => {
  it('offers invoice-based completion only after an invoice exists and confirms the bypass', () => {
    const panelProps = props();
    render(<ActionPanels {...panelProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Selesaikan SO \(Invoice Terbit\)/i }));
    expect(screen.getByRole('dialog', { name: 'Konfirmasi penyelesaian SO' })).toBeInTheDocument();
    expect(screen.getByText(/tahapan Engineering, Produksi, serta QC/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Selesaikan SO' }));

    expect(panelProps.handleAction).toHaveBeenCalledWith('finance_force_complete');
  });

  it('shows Finance completion disabled with an invoice-required hover hint when no invoice exists', () => {
    render(<ActionPanels {...props({ invoice: undefined })} />);
    const button = screen.getByRole('button', { name: /Selesaikan SO \(Invoice Terbit\)/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Invoice harus diterbitkan terlebih dahulu untuk menyelesaikan SO.');
    expect(button).toHaveStyle({ background: '#e2e8f0', cursor: 'not-allowed' });
  });

  it('does not offer Finance completion to Sales even when an invoice exists', () => {
    render(<ActionPanels {...{ ...props(), currentUserRole: 'Sales' }} />);
    expect(screen.queryByRole('button', { name: /Selesaikan SO \(Invoice Terbit\)/i })).not.toBeInTheDocument();
  });
});
