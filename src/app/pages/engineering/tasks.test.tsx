import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { EngineeringTasksPage } from './tasks';
import { useApp } from '../../components/context/AppContext';

vi.mock('../../components/context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('EngineeringTasksPage', () => {
  it('renders engineering queue with Input Desain button for pending tasks', () => {
    vi.mocked(useApp).mockReturnValue({
      quotations: [],
      customers: [],
      users: [],
      salesOrders: [
        {
          id: 'q1',
          status: 'Pending Design',
          description: 'Custom Mold A',
          backendDesignStatus: 'PendingDesign',
        }
      ],
      currentUser: { role: 'Engineering Supervisor' },
      updateQuotation: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <EngineeringTasksPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Daftar Tugas Desain')).toBeInTheDocument();
    expect(screen.getByText('Custom Mold A')).toBeInTheDocument();
    expect(screen.getByText('Input Desain')).toBeInTheDocument();
  });
});
