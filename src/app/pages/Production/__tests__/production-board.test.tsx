import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MaterialPrepPanel } from '../components/panels/MaterialPrepPanel';
import { MemoryRouter } from 'react-router';

// We mock the react-router navigation since we're testing a panel component
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Production Board Panels - Integration Tests', () => {
  it('strictly displays the "Dikembalikan ke SPV" badge when rejectionReason is present', () => {
    const mockOrder: any = {
      id: 'SO-123',
      soNumber: 'SO-123',
      status: 'Ready for Production',
      rejectionReason: 'Material cacat',
      items: [{ productName: 'Test Product', quantity: 10, unit: 'pcs' }]
    };

    render(
      <MemoryRouter>
        <MaterialPrepPanel
          board={{
            isSupervisor: true,
            currentUser: { id: 'u1' },
            pendingMaterialPrep: [mockOrder],
            checkMaterialShortage: () => false,
            getMaterialRequestState: () => 'none',
            setDetailModal: vi.fn(),
            setReviewMrModal: vi.fn(),
          } as any}
        />
      </MemoryRouter>
    );

    // This strictly asserts that the frontend logic for `so.rejectionReason` 
    // correctly cascades into the UI showing this exact badge.
    expect(screen.getByText(/Dikembalikan ke SPV/)).toBeInTheDocument();
  });

  it('does NOT display the rejection badge if there is no rejection reason', () => {
    const mockOrder: any = {
      id: 'SO-124',
      soNumber: 'SO-124',
      status: 'Ready for Production',
      rejectionReason: null,
      items: [{ productName: 'Test Product 2', quantity: 10, unit: 'pcs' }]
    };

    render(
      <MemoryRouter>
        <MaterialPrepPanel
          board={{
            isSupervisor: true,
            currentUser: { id: 'u1' },
            pendingMaterialPrep: [mockOrder],
            checkMaterialShortage: () => false,
            getMaterialRequestState: () => 'none',
            setDetailModal: vi.fn(),
            setReviewMrModal: vi.fn(),
          } as any}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Dikembalikan ke SPV/)).not.toBeInTheDocument();
  });
});
