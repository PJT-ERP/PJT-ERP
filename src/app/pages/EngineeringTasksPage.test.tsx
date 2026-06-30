import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { EngineeringTasksPage } from './EngineeringTasksPage';
import { useApp } from '../components/context/AppContext';

vi.mock('../components/context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('EngineeringTasksPage', () => {
  it('renders engineering queue for supervisor with Assignment capability', () => {
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
    // A supervisor sees the 'Tugaskan' button for pending_design
    expect(screen.getByText('Tugaskan')).toBeInTheDocument();
  });

  it('renders engineering queue for regular engineer without Assignment capability', () => {
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
          designAssignedTo: 'eng-1'
        }
      ],
      currentUser: { id: 'eng-1', role: 'Engineering' },
      updateQuotation: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <EngineeringTasksPage />
      </MemoryRouter>
    );
    // An engineer sees the 'Kerjakan' button for their assigned tasks
    expect(screen.getByText('Kerjakan')).toBeInTheDocument();
    expect(screen.queryByText('Tugaskan')).not.toBeInTheDocument();
  });
});
