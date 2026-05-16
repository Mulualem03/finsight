import { Card } from '../components/Card';
import { SpendingChart } from '../components/SpendingChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { useByCategory, useForecast, useTrends } from '../hooks/useInsights';
import { formatMoney } from '../lib/format';

export function Insights() {
  const trends = useTrends();
  const byCategory = useByCategory();
  const forecast = useForecast();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Insights</h1>
        <p className="text-sm text-slate-500">How your money moves over time.</p>
      </header>

      <Card title="Spend & income, last 12 months">
        {trends.data ? <SpendingChart data={trends.data} /> : <div className="h-72 animate-pulse rounded-md bg-slate-100" />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="This month by category">
          {byCategory.data ? <CategoryBreakdown data={byCategory.data} /> : <div className="h-52 animate-pulse rounded-md bg-slate-100" />}
        </Card>

        <Card title="Month-end forecast">
          {forecast.data ? (
            <div>
              <div className="text-3xl font-semibold tabular-nums text-slate-900">
                {formatMoney(forecast.data.monthEndProjection)}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                You've spent {formatMoney(forecast.data.spentSoFar)} so far this month. Your 3-month rolling average is{' '}
                {formatMoney(forecast.data.rollingAverage)}.
              </p>
              <p className="mt-4 text-xs text-slate-400">{forecast.data.explanation}</p>
            </div>
          ) : <div className="h-32 animate-pulse rounded-md bg-slate-100" />}
        </Card>
      </div>
    </div>
  );
}
