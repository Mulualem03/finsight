import { useState } from 'react';
import clsx from 'clsx';
import { Pencil } from 'lucide-react';
import type { Transaction } from '../lib/types';
import { formatMoney, formatRelativeDate } from '../lib/format';
import { useRecategorise } from '../hooks/useTransactions';

const CATEGORY_OPTIONS = [
  'income', 'housing', 'bills', 'subscriptions', 'groceries', 'eating_out',
  'transport', 'health', 'shopping', 'travel', 'transfer', 'cash', 'uncategorised',
];

interface Props {
  transactions: Transaction[];
  emptyMessage?: string;
}

export function TransactionList({ transactions, emptyMessage = 'No transactions to show.' }: Props) {
  if (transactions.length === 0) {
    return <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {transactions.map((tx) => <Row key={tx.id} tx={tx} />)}
    </ul>
  );
}

function Row({ tx }: { tx: Transaction }) {
  const [editing, setEditing] = useState(false);
  const recategorise = useRecategorise();
  const isDebit = tx.direction === 'DEBIT';

  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base"
        style={{ backgroundColor: (tx.category.colour ?? '#e2e8f0') + '20' }}
      >
        <span>{tx.category.icon ?? '•'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {tx.merchantName ?? tx.description}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{formatRelativeDate(tx.bookedAt)}</span>
          <span>•</span>
          <span className="truncate">{tx.accountName}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <select
            className="input w-40 py-1 text-xs"
            defaultValue={tx.category.slug}
            onChange={(e) => {
              const next = e.target.value;
              recategorise.mutate({ id: tx.id, category: next, rememberAsRule: true });
              setEditing(false);
            }}
            onBlur={() => setEditing(false)}
            autoFocus
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="badge bg-slate-100 text-slate-700 hover:bg-slate-200"
            title="Re-categorise"
          >
            {tx.category.name}
            <Pencil className="h-3 w-3" />
          </button>
        )}
        <span
          className={clsx(
            'w-24 text-right font-mono text-sm tabular-nums',
            isDebit ? 'text-slate-900' : 'text-emerald-600',
          )}
        >
          {formatMoney(tx.amount, { signed: !isDebit })}
        </span>
      </div>
    </li>
  );
}
