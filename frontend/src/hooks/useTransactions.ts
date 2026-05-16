import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { Transaction, TransactionsPage } from '../lib/types';

export interface TransactionFilters {
  accountId?: string;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      api<TransactionsPage>('/transactions', {
        query: {
          accountId: filters.accountId,
          category: filters.category,
          from: filters.from,
          to: filters.to,
          search: filters.search,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

interface RecategoriseInput {
  id: string;
  category: string;
  rememberAsRule?: boolean;
}

export function useRecategorise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecategoriseInput) =>
      api<Transaction>(`/transactions/${input.id}`, {
        method: 'PATCH',
        body: { category: input.category, rememberAsRule: input.rememberAsRule },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
