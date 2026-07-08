import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomerList } from '../customer-list';
import { useApp } from '../../context/AppContext';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('CustomerList Edit', () => {
  it('allows editing a customer', async () => {
    const updateCustomerMock = vi.fn();
    const mockCustomers = [
      {
        code: 'CUST-001',
        name: 'Test Customer',
        contactPerson: 'Budi',
        contact: 'budi@test.com',
        phone: '0812345678',
        address: 'Jakarta',
        email: 'budi@test.com'
      }
    ];

    vi.mocked(useApp).mockReturnValue({
      customers: mockCustomers,
      salesOrders: [],
      addCustomer: vi.fn(),
      updateCustomer: updateCustomerMock,
    } as any);

    render(<CustomerList onNavigate={vi.fn()} />);

    // Click Edit button on the first customer
    // The button title is "Edit Pelanggan" in CustomerList
    const editBtn = screen.getByTitle('Edit Pelanggan');
    fireEvent.click(editBtn);

    // Verify modal is open and change the name
    const nameInput = screen.getByDisplayValue('Test Customer');
    fireEvent.change(nameInput, { target: { value: 'Test Customer Updated' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(saveBtn);

    // Verify API/update function is called
    await waitFor(() => {
      expect(updateCustomerMock).toHaveBeenCalledWith('CUST-001', expect.objectContaining({
        name: 'Test Customer Updated'
      }));
    });
  });
});
