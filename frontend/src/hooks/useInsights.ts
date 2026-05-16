import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { CategorySpend, Forecast, InsightsSummary, TrendPoint } from '../lib/types';

export function useInsightsSummary() {
  return useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: () => api<InsightsSummary>('/insights/summary'),
    staleTime: 5 * 60_000,
  });
}

export function useTrends() {
  return useQuery({
    queryKey: ['insights', 'trends'],
    queryFn: () => api<TrendPoint[]>('/insights/trends'),
    staleTime: 5 * 60_000,
  });
}

export function useByCategory(from?: string, to?: string) {
  return useQuery({
    queryKey: ['insights', 'by-category', from, to],
    queryFn: () => api<CategorySpend[]>('/insights/by-category', { query: { from, to } }),
    staleTime: 5 * 60_000,
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ['insights', 'forecast'],
    queryFn: () => api<Forecast>('/insights/forecast'),
    staleTime: 5 * 60_000,
  });
}
