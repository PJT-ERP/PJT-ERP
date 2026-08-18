import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateInvoice } from '../CreateInvoice';
import { useFinanceData } from '../useFinanceData';
import { useApp } from '../../context/AppContext';
import { financeApi } from '../../../services/financeApi';
import { salesApi } from '../../../services/salesApi';

vi.mock('../useFinanceData', () => ({
  useFinanceData: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/financeApi', () => ({
  financeApi: {
    createInvoice: vi.fn(),
  },
}));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    updateSalesOrderPricing: vi.fn(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));

describe('CreateInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidate = {
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-001',
    customerId: 'cust-1',
    customerCode: 'CUST-1',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    status: 'Waiting Payment',
    targetDate: '2026-08-01',
    items: [
      {
        salesOrderItemId: 'item-1',
        productId: 'prod-1',
        productDescription: 'Test Product',
        qty: 10,
        unitPrice: 5000,
        lineTotal: 50000,
      }
    ]
  };

  const setupMockData = () => {
    vi.mocked(useFinanceData).mockReturnValue({
      invoiceCandidates: [mockCandidate],
      refresh: vi.fn(),
    } as any);

    vi.mocked(useApp).mockReturnValue({
      salesOrders: [
        {
          id: 'so-1',
          backendId: 'so-1',
          soNumber: 'SO-001',
          isCostingCompleted: true,
          customerId: 'cust-1',
          customerName: 'Test Customer',
          status: 'Waiting Payment',
          deadline: '2026-08-01',
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              productName: 'Test Product',
              quantity: 10,
              unitPrice: 5000,
            }
          ]
        }
      ]
    } as any);
  };

  it('submits a full payment invoice correctly', async () => {
    setupMockData();
    vi.mocked(financeApi.createInvoice).mockResolvedValue({ invoiceNumber: 'INV-001' } as any);

    render(<CreateInvoice />);

    // Select the SO from combobox
    const soSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(soSelect, { target: { value: 'so-1' } });

    // The due date is auto-filled from targetDate (2026-08-01), wait for it
    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-08-01')).toBeInTheDocument();
    });

    // Default invoice type is Full Payment. Let's submit.
    const createBtn = screen.getByRole('button', { name: /Simpan Invoice/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(financeApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          salesOrderId: 'so-1',
          paymentSchedules: [
            {
              label: 'Full Payment',
              percentage: 100,
              dueDate: '2026-08-01'
            }
          ]
        })
      );
    });
  });

  it('submits a DP invoice correctly', async () => {
    setupMockData();
    vi.mocked(financeApi.createInvoice).mockResolvedValue({ invoiceNumber: 'INV-002' } as any);

    render(<CreateInvoice />);

    // Select the SO
    const soSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(soSelect, { target: { value: 'so-1' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-08-01')).toBeInTheDocument();
    });

    // Change to DP
    // There are multiple comboboxes: SO select, Payment Term, Type, DP %
    // We can select by looking for 'Tipe Pembayaran' next to it, but standard queries might be tricky.
    // Let's use getByDisplayValue since default is 'Full Payment'
    const typeSelect = screen.getByDisplayValue('Full Payment');
    fireEvent.change(typeSelect, { target: { value: 'Down Payment (DP)' } });

    // A new field 'Deadline DP' should appear. It's the 3rd date input on the page.
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const dpDeadlineInput = dateInputs[2];
    fireEvent.change(dpDeadlineInput, { target: { value: '2026-07-25' } });

    // Let's also change the DP % if possible. Default is 50. Let's change it to Custom.
    const dpPercentSelect = screen.getAllByRole('combobox')[3];
    fireEvent.change(dpPercentSelect, { target: { value: 'Custom' } });

    // Custom input appears
    const customDpInput = screen.getByPlaceholderText('%');
    fireEvent.change(customDpInput, { target: { value: '30' } });

    // Submit
    const createBtn = screen.getByRole('button', { name: /Simpan Invoice/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(financeApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          salesOrderId: 'so-1',
          dueDate: '2026-07-25', // Invoice due date becomes DP due date
          paymentSchedules: [
            {
              label: 'DP 30%',
              percentage: 30,
              dueDate: '2026-07-25'
            },
            {
              label: 'Pelunasan 70%',
              percentage: 70,
              dueDate: '2026-08-01'
            }
          ]
        })
      );
    });
  });

  it('hides Sales Orders that have not completed Penetapan Harga (Costing)', async () => {
    vi.mocked(useFinanceData).mockReturnValue({
      invoiceCandidates: [
        { ...mockCandidate, salesOrderId: 'so-1', salesOrderNumber: 'SO-001' },
        { ...mockCandidate, salesOrderId: 'so-2', salesOrderNumber: 'SO-002' }
      ],
      refresh: vi.fn(),
    } as any);

    vi.mocked(useApp).mockReturnValue({
      salesOrders: [
        {
          id: 'so-1',
          backendId: 'so-1',
          soNumber: 'SO-001',
          isCostingCompleted: true, // This one should show up
          status: 'Waiting Payment',
          items: []
        },
        {
          id: 'so-2',
          backendId: 'so-2',
          soNumber: 'SO-002',
          isCostingCompleted: false, // This one should be hidden
          status: 'Waiting Payment',
          items: []
        }
      ]
    } as any);

    render(<CreateInvoice />);

    // Check the options in the select dropdown
    const soSelect = screen.getAllByRole('combobox')[0];
    
    // so-1 should be in the document as an option text
    expect(screen.getByText(/SO-001/i)).toBeInTheDocument();
    
    // so-2 should NOT be in the document
    expect(screen.queryByText(/SO-002/i)).not.toBeInTheDocument();
  });

  it('prioritizes updated Sales Order pricing over stale Finance API pricing', async () => {
    vi.mocked(useFinanceData).mockReturnValue({
      invoiceCandidates: [
        { 
          ...mockCandidate, 
          salesOrderId: 'so-3', 
          salesOrderNumber: 'SO-003',
          items: [
            {
              salesOrderItemId: 'item-3',
              productId: 'prod-3',
              productDescription: 'Test Product 3',
              qty: 10,
              unitPrice: 11000, // Stale price from Finance API
              lineTotal: 110000,
            }
          ]
        }
      ],
      refresh: vi.fn(),
    } as any);

    vi.mocked(useApp).mockReturnValue({
      salesOrders: [
        {
          id: 'so-3',
          backendId: 'so-3',
          soNumber: 'SO-003',
          isCostingCompleted: true,
          status: 'Waiting Payment',
          items: [
            {
              id: 'item-3',
              productId: 'prod-3',
              productName: 'Test Product 3',
              quantity: 10,
              unitPrice: 14000 // Fresh price just updated by user (optimistic)
            }
          ]
        }
      ]
    } as any);

    render(<CreateInvoice />);

    // Select the SO
    const soSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(soSelect, { target: { value: 'so-3' } });

    // Wait for the invoice items to render and check that it uses 14,000 (not 11,000)
    await waitFor(() => {
      // It should display Rp 14.000 for the unit price
      expect(screen.getAllByText(/Rp\s*14\.000/i).length).toBeGreaterThan(0);
      
      // The subtotal should be 10 * 14.000 = 140.000
      expect(screen.getAllByText(/Rp\s*140\.000/i).length).toBeGreaterThan(0);
      
      // It should NOT display the stale 11.000 anywhere
      expect(screen.queryByText(/Rp\s*11\.000/i)).not.toBeInTheDocument();
    });
  });
});
