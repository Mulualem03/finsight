import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { BankConnection, Goal } from '../lib/types';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => api<Goal[]>('/goals'),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; targetAmount: number; deadline?: string }) =>
      api<Goal>('/goals', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; amount: number; note?: string }) =>
      api<Goal>(`/goals/${input.id}/contributions`, {
        method: 'POST',
        body: { amount: input.amount, note: input.note },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => api<BankConnection[]>('/open-banking/connections'),
  });
}

export function useStartConnect() {
  return useMutation({
    mutationFn: () =>
      api<{ authUrl: string; state: string }>('/open-banking/connect/start', { method: 'POST' }),
  });
}

export function useFinishConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; state: string }) =>
      api<{ connectionId: string; institutionName: string }>(
        '/open-banking/connect/callback',
        { method: 'POST', body: input },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ synced: number }>(`/open-banking/connections/${id}/sync`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
