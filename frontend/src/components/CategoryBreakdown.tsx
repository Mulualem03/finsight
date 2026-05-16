import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySpend } from '../lib/types';
import { formatMoney, penceToPounds } from '../lib/format';

const PALETTE = ['#0ea5e9', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16', '#6366f1', '#ef4444'];

interface Props {
  data: CategorySpend[];
}

export function CategoryBreakdown({ data }: Props) {
  if (data.length === 0) {
    return <div className="text-sm text-slate-500">No spend data yet.</div>;
  }

  const chartData = data.slice(0, 8).map((d, i) => ({
    name: d.categorySlug.replace('_', ' '),
    value: penceToPounds(d.total),
    raw: d.total,
    fill: PALETTE[i % PALETTE.length],
  }));
  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row">
      <div className="h-52 w-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="value" innerRadius={50} outerRadius={80} stroke="none">
              {chartData.map((d) => <Cell key={d.name} fill={d.fill} />)}
            </Pie>
            <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2">
        {chartData.map((d) => (
          <li key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
              <span className="capitalize text-slate-700">{d.name}</span>
            </span>
            <span className="flex items-baseline gap-2 tabular-nums">
              <span className="font-medium text-slate-900">{formatMoney(d.raw)}</span>
              <span className="text-xs text-slate-400">{total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
