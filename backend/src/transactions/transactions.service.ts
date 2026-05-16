import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { PrismaService } from '../database/prisma.service';
import { ListTransactionsQueryDto, UpdateTransactionDto } from './dto/transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListTransactionsQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      account: { bankConnection: { userId } },
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.category ? { categorySlug: q.category } : {}),
      ...(q.from || q.to
        ? {
            bookedAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { description: { contains: q.search, mode: 'insensitive' } },
              { merchantName: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { bookedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          account: { select: { displayName: true } },
          category: { select: { slug: true, name: true, icon: true, colour: true } },
        },
      }),
    ]);

    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map(serialise),
    };
  }

  async getOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, account: { bankConnection: { userId } } },
      include: {
        account: { select: { displayName: true } },
        category: { select: { slug: true, name: true, icon: true, colour: true } },
      },
    });
    if (!tx) throw new NotFoundException({ code: 'TX_NOT_FOUND', message: 'Transaction not found' });
    return serialise(tx);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, account: { bankConnection: { userId } } },
      select: { id: true, merchantName: true, description: true },
    });
    if (!tx) throw new NotFoundException({ code: 'TX_NOT_FOUND', message: 'Transaction not found' });

    const data: Prisma.TransactionUpdateInput = {};
    if (dto.category !== undefined) {
      data.category = { connect: { slug: dto.category } };
      data.manuallyCategorised = true;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        account: { select: { displayName: true } },
        category: { select: { slug: true, name: true, icon: true, colour: true } },
      },
    });

    if (dto.rememberAsRule && dto.category) {
      // Build a literal-anchored, escaped pattern from the merchant name (or description if empty).
      const seed = tx.merchantName?.trim() || tx.description.trim().split(/\s+/).slice(0, 3).join(' ');
      const pattern = escapeRegExp(seed);
      await this.prisma.userCategoryRule.create({
        data: {
          id: ulid(),
          userId,
          pattern,
          categorySlug: dto.category,
          priority: 50,
        },
      });
    }

    return serialise(updated);
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialise(t: {
  id: string;
  accountId: string;
  bookedAt: Date;
  amount: bigint;
  direction: string;
  currency: string;
  description: string;
  merchantName: string | null;
  notes: string | null;
  manuallyCategorised: boolean;
  account: { displayName: string };
  category: { slug: string; name: string; icon: string | null; colour: string | null };
}) {
  return {
    id: t.id,
    accountId: t.accountId,
    accountName: t.account.displayName,
    bookedAt: t.bookedAt.toISOString(),
    amount: t.amount.toString(),
    direction: t.direction,
    currency: t.currency,
    description: t.description,
    merchantName: t.merchantName,
    notes: t.notes,
    manuallyCategorised: t.manuallyCategorised,
    category: t.category,
  };
}
