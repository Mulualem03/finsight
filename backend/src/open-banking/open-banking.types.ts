// Provider-agnostic shapes for Open Banking AISP integrations.
// Each concrete provider (TrueLayer, Plaid, etc.) maps its native shapes
// to these before crossing into the service layer.

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ProviderAccount {
  providerAccountId: string;
  institutionId: string;
  institutionName: string;
  displayName: string;
  type: 'CURRENT' | 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  currency: string;
  /** Pence (minor units). */
  balance: bigint;
  availableBalance: bigint | null;
  accountNumberMasked: string | null;
  sortCode: string | null;
}

export interface ProviderTransaction {
  providerTransactionId: string;
  providerAccountId: string;
  bookedAt: Date;
  postedAt: Date | null;
  /** Pence. Positive = credit (money in), negative = debit (money out). */
  amount: bigint;
  currency: string;
  description: string;
  merchantName: string | null;
  mcc: string | null;
  /** Provider's own category hints; mapped to our taxonomy elsewhere. */
  classification: string[];
  /** Raw payload - retained in non-prod for replay; stripped in prod. */
  raw: Record<string, unknown>;
}

export interface OpenBankingProvider {
  /** OAuth2 authorisation URL with PKCE challenge baked in. */
  getAuthorisationUrl(state: string, pkceChallenge: string): string;

  /** Exchange the OAuth2 code (+ PKCE verifier) for a token set. */
  exchangeCode(code: string, pkceVerifier: string): Promise<TokenSet>;

  /** Use a refresh token to get a fresh access token. */
  refresh(refreshToken: string): Promise<TokenSet>;

  /** List all accounts visible to the access token. */
  listAccounts(accessToken: string): Promise<ProviderAccount[]>;

  /** List transactions for an account from a given date (inclusive). */
  listTransactions(
    accessToken: string,
    providerAccountId: string,
    from: Date,
  ): Promise<ProviderTransaction[]>;
}

export const OPEN_BANKING_PROVIDER = Symbol('OPEN_BANKING_PROVIDER');
