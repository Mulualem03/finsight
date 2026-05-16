import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { bankConnection: { userId } },
      include: {
        bankConnection: { select: { institutionName: true, status: true } },
      },
      orderBy: [{ bankConnection: { institutionName: 'asc' } }, { displayName: 'asc' }],
    });
    return accounts.map(serialise);
  }

  async getOne(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, bankConnection: { userId } },
      include: {
        bankConnection: { select: { institutionName: true, status: true } },
      },
    });
    if (!account) {
      throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' });
    }
    return serialise(account);
  }
}

function serialise(a: {
  id: string;
  displayName: string;
  type: string;
  currency: string;
  balance: bigint;
  availableBalance: bigint | null;
  accountNumberMasked: string | null;
  sortCode: string | null;
  bankConnection: { institutionName: string; status: string };
}) {
  return {
    id: a.id,
    displayName: a.displayName,
    type: a.type,
    currency: a.currency,
    balance: a.balance.toString(),
    availableBalance: a.availableBalance?.toString() ?? null,
    accountNumberMasked: a.accountNumberMasked,
    sortCode: a.sortCode,
    institutionName: a.bankConnection.institutionName,
    connectionStatus: a.bankConnection.status,
  };
}
