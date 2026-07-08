import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePurchaseRequestPage } from '../create-purchase-request-page';
import * as appContextHook from '../../context/AppContext';
import * as usePurchasingDataHook from '../usePurchasingData';
import { purchasingApi } from '../../../services/purchasingApi';
import { MemoryRouter } from 'react-router';
import React from 'react';

vi.mock('../../../services/purchasingApi', () => ({
  purchasingApi: {
    createPurchaseRequest: vi.fn().mockResolvedValue({ id: 'pr-new' }),
  }
}));

vi.mock('../../ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => {
    // Extract SelectItems from children
    const items: any[] = [];
    React.Children.forEach(children, child => {
      if (child?.type?.name === 'SelectContent') {
        React.Children.forEach(child.props.children, c => {
          if (c && c.type?.name === 'SelectItem') {
             items.push(c);
          } else if (Array.isArray(c)) {
             items.push(...c.filter((cc: any) => cc?.type?.name === 'SelectItem'));
          }
        });
      }
    });

    return (
      <select 
        data-testid="mock-select"
        value={value || ''} 
        onChange={e => onValueChange(e.target.value)}
      >
        <option value="">Select...</option>
        {items.map((item, i) => (
          <option key={i} value={item.props.value}>{item.props.children}</option>
        ))}
      </select>
    );
  },
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

describe('CreatePurchaseRequestPage', () => {
  const mockRefreshBackendData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(appContextHook, 'useApp').mockReturnValue({
      currentUser: { id: 'u1', name: 'Test User', role: 'Purchasing', backendId: 'b-user-1' },
      salesOrders: [
        { id: 'SO-101', soNumber: 'SO-101', description: 'Test Project SO', backendId: 'b-so-1' }
      ],
      refreshBackendData: mockRefreshBackendData,
    } as any);

    vi.spyOn(usePurchasingDataHook, 'usePurchasingData').mockReturnValue({
      inventoryItems: [
        { id: 'inv-1', code: 'MAT-1', name: 'Besi Beton', unit: 'batang', currentStock: 10 }
      ],
      refresh: vi.fn(),
      isLoading: false,
    } as any);
  });

  it('submits a manual PR without SO reference', async () => {
    render(
      <MemoryRouter>
        <CreatePurchaseRequestPage />
      </MemoryRouter>
    );

    // Select 'Tanpa SO'
    const selects = screen.getAllByTestId('mock-select');
    // First select is SO, Second is Priority, Third is Category (in items)
    fireEvent.change(selects[0], { target: { value: 'none' } });

    // Fill item
    const nameInputs = screen.getAllByPlaceholderText(/ketik/i);
    fireEvent.change(nameInputs[0], { target: { value: 'Semen' } });
    
    const qtyInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '50' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Ajukan PR/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(purchasingApi.createPurchaseRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          salesOrderId: null,
          salesOrderNumber: null,
          projectName: 'Manual Purchase Request',
          items: expect.arrayContaining([
            expect.objectContaining({
              itemName: 'Semen',
              qty: 50,
              purchaseCategory: 'Consumable'
            })
          ])
        })
      );
      expect(mockRefreshBackendData).toHaveBeenCalled();
    });
  });

  it('submits a PR with SO reference', async () => {
    render(
      <MemoryRouter>
        <CreatePurchaseRequestPage />
      </MemoryRouter>
    );

    // Select 'SO-101'
    const selects = screen.getAllByTestId('mock-select');
    fireEvent.change(selects[0], { target: { value: 'SO-101' } });

    // Fill item
    const nameInputs = screen.getAllByPlaceholderText(/ketik/i);
    fireEvent.change(nameInputs[0], { target: { value: 'Baja' } });
    
    const qtyInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '100' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Ajukan PR/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(purchasingApi.createPurchaseRequest).toHaveBeenCalled();
    });
    console.log('API CALLS:', vi.mocked(purchasingApi.createPurchaseRequest).mock.calls);
    expect(purchasingApi.createPurchaseRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        salesOrderId: 'b-so-1',
        salesOrderNumber: 'SO-101',
        projectName: 'SO-101 - Test Project SO',
        items: expect.arrayContaining([
          expect.objectContaining({
            itemName: 'Baja',
            qty: 100,
            purchaseCategory: 'Consumable'
          })
        ])
      })
    );
  });
});
