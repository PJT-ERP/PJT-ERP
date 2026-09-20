import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './authApi';
import { salesApi } from './salesApi';
import { purchasingApi } from './purchasingApi';
import { landingPageApi } from './landingPageApi';
import { qcApi } from './qcApi';
import { productionApi } from './productionApi';
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
    staleTime: 30000,
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
    staleTime: 30000,
  });
};

// -- SALES ORDERS --
export const useSalesOrdersQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['salesOrders'],
    queryFn: async () => {
      const data = await salesApi.listSalesOrders();
      return data.map(mapSalesOrderDto);
    },
    enabled,
    staleTime: 30000,
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

export const useUpdateSalesOrderItemsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) => salesApi.updateSalesOrderItems(id, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
  });
};

export const useDeleteSalesOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesApi.deleteSalesOrder(id),
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
    staleTime: 30000,
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
    staleTime: 30000,
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

// -- QC INSPECTIONS --
export const useQcInspectionsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['qcInspections'],
    queryFn: async () => {
      const data = await qcApi.listInspections();
      return data;
    },
    enabled,
    staleTime: 30000,
  });
};

export const useQcQueuesQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['qcQueues'],
    queryFn: async () => {
      const data = await productionApi.getQcQueues();
      return {
        readyForInspection: (data.readyForInspection || []).map(dto => mapSalesOrderDto(dto)),
        inspectionHistory: (data.inspectionHistory || []).map(dto => mapSalesOrderDto(dto)),
      };
    },
    enabled,
    staleTime: 30000,
  });
};


// -- USERS --
export const useUsersQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await authApi.getUsers();
      return data;
    },
    enabled,
    staleTime: 60000,
  });
};

