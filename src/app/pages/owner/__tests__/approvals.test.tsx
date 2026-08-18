import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalModal } from '../approvals';
import * as useAppHook from '../../../components/context/AppContext';
import * as queriesHook from '../../../services/queries';
import { productionApi } from '../../../services/productionApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../services/productionApi', () => ({
  productionApi: {
    updateSalesOrderDesignStatus: vi.fn().mockResolvedValue({})
  }
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Owner Approvals - Design Rejection Flow', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(useAppHook, 'useApp').mockReturnValue({
      currentUser: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Owner', role: 'Owner' }
    } as any);

    vi.spyOn(queriesHook, 'useCustomersQuery').mockReturnValue({
      data: [{ code: 'CUST-1', name: 'Customer A' }]
    } as any);
  });

  it('allows owner to reject a design and request revision', async () => {
    const item = {
      id: 'so-rev-1',
      backendId: 'backend-so-1',
      soNumber: 'SO-2026-REV',
      customerId: 'CUST-1',
      partNumber: 'PART-REV',
      description: 'Test Part',
      status: 'Waiting Approval',
      quantity: 10,
      unit: 'pcs'
    } as any;

    const onCloseMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ApprovalModal item={item} onClose={onCloseMock} />
      </QueryClientProvider>
    );

    // 1. Verify modal is open
    expect(screen.getByText('Review Desain — so-rev-1')).toBeInTheDocument();

    // 2. Click "Tolak Desain"
    const rejectButton = screen.getByText(/Tolak Desain/i);
    fireEvent.click(rejectButton);

    // 3. Select "Minta Revisi" (Default selected, but let's click it to be sure)
    const revisionButton = screen.getByText(/Minta Revisi/i);
    fireEvent.click(revisionButton);

    // 4. Fill in rejection reason
    const reasonInput = screen.getByPlaceholderText('Apa yang perlu diperbaiki?');
    fireEvent.change(reasonInput, { target: { value: 'Please fix the dimensions on the top bracket.' } });

    // 5. Submit "Kirim Revisi"
    const submitButton = screen.getByText(/Kirim Revisi/i);
    fireEvent.click(submitButton);

    // 6. Verify APIs were called correctly
    await waitFor(() => {
      expect(productionApi.updateSalesOrderDesignStatus).toHaveBeenCalledWith('backend-so-1', expect.objectContaining({
        designStatus: 'RevisionRequired',
        reviewedByUserId: '123e4567-e89b-12d3-a456-426614174000',
        reviewerName: 'Owner'
      }));
    });

    // 7. Success message
    expect(screen.getByText('Revisi Diminta')).toBeInTheDocument();
  });

  it('allows engineering supervisor to reject a design permanently', async () => {
    // Override currentUser to be Engineering Supervisor
    vi.spyOn(useAppHook, 'useApp').mockReturnValue({
      currentUser: { id: '234e5678-e89b-12d3-a456-426614174000', name: 'Eng Supervisor', role: 'Engineering Supervisor' }
    } as any);

    const item = {
      id: 'so-reject-2',
      backendId: 'backend-so-2',
      soNumber: 'SO-2026-REJ',
      customerId: 'CUST-1',
      partNumber: 'PART-REJ',
      description: 'Test Part 2',
      status: 'Waiting Approval',
      quantity: 5,
      unit: 'pcs'
    } as any;

    const onCloseMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ApprovalModal item={item} onClose={onCloseMock} />
      </QueryClientProvider>
    );

    // 1. Click "Tolak Desain"
    const rejectButton = screen.getByText(/Tolak Desain/i);
    fireEvent.click(rejectButton);

    // 2. Select "Tolak Permanen"
    const permanentButton = screen.getByText(/Tolak Permanen/i);
    fireEvent.click(permanentButton);

    // 3. Fill in rejection reason
    const reasonInput = screen.getByPlaceholderText('Mengapa dibatalkan?');
    fireEvent.change(reasonInput, { target: { value: 'Design fundamentally flawed, cannot manufacture.' } });

    // 4. Submit "Tolak Permanen"
    const allPermanentBtns = screen.getAllByRole('button', { name: /Tolak Permanen/i });
    fireEvent.click(allPermanentBtns[1]); // the submit button

    // 5. Verify APIs
    await waitFor(() => {
      expect(productionApi.updateSalesOrderDesignStatus).toHaveBeenCalledWith('backend-so-2', expect.objectContaining({
        designStatus: 'Rejected',
        reviewedByUserId: '234e5678-e89b-12d3-a456-426614174000',
        reviewerName: 'Eng Supervisor'
      }));
    });

    // 6. Success message
    expect(screen.getByText('Desain Ditolak Permanen')).toBeInTheDocument();
  });

  it('allows engineering supervisor to reject a design and request revision', async () => {
    // Override currentUser to be Engineering Supervisor
    vi.spyOn(useAppHook, 'useApp').mockReturnValue({
      currentUser: { id: '234e5678-e89b-12d3-a456-426614174000', name: 'Eng Supervisor', role: 'Engineering Supervisor' }
    } as any);

    const item = {
      id: 'so-rev-2',
      backendId: 'backend-so-3',
      soNumber: 'SO-2026-REV2',
      customerId: 'CUST-1',
      partNumber: 'PART-REV2',
      description: 'Test Part 3',
      status: 'Waiting Approval',
      quantity: 8,
      unit: 'pcs'
    } as any;

    const onCloseMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ApprovalModal item={item} onClose={onCloseMock} />
      </QueryClientProvider>
    );

    // 1. Click "Tolak Desain"
    const rejectButton = screen.getByText(/Tolak Desain/i);
    fireEvent.click(rejectButton);

    // 2. Select "Minta Revisi"
    const revisionButton = screen.getByText(/Minta Revisi/i);
    fireEvent.click(revisionButton);

    // 3. Fill in rejection reason
    const reasonInput = screen.getByPlaceholderText('Apa yang perlu diperbaiki?');
    fireEvent.change(reasonInput, { target: { value: 'Revise the material thickness specification.' } });

    // 4. Submit "Kirim Revisi"
    const submitButton = screen.getByText(/Kirim Revisi/i);
    fireEvent.click(submitButton);

    // 5. Verify APIs were called correctly
    await waitFor(() => {
      expect(productionApi.updateSalesOrderDesignStatus).toHaveBeenCalledWith('backend-so-3', expect.objectContaining({
        designStatus: 'RevisionRequired',
        reviewedByUserId: '234e5678-e89b-12d3-a456-426614174000',
        reviewerName: 'Eng Supervisor'
      }));
    });

    // 6. Success message
    expect(screen.getByText('Revisi Diminta')).toBeInTheDocument();
  });
});
