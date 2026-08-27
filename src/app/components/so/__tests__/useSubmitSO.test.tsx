import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubmitSO } from '../hooks/useSubmitSO';
import { salesApi } from '../../../services/salesApi';
import { useSalesOrdersQuery, useProductsQuery } from '../../../services/queries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../services/queries', () => ({
  useSalesOrdersQuery: vi.fn(),
  useCustomersQuery: vi.fn().mockReturnValue({ data: [] }),
    useUsersQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcInspectionsQuery: vi.fn().mockReturnValue({ data: [] }),
    useQcQueuesQuery: vi.fn().mockReturnValue({ data: [] }),
  useProductsQuery: vi.fn(),
  useUpdateSalesOrderMutation: vi.fn().mockReturnValue({ mutate: vi.fn() }),
  useDeleteSalesOrderMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    createCompleteSalesOrder: vi.fn().mockResolvedValue({ id: 'SO-1', soNumber: 'SO-1' }),
  },
}));
vi.mock('../../context/hooks/dataMappers', () => ({
  mapSalesOrderDto: vi.fn().mockReturnValue({ id: 'SO-1' }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSubmitSO designStatus logic', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set PendingDesign if a custom product is included', async () => {
    vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [] } as any);
    vi.mocked(useProductsQuery).mockReturnValue({ data: [] } as any);

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
    vi.mocked(useProductsQuery).mockReturnValue({
      data: [{ id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part' }]
    } as any);
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'old-so-1',
          status: 'Waiting Pricing', // Passed Pending Design
          backendDesignStatus: 'Approved',
          items: [{ productId: 'prod-1' }]
        }
      ]
    } as any);

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
    vi.mocked(useProductsQuery).mockReturnValue({
      data: [{ id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part Without Design' }]
    } as any);
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        {
          id: 'old-so-1',
          status: 'Pending Design', // Still waiting for design!
          backendDesignStatus: null,
          items: [{ productId: 'prod-1' }]
        }
      ]
    } as any);

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
      vi.mocked(useProductsQuery).mockReturnValue({
        data: [{ id: 'prod-1', partNumber: 'PART-1', description: 'Existing Part' }]
      } as any);
      vi.mocked(useSalesOrdersQuery).mockReturnValue({
        data: [{ id: 'old-so-1', status: 'Waiting Pricing', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] }]
      } as any);

      const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
      // STRICT ASSERTION: Mixed orders MUST default to PendingDesign and include proper item properties
      expect(payload.order.items).toHaveLength(2);
      expect(payload.order.items[0].productTempId).toBeDefined();
      expect(payload.order.items[1].existingProductId).toBe('prod-1');
    });

    it('should set PendingDesign if two Existing products are selected, but one does NOT have an approved design', async () => {
      vi.mocked(useProductsQuery).mockReturnValue({
        data: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Unapproved' }
        ]
      } as any);
      vi.mocked(useSalesOrdersQuery).mockReturnValue({
        data: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Pending Design', backendDesignStatus: null, items: [{ productId: 'prod-2' }] }
        ]
      } as any);

      const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
      vi.mocked(useProductsQuery).mockReturnValue({
        data: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Approved 2' }
        ]
      } as any);
      vi.mocked(useSalesOrdersQuery).mockReturnValue({
        data: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-2' }] }
        ]
      } as any);

      const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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
      vi.mocked(useProductsQuery).mockReturnValue({
        data: [
          { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' },
          { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Approved 2' }
        ]
      } as any);
      vi.mocked(useSalesOrdersQuery).mockReturnValue({
        data: [
          { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
          { id: 'old-so-2', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-2' }] }
        ]
      } as any);

      const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

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

describe('useSubmitSO submitRepeatOrder designStatus logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCustomer = {
    id: 'C-1', code: 'C-1', name: 'Test', address: '', phone: '', email: '', company: '', contactPerson: '', contact: '', contactPhone: ''
  };

  it('should set Approved if no repeat products request a new design', async () => {
    vi.mocked(useProductsQuery).mockReturnValue({
      data: [{ id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' }]
    } as any);
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [{ id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] }]
    } as any);

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.submitRepeatOrder({
        repeatForm: { customerId: 'C-1', previousSoId: 'old-so-1', deadline: '2026-08-01', estimatedAmount: 0 },
        repeatProducts: [
          { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved 1', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' }
        ]
      }, mockCustomer);
    });

    const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
    expect(payload.order.designStatus).toBe('Approved');
    // STRICT ASSERTION: Repeat orders without new designs MUST be approved immediately
    expect(payload.order.items).toHaveLength(1);
    expect(payload.order.items[0].existingProductId).toBe('prod-1');
  });

  it('should set PendingDesign if at least one repeat product requests a new design', async () => {
    vi.mocked(useProductsQuery).mockReturnValue({
      data: [
        { id: 'prod-1', partNumber: 'PART-1', description: 'Existing Approved 1' },
        { id: 'prod-2', partNumber: 'PART-2', description: 'Existing Approved 2' }
      ]
    } as any);
    vi.mocked(useSalesOrdersQuery).mockReturnValue({
      data: [
        { id: 'old-so-1', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-1' }] },
        { id: 'old-so-2', status: 'Completed', backendDesignStatus: 'Approved', items: [{ productId: 'prod-2' }] }
      ]
    } as any);

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.submitRepeatOrder({
        repeatForm: { customerId: 'C-1', previousSoId: 'old-so-1', deadline: '2026-08-01', estimatedAmount: 0 },
        repeatProducts: [
          { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved 1', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' },
          { id: '2', type: 'existing', productName: 'PART-2 - Existing Approved 2', designId: 'none', quantity: '1', unitPrice: 0, unit: 'pcs' }
        ]
      }, mockCustomer);
    });

    const payload = vi.mocked(salesApi.createCompleteSalesOrder).mock.calls[0][0];
    expect(payload.order.designStatus).toBe('PendingDesign');
    // STRICT ASSERTION: If ANY product needs a design, the ENTIRE order goes to PendingDesign
    expect(payload.order.items[1].designReference).toBe('INTERNAL_DESIGN');
  });

  it('should handle API failures strictly and alert the user without setting submitted state', async () => {
    vi.mocked(useProductsQuery).mockReturnValue({ data: [] } as any);
    vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [] } as any);
    vi.mocked(salesApi.createCompleteSalesOrder).mockRejectedValueOnce(new Error("API Error"));
    
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSubmitSO(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.submitRepeatOrder({
        repeatForm: { customerId: 'C-1', previousSoId: 'old-so-1', deadline: '2026-08-01', estimatedAmount: 0 },
        repeatProducts: [
          { id: '1', type: 'existing', productName: 'PART-1 - Existing Approved 1', designId: '', quantity: '1', unitPrice: 0, unit: 'pcs' },
        ]
      }, mockCustomer);
    });

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("Gagal membuat Sales Order"));
    expect(result.current.submitted).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    
    alertMock.mockRestore();
  });
});
