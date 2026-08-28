import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../../../services/salesApi';

export const useAddSOCommentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salesOrderId, userId, userName, content }: { salesOrderId: string; userId: string; userName: string; content: string }) =>
      salesApi.addSalesOrderComment(salesOrderId, { userId, userName, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
  });
};

export const useUpdateSOCommentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salesOrderId, commentId, content }: { salesOrderId: string; commentId: string; content: string }) =>
      salesApi.updateSalesOrderComment(salesOrderId, commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
  });
};

export const useDeleteSOCommentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salesOrderId, commentId }: { salesOrderId: string; commentId: string }) =>
      salesApi.deleteSalesOrderComment(salesOrderId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
  });
};
