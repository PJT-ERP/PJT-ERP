import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from './salesApi';
import { purchasingApi } from './purchasingApi';
import { landingPageApi } from './landingPageApi';
import { mapCustomerDto, mapSalesOrderDto, mapPurchaseRequestDto } from '../components/context/hooks/dataMappers';

// -- CUSTOMERS --
export const useCustomersQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const data = await salesApi.listCustomers();
      return data.map(mapCustomerDto);
    },
    enabled,
  });
};

// -- PRODUCTS --
export const useProductsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await salesApi.listProducts();
    },
    enabled,
  });
};

// -- SALES ORDERS --
export const useSalesOrdersQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['salesOrders'],
    queryFn: async () => {
      const data = await salesApi.listSalesOrders();
      // Temporarily pass empty arrays for invoices, products, inventory to mapSalesOrderDto
      // For a full fix, the backend should return these flattened or we use dependent queries
      return data.map(dto => mapSalesOrderDto(dto));
    },
    enabled,
  });
};

export const useUpdateSalesOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.updateSalesOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
  });
};

export const useCreateCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCustomer: any) => salesApi.createCustomer(newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => salesApi.updateCustomer(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => salesApi.deleteCustomer(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

// -- PURCHASING REQUESTS --
export const usePurchasingRequestsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['purchasingRequests'],
    queryFn: async () => {
      const data = await purchasingApi.listPurchaseRequests();
      return data.map(dto => mapPurchaseRequestDto(dto, []));
    },
    enabled,
  });
};

// -- LANDING PAGE --
export const useLandingPageContentQuery = () => {
  return useQuery({
    queryKey: ['landingPageContent'],
    queryFn: async () => {
      const data = await landingPageApi.getLandingPageContent();
      return data;
    },
  });
};

export const useUpdateLandingPageContentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => landingPageApi.updateLandingPageContent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPageContent'] });
    },
  });
};
