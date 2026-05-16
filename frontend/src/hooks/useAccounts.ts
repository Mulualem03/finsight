import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { Account } from '../lib/types';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api<Account[]>('/accounts'),
    staleTime: 30_000,
  });
}
