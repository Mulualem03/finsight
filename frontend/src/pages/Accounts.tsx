import { Card } from '../components/Card';
import { useAccounts } from '../hooks/useAccounts';
import { formatMoney } from '../lib/format';

export function Accounts() {
  const { data, isLoading } = useAccounts();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
        <p className="text-sm text-slate-500">All your linked accounts in one place.</p>
      </header>

      {isLoading && <div className="h-32 animate-pulse rounded-md bg-slate-100" />}

      {data && data.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          You haven't connected any banks yet.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((account) => (
          <Card key={account.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{account.institutionName}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{account.displayName}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {account.type.replace('_', ' ').toLowerCase()}
                  {account.accountNumberMasked && ` · ${account.accountNumberMasked}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">
                  {formatMoney(account.balance)}
                </div>
                {account.availableBalance && account.availableBalance !== account.balance && (
                  <div className="text-xs text-slate-500">
                    {formatMoney(account.availableBalance)} available
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
