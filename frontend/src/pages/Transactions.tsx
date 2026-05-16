import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card } from '../components/Card';
import { TransactionList } from '../components/TransactionList';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';

const CATEGORY_OPTIONS = [
  'income', 'housing', 'bills', 'subscriptions', 'groceries', 'eating_out',
  'transport', 'health', 'shopping', 'travel', 'transfer', 'cash', 'uncategorised',
];

export function Transactions() {
  const [params, setParams] = useSearchParams();
  const accounts = useAccounts();
  const [search, setSearch] = useState(params.get('search') ?? '');

  const filters = {
    accountId: params.get('accountId') ?? undefined,
    category: params.get('category') ?? undefined,
    search: params.get('search') ?? undefined,
    page: Number(params.get('page') ?? '1'),
    pageSize: 25,
  };

  const { data, isLoading } = useTransactions(filters);

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
        <p className="text-sm text-slate-500">Filter, search, and re-categorise.</p>
      </header>

      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search description or merchant"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFilter('search', search || null);
              }}
              className="input pl-8"
            />
          </div>
          <select
            value={filters.accountId ?? ''}
            onChange={(e) => setFilter('accountId', e.target.value || null)}
            className="input"
          >
            <option value="">All accounts</option>
            {accounts.data?.map((a) => (
              <option key={a.id} value={a.id}>{a.displayName}</option>
            ))}
          </select>
          <select
            value={filters.category ?? ''}
            onChange={(e) => setFilter('category', e.target.value || null)}
            className="input"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-md bg-slate-100" />
        ) : data ? (
          <>
            <TransactionList transactions={data.items} />
            {data.total > data.pageSize && (
              <Pagination
                page={data.page}
                totalPages={Math.ceil(data.total / data.pageSize)}
                onPage={setPage}
              />
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="btn-secondary disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-slate-500">Page {page} of {totalPages}</span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
