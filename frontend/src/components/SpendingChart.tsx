import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { TrendPoint } from '../lib/types';
import { penceToPounds } from '../lib/format';

interface Props {
  data: TrendPoint[];
}

export function SpendingChart({ data }: Props) {
  const chartData = data.map((p) => ({
    month: format(parseISO(`${p.month}-01`), 'MMM'),
    Spend: penceToPounds(p.spend),
    Income: penceToPounds(p.income),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(v: number) => `£${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Spend" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
