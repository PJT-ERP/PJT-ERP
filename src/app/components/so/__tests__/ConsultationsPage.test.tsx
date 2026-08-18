import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsultationsPage } from '../ConsultationsPage';
import { salesApi } from '../../../services/salesApi';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    getConsultations: vi.fn(),
    updateConsultationStatus: vi.fn(),
  },
}));

describe('ConsultationsPage', () => {
  const mockConsultations = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '12345',
      serviceDescription: 'Service A',
      message: 'Hello',
      status: 'New',
      createdAtUtc: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@test.com',
      phone: '67890',
      serviceDescription: 'Service B',
      message: 'Hi there',
      status: 'Contacted',
      createdAtUtc: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (salesApi.getConsultations as any).mockImplementation(() => new Promise(() => {}));
    render(<ConsultationsPage />);
    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
  });

  it('fetches and renders consultations', async () => {
    (salesApi.getConsultations as any).mockResolvedValue(mockConsultations);
    render(<ConsultationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Service A')).toBeInTheDocument();
    expect(screen.getByText('Belum Dihubungi')).toBeInTheDocument();
    expect(screen.getByText('Sudah Dihubungi')).toBeInTheDocument();
  });

  it('filters consultations by search term', async () => {
    (salesApi.getConsultations as any).mockResolvedValue(mockConsultations);
    render(<ConsultationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari nama, email, atau layanan...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('updates consultation status', async () => {
    (salesApi.getConsultations as any).mockResolvedValue(mockConsultations);
    (salesApi.updateConsultationStatus as any).mockResolvedValue({});
    
    render(<ConsultationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const markContactedBtn = screen.getByText('Tandai Sudah Dihubungi');
    fireEvent.click(markContactedBtn);

    expect(salesApi.updateConsultationStatus).toHaveBeenCalledWith('1', 'Contacted');
    
    await waitFor(() => {
      expect(screen.queryByText('Tandai Sudah Dihubungi')).not.toBeInTheDocument();
      // Should now have 2 'Sudah Dihubungi' badges
      expect(screen.getAllByText('Sudah Dihubungi').length).toBe(2);
    });
  });
});
