import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankConnectionStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { ulid } from 'ulid';
import { PrismaService } from '../database/prisma.service';
import { CategorizationService } from '../categorization/categorization.service';
import {
  OPEN_BANKING_PROVIDER,
  OpenBankingProvider,
  ProviderAccount,
  ProviderTransaction,
} from './open-banking.types';
import { TokenCipher } from './token-cipher';

const STATE_TTL_SECONDS = 600;

interface PendingFlow {
  userId: string;
  pkceVerifier: string;
  expiresAt: number;
}

@Injectable()
export class OpenBankingService {
  private readonly logger = new Logger(OpenBankingService.name);
  // In-memory state store. In production this would be Redis.
  // Keyed by `state`, holds `{ userId, pkceVerifier, expiresAt }`.
  private readonly pendingFlows = new Map<string, PendingFlow>();

  constructor(
    @Inject(OPEN_BANKING_PROVIDER) private readonly provider: OpenBankingProvider,
    private readonly prisma: PrismaService,
    private readonly cipher: TokenCipher,
    private readonly categorizer: CategorizationService,
    private readonly config: ConfigService,
  ) {}

  // ─── OAuth flow ────────────────────────────────────────────────────────

  async startConnect(userId: string): Promise<{ authUrl: string; state: string }> {
    const state = randomBytes(24).toString('base64url');
    const pkceVerifier = randomBytes(48).toString('base64url');
    const pkceChallenge = createHash('sha256').update(pkceVerifier).digest('base64url');

    this.pendingFlows.set(state, {
      userId,
      pkceVerifier,
      expiresAt: Date.now() + STATE_TTL_SECONDS * 1000,
    });
    this.gcPendingFlows();

    const authUrl = this.provider.getAuthorisationUrl(state, pkceChallenge);
    return { authUrl, state };
  }

  async finishConnect(
    userId: string,
    code: string,
    state: string,
  ): Promise<{ connectionId: string; institutionName: string }> {
    const pending = this.pendingFlows.get(state);
    if (!pending) throw new BadRequestException({ code: 'INVALID_STATE', message: 'Unknown or expired flow' });
    this.pendingFlows.delete(state);
    if (pending.userId !== userId) throw new UnauthorizedException();
    if (pending.expiresAt < Date.now()) {
      throw new BadRequestException({ code: 'FLOW_EXPIRED', message: 'Connection flow expired' });
    }

    const tokens = await this.provider.exchangeCode(code, pending.pkceVerifier);
    const accounts = await this.provider.listAccounts(tokens.accessToken);
    if (accounts.length === 0) {
      throw new BadRequestException({ code: 'NO_ACCOUNTS', message: 'No accounts returned by provider' });
    }
    const institutionId = accounts[0].institutionId;
    const institutionName = accounts[0].institutionName;

    const providerName = this.config.getOrThrow<string>('openBanking.provider');
    const providerConnectionId = ulid(); // stable identifier we choose; providers don't always give one

    const connection = await this.prisma.bankConnection.create({
      data: {
        id: ulid(),
        userId,
        provider: providerName,
        providerConnectionId,
        institutionId,
        institutionName,
        encryptedAccessToken: this.cipher.encrypt(tokens.accessToken),
        encryptedRefreshToken: this.cipher.encrypt(tokens.refreshToken),
        accessTokenExpiresAt: tokens.expiresAt,
        status: BankConnectionStatus.ACTIVE,
      },
    });

    await this.upsertAccounts(connection.id, accounts);
    await this.syncTransactions(userId, connection.id);

    return { connectionId: connection.id, institutionName };
  }

  // ─── Connections ───────────────────────────────────────────────────────

  async listConnections(userId: string) {
    return this.prisma.bankConnection.findMany({
      where: { userId },
      select: {
        id: true,
        institutionName: true,
        status: true,
        lastSyncedAt: true,
        lastSyncError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, connectionId: string): Promise<void> {
    const conn = await this.prisma.bankConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.userId !== userId) {
      throw new NotFoundException({ code: 'CONNECTION_NOT_FOUND', message: 'Connection not found' });
    }
    await this.prisma.bankConnection.update({
      where: { id: connectionId },
      data: { status: BankConnectionStatus.REVOKED },
    });
  }

  // ─── Sync ──────────────────────────────────────────────────────────────

  async syncTransactions(userId: string, connectionId: string): Promise<{ synced: number }> {
    const connection = await this.prisma.bankConnection.findUnique({
      where: { id: connectionId },
      include: { accounts: true },
    });
    if (!connection || connection.userId !== userId) {
      throw new NotFoundException({ code: 'CONNECTION_NOT_FOUND', message: 'Connection not found' });
    }
    if (connection.status !== BankConnectionStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'CONNECTION_INACTIVE',
        message: 'This connection requires re-authentication',
      });
    }

    let accessToken = this.cipher.decrypt(connection.encryptedAccessToken);
    if (connection.accessTokenExpiresAt < new Date()) {
      const refresh = this.cipher.decrypt(connection.encryptedRefreshToken);
      const fresh = await this.provider.refresh(refresh);
      accessToken = fresh.accessToken;
      await this.prisma.bankConnection.update({
        where: { id: connection.id },
        data: {
          encryptedAccessToken: this.cipher.encrypt(fresh.accessToken),
          encryptedRefreshToken: this.cipher.encrypt(fresh.refreshToken),
          accessTokenExpiresAt: fresh.expiresAt,
        },
      });
    }

    let totalSynced = 0;

    for (const account of connection.accounts) {
      const lastTx = await this.prisma.transaction.findFirst({
        where: { accountId: account.id },
        orderBy: { bookedAt: 'desc' },
        select: { bookedAt: true },
      });
      const from = lastTx?.bookedAt ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const remoteTxs = await this.provider.listTransactions(
        accessToken,
        account.providerAccountId,
        from,
      );

      totalSynced += await this.persistTransactions(userId, account.id, remoteTxs);
    }

    await this.prisma.bankConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });

    return { synced: totalSynced };
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  private async upsertAccounts(connectionId: string, accounts: ProviderAccount[]): Promise<void> {
    for (const a of accounts) {
      await this.prisma.account.upsert({
        where: {
          bankConnectionId_providerAccountId: {
            bankConnectionId: connectionId,
            providerAccountId: a.providerAccountId,
          },
        },
        create: {
          id: ulid(),
          bankConnectionId: connectionId,
          providerAccountId: a.providerAccountId,
          displayName: a.displayName,
          type: a.type,
          currency: a.currency,
          balance: a.balance,
          availableBalance: a.availableBalance,
          accountNumberMasked: a.accountNumberMasked,
          sortCode: a.sortCode,
        },
        update: {
          displayName: a.displayName,
          balance: a.balance,
          availableBalance: a.availableBalance,
        },
      });
    }
  }

  private async persistTransactions(
    userId: string,
    accountId: string,
    remoteTxs: ProviderTransaction[],
  ): Promise<number> {
    if (remoteTxs.length === 0) return 0;

    // Pre-load user's personal rules once for the whole batch.
    const userRules = await this.prisma.userCategoryRule.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });

    let count = 0;
    for (const t of remoteTxs) {
      const categorySlug = this.categorizer.categorise(t, userRules);
      const direction = t.amount < 0n ? 'DEBIT' : 'CREDIT';

      const data: Prisma.TransactionCreateInput = {
        id: ulid(),
        providerTransactionId: t.providerTransactionId,
        bookedAt: t.bookedAt,
        postedAt: t.postedAt,
        amount: t.amount,
        direction,
        currency: t.currency,
        description: t.description,
        merchantName: t.merchantName,
        mcc: t.mcc,
        manuallyCategorised: false,
        rawPayload: this.config.get('nodeEnv') !== 'production' ? (t.raw as object) : Prisma.JsonNull,
        account: { connect: { id: accountId } },
        category: { connect: { slug: categorySlug } },
      };

      // upsert: if (accountId, providerTransactionId) already exists, do nothing.
      const result = await this.prisma.transaction.upsert({
        where: {
          accountId_providerTransactionId: {
            accountId,
            providerTransactionId: t.providerTransactionId,
          },
        },
        create: data,
        update: {
          // We update merchant data because providers correct it after the fact,
          // but we leave category alone if the user has manually set it.
          merchantName: t.merchantName,
          description: t.description,
        },
        select: { createdAt: true, updatedAt: true },
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) count++;
    }
    return count;
  }

  private gcPendingFlows(): void {
    const now = Date.now();
    for (const [k, v] of this.pendingFlows) {
      if (v.expiresAt < now) this.pendingFlows.delete(k);
    }
  }
}
