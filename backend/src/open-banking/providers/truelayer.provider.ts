import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  OpenBankingProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenSet,
} from '../open-banking.types';

/**
 * TrueLayer Data API provider.
 *
 * Docs: https://docs.truelayer.com/docs/data-api
 *
 * Note: this implementation focuses on the happy path. A production-grade
 * version would also handle:
 *   - 401s by attempting a refresh and retrying once
 *   - 429s with respect for the Retry-After header
 *   - a circuit breaker (opossum) on the auth HTTP client
 *   - structured error mapping (provider error code → our error code)
 */
@Injectable()
export class TrueLayerProvider implements OpenBankingProvider {
  private readonly logger = new Logger(TrueLayerProvider.name);
  private readonly authHost: string;
  private readonly apiHost: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    const env = config.getOrThrow<'sandbox' | 'live'>('openBanking.trueLayer.environment');
    this.authHost = env === 'live' ? 'https://auth.truelayer.com' : 'https://auth.truelayer-sandbox.com';
    this.apiHost = env === 'live' ? 'https://api.truelayer.com' : 'https://api.truelayer-sandbox.com';
    this.clientId = config.getOrThrow<string>('openBanking.trueLayer.clientId');
    this.clientSecret = config.getOrThrow<string>('openBanking.trueLayer.clientSecret');
    this.redirectUri = config.getOrThrow<string>('openBanking.trueLayer.redirectUri');

    this.http = axios.create({ timeout: 10_000 });
  }

  getAuthorisationUrl(state: string, pkceChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'info accounts balance transactions cards offline_access',
      redirect_uri: this.redirectUri,
      providers: 'uk-cs-mock uk-ob-all',
      state,
      code_challenge: pkceChallenge,
      code_challenge_method: 'S256',
    });
    return `${this.authHost}/?${params.toString()}`;
  }

  async exchangeCode(code: string, pkceVerifier: string): Promise<TokenSet> {
    const { data } = await this.http.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(`${this.authHost}/connect/token`, new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
      code_verifier: pkceVerifier,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refresh(refreshToken: string): Promise<TokenSet> {
    const { data } = await this.http.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(`${this.authHost}/connect/token`, new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listAccounts(accessToken: string): Promise<ProviderAccount[]> {
    const { data } = await this.http.get<{ results: Array<TLAccount> }>(
      `${this.apiHost}/data/v1/accounts`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const accounts = await Promise.all(
      data.results.map(async (a) => {
        const balance = await this.fetchBalance(accessToken, a.account_id);
        return mapAccount(a, balance);
      }),
    );
    return accounts;
  }

  async listTransactions(
    accessToken: string,
    providerAccountId: string,
    from: Date,
  ): Promise<ProviderTransaction[]> {
    const url = `${this.apiHost}/data/v1/accounts/${providerAccountId}/transactions?from=${from.toISOString()}`;
    const { data } = await this.http
      .get<{ results: Array<TLTransaction> }>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .catch((err) => {
        this.logger.error({ err: err.message, providerAccountId }, 'TrueLayer transactions failed');
        throw new HttpException(
          { code: 'PROVIDER_ERROR', message: 'Could not fetch transactions' },
          502,
        );
      });

    return data.results.map((t) => mapTransaction(t, providerAccountId));
  }

  private async fetchBalance(accessToken: string, providerAccountId: string): Promise<TLBalance> {
    const { data } = await this.http.get<{ results: TLBalance[] }>(
      `${this.apiHost}/data/v1/accounts/${providerAccountId}/balance`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data.results[0];
  }
}

// ─── TrueLayer DTOs ────────────────────────────────────────────────────────

interface TLAccount {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  provider: { provider_id: string; display_name: string };
  account_number: { number: string; sort_code: string };
}

interface TLBalance {
  currency: string;
  available: number;
  current: number;
  overdraft: number;
}

interface TLTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  merchant_name?: string;
  meta?: { provider_id?: string };
  transaction_category?: string;
  transaction_classification?: string[];
  merchant_category_code?: string;
}

function mapAccount(a: TLAccount, balance: TLBalance): ProviderAccount {
  return {
    providerAccountId: a.account_id,
    institutionId: `ob-${a.provider.provider_id}`,
    institutionName: a.provider.display_name,
    displayName: a.display_name,
    type: mapAccountType(a.account_type),
    currency: a.currency,
    balance: BigInt(Math.round(balance.current * 100)),
    availableBalance: BigInt(Math.round(balance.available * 100)),
    accountNumberMasked: a.account_number?.number ? `****${a.account_number.number.slice(-4)}` : null,
    sortCode: a.account_number?.sort_code ?? null,
  };
}

function mapAccountType(t: string): ProviderAccount['type'] {
  switch (t.toUpperCase()) {
    case 'TRANSACTION':
      return 'CURRENT';
    case 'SAVINGS':
      return 'SAVINGS';
    case 'CREDIT_CARD':
      return 'CREDIT_CARD';
    case 'LOAN':
      return 'LOAN';
    default:
      return 'OTHER';
  }
}

function mapTransaction(t: TLTransaction, providerAccountId: string): ProviderTransaction {
  const signed = t.transaction_type === 'DEBIT' ? -Math.abs(t.amount) : Math.abs(t.amount);
  return {
    providerTransactionId: t.transaction_id,
    providerAccountId,
    bookedAt: new Date(t.timestamp),
    postedAt: new Date(t.timestamp),
    amount: BigInt(Math.round(signed * 100)),
    currency: t.currency,
    description: t.description,
    merchantName: t.merchant_name ?? null,
    mcc: t.merchant_category_code ?? null,
    classification: t.transaction_classification ?? (t.transaction_category ? [t.transaction_category] : []),
    raw: t as unknown as Record<string, unknown>,
  };
}
