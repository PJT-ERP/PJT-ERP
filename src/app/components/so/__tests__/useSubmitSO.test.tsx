import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubmitSO } from '../hooks/useSubmitSO';
import { useApp } from '../../context/AppContext';
import { salesApi } from '../../../services/salesApi';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    createCompleteSalesOrder: vi.fn().mockResolvedValue({ id: 'SO-1', soNumber: 'SO-1' }),
  },
}));
vi.mock('../../context/hooks/dataMappers', () => ({
  mapSalesOrderDto: vi.fn().mockReturnValue({ id: 'SO-1' }),
}));

describe('useSubmitSO designStatus logic', () => {
  const mockUpdateSalesOrder = vi.fn();
  const mockSetSalesOrders = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set PendingDesign if a custom product is included', async () => {
    vi.mocked(useApp).mockReturnValue({
      productCatalog: [],
      customers: [],
      salesOrders: [],
      updateSalesOrder: mockUpdateSalesOrder,
      setSalesOrders: mockSetSalesOrders,
      backendCustomerIdsByCode: {},
    } as any);

    const { result } = renderHook(() => useSubmitSO());

    await act(async () => {
      await result.current.submitNewOrder({
        customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
        products: [
          { id: '1', type: 'custom', productName: 'Custom Part', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' }
        ]
      });
    });

    const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
    expect(payload.order.designStatus).toBe('PendingDesign');
  });

  it('should set Approved if existing product is selected AND it has a historical approved design', async () => {
    vi.mocked(useApp).mockReturnValue({
      productCatalog: [
        { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part' }
      ],
      customers: [],
      salesOrders: [
        {
          id: 'old-so-1',
          status: 'Waiting Pricing', // Passed Pending Design
          backendDesignStatus: 'Approved',
          items: [{ productId: 'prod-1' }]
        }
      ],
      updateSalesOrder: mockUpdateSalesOrder,
      setSalesOrders: mockSetSalesOrders,
      backendCustomerIdsByCode: {},
    } as any);

    const { result } = renderHook(() => useSubmitSO());

    await act(async () => {
      await result.current.submitNewOrder({
        customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
        products: [
          { id: '2', type: 'existing', productName: 'PART-1 - Existing Part', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' }
        ]
      });
    });

    const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
    expect(payload.order.designStatus).toBe('Approved');
  });

  it('should set PendingDesign if existing product is selected BUT it has NO historical approved design (all Pending Design)', async () => {
    vi.mocked(useApp).mockReturnValue({
      productCatalog: [
        { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part Without Design' }
      ],
      customers: [],
      salesOrders: [
        {
          id: 'old-so-1',
          status: 'Pending Design', // Still waiting for design!
          backendDesignStatus: null,
          items: [{ productId: 'prod-1' }]
        }
      ],
      updateSalesOrder: mockUpdateSalesOrder,
      setSalesOrders: mockSetSalesOrders,
      backendCustomerIdsByCode: {},
    } as any);

    const { result } = renderHook(() => useSubmitSO());

    await act(async () => {
      await result.current.submitNewOrder({
        customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
        products: [
          { id: '3', type: 'existing', productName: 'PART-1 - Existing Part Without Design', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' }
        ]
      });
    });

    const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
    expect(payload.order.designStatus).toBe('PendingDesign');
  });

  describe('Multiple Products Scenarios', () => {
    it('should set PendingDesign if a mix of Custom and Existing (with approved design) is selected', async () => {
      vi.mocked(useApp).mockReturnValue({
        productCatalog: [{ id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part' }],
        customers: [],
        salesOrders: [
          { id: 'old-so-1', status: 'Waiting Pricing', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] }
        ],
        updateSalesOrder: mockUpdateSalesOrder,
        setSalesOrders: mockSetSalesOrders,
        backendCustomerIdsByCode: {},
      } as any);

      const { result } = renderHook(() => useSubmitSO());

      await act(async () => {
        await result.current.submitNewOrder({
          customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
          products: [
            { id: '1', type: 'custom', productName: 'Custom Part', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' },
            { id: '2', type: 'existing', productName: 'PART-1 - Existing Part', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' }
          ]
        });
      });

      const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
      expect(payload.order.designStatus).toBe('PendingDesign');
    });

    it('should set PendingDesign if two Existing products are selected, but one does NOT have an approved design', async () => {
      vi.mocked(useApp).mockReturnValue({
        productCatalog: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Unapproved' }
        ],
        customers: [],
        salesOrders: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Pending Design', backendDesignStatus: null, items: [{ productId: 'prod-2' }] }
        ],
        updateSalesOrder: mockUpdateSalesOrder,
        setSalesOrders: mockSetSalesOrders,
        backendCustomerIdsByCode: {},
      } as any);

      const { result } = renderHook(() => useSubmitSO());

      await act(async () => {
        await result.current.submitNewOrder({
          customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
          products: [
            { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' },
            { id: '2', type: 'existing', productName: 'PART-2 - Existing Unapproved', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' }
          ]
        });
      });

      const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
      expect(payload.order.designStatus).toBe('PendingDesign');
    });

    it('should set Approved if multiple Existing products are selected and ALL have approved designs', async () => {
      vi.mocked(useApp).mockReturnValue({
        productCatalog: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Approved 2' }
        ],
        customers: [],
        salesOrders: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-2' }] }
        ],
        updateSalesOrder: mockUpdateSalesOrder,
        setSalesOrders: mockSetSalesOrders,
        backendCustomerIdsByCode: {},
      } as any);

      const { result } = renderHook(() => useSubmitSO());

      await act(async () => {
        await result.current.submitNewOrder({
          customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
          products: [
            { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved 1', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' },
            { id: '2', type: 'existing', productName: 'PART-2 - Existing Approved 2', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' }
          ]
        });
      });

      const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
      expect(payload.order.designStatus).toBe('Approved');
    });

    it('should set PendingDesign if multiple Existing approved products are selected, but one checks "Request New Design"', async () => {
      vi.mocked(useApp).mockReturnValue({
        productCatalog: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Approved 2' }
        ],
        customers: [],
        salesOrders: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-2' }] }
        ],
        updateSalesOrder: mockUpdateSalesOrder,
        setSalesOrders: mockSetSalesOrders,
        backendCustomerIdsByCode: {},
      } as any);

      const { result } = renderHook(() => useSubmitSO());

      await act(async () => {
        await result.current.submitNewOrder({
          customerForm: { customerCode: 'C-1', customerName: 'Test', address: '', phone: '', email: '', company: '', estimatedAmount: 0, deadline: '' },
          products: [
            { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved 1', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' },
            { id: '2', type: 'existing', productName: 'PART-2 - Existing Approved 2', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' }
          ]
        });
      });

      const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
      expect(payload.order.designStatus).toBe('PendingDesign');
    });
  });
});
