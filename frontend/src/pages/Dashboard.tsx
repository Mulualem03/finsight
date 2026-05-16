import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card } from '../components/Card';
import { TransactionList } from '../components/TransactionList';
import { SpendingChart } from '../components/SpendingChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { useAccounts } from '../hooks/useAccounts';
import { useForecast, useInsightsSummary, useTrends } from '../hooks/useInsights';
import { useTransactions } from '../hooks/useTransactions';
import { formatMoney } from '../lib/format';

export function Dashboard() {
  const accounts = useAccounts();
  const summary = useInsightsSummary();
  const trends = useTrends();
  const forecast = useForecast();
  const recent = useTransactions({ pageSize: 8 });

  const totalBalancePence = (accounts.data ?? [])
    .filter((a) => a.type !== 'CREDIT_CARD' && a.type !== 'LOAN')
    .reduce((acc, a) => acc + BigInt(a.balance), 0n);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Hello.</h1>
        <p className="text-sm text-slate-500">Here's where your money is right now.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total balance">
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {accounts.isLoading ? '-' : formatMoney(totalBalancePence)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Across {accounts.data?.length ?? 0} accounts</p>
        </Card>
        <Card title="This month spend">
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {summary.isLoading ? '-' : formatMoney(summary.data?.thisMonth ?? '0')}
          </div>
          {summary.data?.changePct !== null && summary.data?.changePct !== undefined && (
            <p className="mt-1 flex items-center gap-1 text-xs">
              {summary.data.changePct >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-emerald-500" />
              )}
              <span className={summary.data.changePct >= 0 ? 'text-red-600' : 'text-emerald-600'}>
                {Math.abs(summary.data.changePct).toFixed(1)}%
              </span>
              <span className="text-slate-500">vs last month</span>
            </p>
          )}
        </Card>
        <Card title="Forecast (month-end)">
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {forecast.isLoading ? '-' : formatMoney(forecast.data?.monthEndProjection ?? '0')}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp className="h-3 w-3" /> Projection based on this month so far
          </p>
        </Card>
        <Card title="3-month average">
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {forecast.isLoading ? '-' : formatMoney(forecast.data?.rollingAverage ?? '0')}
          </div>
          <p className="mt-1 text-xs text-slate-500">Average monthly spend</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Spending trends" className="lg:col-span-2">
          {trends.data ? <SpendingChart data={trends.data} /> : <Skeleton />}
        </Card>
        <Card title="Where your money goes">
          {summary.data ? (
            <CategoryBreakdown
              data={summary.data.topCategories.map((c) => ({
                categorySlug: c.categorySlug,
                total: c.total,
                count: c.count,
              }))}
            />
          ) : <Skeleton />}
        </Card>
      </div>

      <Card
        title="Recent transactions"
        action={<Link to="/transactions" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>}
      >
        {recent.data ? (
          <TransactionList transactions={recent.data.items} emptyMessage="No transactions yet - connect a bank to get started." />
        ) : <Skeleton />}
      </Card>
    </div>
  );
}

function Skeleton() {
  return <div className="h-32 animate-pulse rounded-md bg-slate-100" />;
}
