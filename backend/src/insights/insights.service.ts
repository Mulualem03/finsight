import { Injectable } from '@nestjs/common';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from '../database/prisma.service';

interface CategoryAgg {
  categorySlug: string;
  total: bigint;
  count: number;
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [thisMonth, lastMonth] = await Promise.all([
      this.totalSpend(userId, thisMonthStart, now),
      this.totalSpend(userId, lastMonthStart, lastMonthEnd),
    ]);

    const topCategories = await this.aggregateByCategory(userId, thisMonthStart, now);

    const deltaPct =
      lastMonth === 0n
        ? null
        : Number(((thisMonth - lastMonth) * 10000n) / (lastMonth === 0n ? 1n : lastMonth)) / 100;

    return {
      thisMonth: thisMonth.toString(),
      lastMonth: lastMonth.toString(),
      changePct: deltaPct,
      topCategories: topCategories.slice(0, 5).map(c => ({
        categorySlug: c.categorySlug,
        total: c.total.toString(),
        count: c.count,
      })),
    };
  }

  async byCategory(userId: string, from: Date, to: Date) {
    const rows = await this.aggregateByCategory(userId, from, to);
    return rows.map(r => ({ categorySlug: r.categorySlug, total: r.total.toString(), count: r.count }));
  }

  async trends(userId: string) {
    // 12 months back, by month
    const now = new Date();
    const start = startOfMonth(subMonths(now, 11));

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; spend: bigint; income: bigint }>>`
      SELECT
        DATE_TRUNC('month', t."bookedAt") AS month,
        COALESCE(SUM(CASE WHEN t."direction" = 'DEBIT' THEN -t."amount" ELSE 0 END), 0)::bigint AS spend,
        COALESCE(SUM(CASE WHEN t."direction" = 'CREDIT' THEN t."amount" ELSE 0 END), 0)::bigint AS income
      FROM transactions t
      JOIN accounts a ON a.id = t."accountId"
      JOIN bank_connections bc ON bc.id = a."bankConnectionId"
      WHERE bc."userId" = ${userId}
        AND t."bookedAt" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC;
    `;
    return rows.map(r => ({
      month: r.month.toISOString().slice(0, 7),
      spend: r.spend.toString(),
      income: r.income.toString(),
    }));
  }

  async forecast(userId: string) {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const elapsed = now.getDate();
    const totalDays = endOfMonth(now).getDate();

    const spent = await this.totalSpend(userId, thisMonthStart, now);
    // Naive linear projection
    const projected = totalDays > 0 ? (spent * BigInt(totalDays)) / BigInt(Math.max(elapsed, 1)) : spent;

    // Rolling 3-month average for an alternative "comfort" estimate
    const start = startOfMonth(subMonths(now, 3));
    const totalLast3 = await this.totalSpend(userId, start, thisMonthStart);
    const monthlyAvg = totalLast3 / 3n;

    return {
      monthEndProjection: projected.toString(),
      spentSoFar: spent.toString(),
      rollingAverage: monthlyAvg.toString(),
      explanation:
        'Projection extrapolates spend so far this month linearly to month-end. Rolling average is the last 3 months of spend, divided by 3.',
    };
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  private async totalSpend(userId: string, from: Date, to: Date): Promise<bigint> {
    const result = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        direction: 'DEBIT',
        bookedAt: { gte: from, lte: to },
        account: { bankConnection: { userId } },
      },
    });
    // amount is negative for debits; flip the sign for "spend"
    return -1n * (result._sum.amount ?? 0n);
  }

  private async aggregateByCategory(userId: string, from: Date, to: Date): Promise<CategoryAgg[]> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categorySlug'],
      _sum: { amount: true },
      _count: { _all: true },
      where: {
        direction: 'DEBIT',
        bookedAt: { gte: from, lte: to },
        account: { bankConnection: { userId } },
      },
    });
    return grouped
      .map(g => ({
        categorySlug: g.categorySlug,
        total: -1n * (g._sum.amount ?? 0n),
        count: g._count._all,
      }))
      .sort((a, b) => (a.total < b.total ? 1 : a.total > b.total ? -1 : 0));
  }
}
