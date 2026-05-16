import { Injectable, BadRequestException } from '@nestjs/common';
import { addDays, differenceInDays, isAfter, subDays } from 'date-fns';
import {
  OpenBankingProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenSet,
} from '../open-banking.types';

/**
 * Mock AISP provider for offline development, demos, and tests.
 *
 * Generates a deterministic 90-day transaction history per access token
 * using a seeded PRNG (mulberry32) so the same token always produces the
 * same data - great for screenshots and tests that need stable fixtures.
 */
@Injectable()
export class MockProvider implements OpenBankingProvider {
  private static readonly MOCK_INSTITUTION = {
    id: 'ob-mock-lloyds',
    name: 'Lloyds Bank (Mock)',
  };

  private static readonly MERCHANTS: Array<{
    name: string;
    description: string;
    mcc: string;
    classification: string[];
    minPence: number;
    maxPence: number;
    /** approximate occurrences per 30 days */
    frequency: number;
  }> = [
    { name: 'Tesco', description: 'TESCO STORES 4521', mcc: '5411', classification: ['Groceries'], minPence: 800, maxPence: 6500, frequency: 8 },
    { name: 'Sainsbury\'s', description: 'SAINSBURYS S/MKTS', mcc: '5411', classification: ['Groceries'], minPence: 1200, maxPence: 7500, frequency: 4 },
    { name: 'TfL', description: 'TFL TRAVEL CH', mcc: '4111', classification: ['Transport'], minPence: 150, maxPence: 800, frequency: 18 },
    { name: 'Uber', description: 'UBER *TRIP HELP.UBER.', mcc: '4121', classification: ['Transport'], minPence: 600, maxPence: 4500, frequency: 4 },
    { name: 'Pret a Manger', description: 'PRET A MANGER', mcc: '5814', classification: ['Eating Out'], minPence: 500, maxPence: 1500, frequency: 8 },
    { name: 'Deliveroo', description: 'DELIVEROO.CO.UK', mcc: '5814', classification: ['Eating Out'], minPence: 1200, maxPence: 4500, frequency: 5 },
    { name: 'Costa', description: 'COSTA COFFEE', mcc: '5814', classification: ['Eating Out'], minPence: 250, maxPence: 700, frequency: 6 },
    { name: 'Amazon', description: 'AMAZON.CO.UK*', mcc: '5942', classification: ['Shopping'], minPence: 800, maxPence: 8500, frequency: 6 },
    { name: 'ASOS', description: 'ASOS.COM', mcc: '5651', classification: ['Shopping'], minPence: 2000, maxPence: 15000, frequency: 1 },
    { name: 'Netflix', description: 'NETFLIX.COM', mcc: '4899', classification: ['Subscriptions'], minPence: 1099, maxPence: 1099, frequency: 1 },
    { name: 'Spotify', description: 'SPOTIFY UK', mcc: '5815', classification: ['Subscriptions'], minPence: 1099, maxPence: 1099, frequency: 1 },
    { name: 'Vodafone', description: 'VODAFONE LTD', mcc: '4814', classification: ['Bills'], minPence: 1800, maxPence: 3500, frequency: 1 },
    { name: 'British Gas', description: 'BRITISH GAS', mcc: '4900', classification: ['Bills'], minPence: 4500, maxPence: 12000, frequency: 1 },
    { name: 'Octopus Energy', description: 'OCTOPUS ENERGY', mcc: '4900', classification: ['Bills'], minPence: 6000, maxPence: 15000, frequency: 1 },
    { name: 'Boots', description: 'BOOTS THE CHEMIST', mcc: '5912', classification: ['Health'], minPence: 400, maxPence: 3500, frequency: 2 },
    { name: 'PureGym', description: 'PUREGYM LTD', mcc: '7997', classification: ['Health'], minPence: 1999, maxPence: 1999, frequency: 1 },
  ];

  getAuthorisationUrl(state: string, _pkceChallenge: string): string {
    // In mock mode, "auth" is a no-op page on the frontend that immediately
    // calls back with a fake code. The frontend route /connect/mock handles it.
    const params = new URLSearchParams({ state, code: `mock_code_${Date.now()}` });
    return `/connect/mock?${params.toString()}`;
  }

  async exchangeCode(code: string, _pkceVerifier: string): Promise<TokenSet> {
    if (!code.startsWith('mock_code_')) {
      throw new BadRequestException({ code: 'INVALID_AUTH_CODE', message: 'Invalid mock auth code' });
    }
    return this.synthesiseTokenSet();
  }

  async refresh(_refreshToken: string): Promise<TokenSet> {
    return this.synthesiseTokenSet();
  }

  async listAccounts(accessToken: string): Promise<ProviderAccount[]> {
    const rng = mulberry32(hashToInt(accessToken));
    const startingBalancePence = 250_000n + BigInt(Math.floor(rng() * 200_000));
    const savingsBalancePence = 500_000n + BigInt(Math.floor(rng() * 800_000));

    return [
      {
        providerAccountId: `mock-current-${hashToInt(accessToken)}`,
        institutionId: MockProvider.MOCK_INSTITUTION.id,
        institutionName: MockProvider.MOCK_INSTITUTION.name,
        displayName: 'Classic Account',
        type: 'CURRENT',
        currency: 'GBP',
        balance: startingBalancePence,
        availableBalance: startingBalancePence,
        accountNumberMasked: '****1234',
        sortCode: '30-99-50',
      },
      {
        providerAccountId: `mock-savings-${hashToInt(accessToken)}`,
        institutionId: MockProvider.MOCK_INSTITUTION.id,
        institutionName: MockProvider.MOCK_INSTITUTION.name,
        displayName: 'Easy Saver',
        type: 'SAVINGS',
        currency: 'GBP',
        balance: savingsBalancePence,
        availableBalance: savingsBalancePence,
        accountNumberMasked: '****5678',
        sortCode: '30-99-50',
      },
    ];
  }

  async listTransactions(
    accessToken: string,
    providerAccountId: string,
    from: Date,
  ): Promise<ProviderTransaction[]> {
    const isSavings = providerAccountId.startsWith('mock-savings-');
    if (isSavings) {
      // Savings account: monthly inbound transfer, that's it.
      return this.generateSavingsTransactions(providerAccountId, from);
    }
    return this.generateCurrentAccountTransactions(accessToken, providerAccountId, from);
  }

  private generateCurrentAccountTransactions(
    accessToken: string,
    providerAccountId: string,
    from: Date,
  ): ProviderTransaction[] {
    const seed = hashToInt(accessToken + providerAccountId);
    const rng = mulberry32(seed);
    const today = new Date();
    const days = Math.min(differenceInDays(today, from), 90);
    if (days <= 0) return [];

    const txs: ProviderTransaction[] = [];

    // Recurring monthly salary on the 25th
    for (let monthsBack = 0; monthsBack < 4; monthsBack++) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthsBack, 25, 9, 0, 0);
      if (isAfter(date, from) && !isAfter(date, today)) {
        txs.push({
          providerTransactionId: `mock-tx-salary-${date.toISOString().slice(0, 7)}-${providerAccountId}`,
          providerAccountId,
          bookedAt: date,
          postedAt: date,
          amount: 285_000n + BigInt(Math.floor(rng() * 20_000)), // £2,850-£3,050
          currency: 'GBP',
          description: 'EMPLOYER PAYROLL',
          merchantName: 'Employer Ltd',
          mcc: null,
          classification: ['Income'],
          raw: { source: 'mock' },
        });
      }
    }

    // Rent on the 1st
    for (let monthsBack = 0; monthsBack < 4; monthsBack++) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1, 8, 0, 0);
      if (isAfter(date, from) && !isAfter(date, today)) {
        txs.push({
          providerTransactionId: `mock-tx-rent-${date.toISOString().slice(0, 7)}-${providerAccountId}`,
          providerAccountId,
          bookedAt: date,
          postedAt: date,
          amount: -125_000n,
          currency: 'GBP',
          description: 'STANDING ORDER LANDLORD',
          merchantName: 'Landlord SO',
          mcc: '6513',
          classification: ['Housing'],
          raw: { source: 'mock' },
        });
      }
    }

    // Random merchant transactions sampled by frequency
    for (let day = 0; day < days; day++) {
      const txDate = subDays(today, day);
      for (const m of MockProvider.MERCHANTS) {
        const prob = m.frequency / 30;
        if (rng() < prob) {
          const range = m.maxPence - m.minPence;
          const amount = BigInt(-(m.minPence + Math.floor(rng() * (range + 1))));
          txs.push({
            providerTransactionId: `mock-tx-${seed}-${day}-${m.name}-${Math.floor(rng() * 1e9)}`,
            providerAccountId,
            bookedAt: txDate,
            postedAt: txDate,
            amount,
            currency: 'GBP',
            description: m.description,
            merchantName: m.name,
            mcc: m.mcc,
            classification: m.classification,
            raw: { source: 'mock' },
          });
        }
      }
    }

    return txs.sort((a, b) => b.bookedAt.getTime() - a.bookedAt.getTime());
  }

  private generateSavingsTransactions(providerAccountId: string, from: Date): ProviderTransaction[] {
    const today = new Date();
    const txs: ProviderTransaction[] = [];
    for (let monthsBack = 0; monthsBack < 4; monthsBack++) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthsBack, 26, 9, 0, 0);
      if (isAfter(date, from) && !isAfter(date, today)) {
        txs.push({
          providerTransactionId: `mock-tx-saving-${date.toISOString().slice(0, 7)}-${providerAccountId}`,
          providerAccountId,
          bookedAt: date,
          postedAt: date,
          amount: 30_000n,
          currency: 'GBP',
          description: 'TRANSFER FROM CURRENT',
          merchantName: 'Self transfer',
          mcc: null,
          classification: ['Transfer'],
          raw: { source: 'mock' },
        });
      }
    }
    return txs;
  }

  private synthesiseTokenSet(): TokenSet {
    const accessToken = `mock_access_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const refreshToken = `mock_refresh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return {
      accessToken,
      refreshToken,
      expiresAt: addDays(new Date(), 90),
    };
  }
}

// ─── Tiny deterministic PRNG and string hash ──────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
