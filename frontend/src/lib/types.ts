export interface AuthUser {
  id: string;
  email: string;
}

export interface Account {
  id: string;
  displayName: string;
  type: 'CURRENT' | 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  currency: string;
  balance: string; // pence as string (BigInt over the wire)
  availableBalance: string | null;
  accountNumberMasked: string | null;
  sortCode: string | null;
  institutionName: string;
  connectionStatus: 'ACTIVE' | 'REAUTH_REQUIRED' | 'REVOKED' | 'ERROR';
}

export interface Category {
  slug: string;
  name: string;
  icon: string | null;
  colour: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  bookedAt: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  currency: string;
  description: string;
  merchantName: string | null;
  notes: string | null;
  manuallyCategorised: boolean;
  category: Category;
}

export interface TransactionsPage {
  total: number;
  page: number;
  pageSize: number;
  items: Transaction[];
}

export interface InsightsSummary {
  thisMonth: string;
  lastMonth: string;
  changePct: number | null;
  topCategories: Array<{ categorySlug: string; total: string; count: number }>;
}

export interface CategorySpend {
  categorySlug: string;
  total: string;
  count: number;
}

export interface TrendPoint {
  month: string;
  spend: string;
  income: string;
}

export interface Forecast {
  monthEndProjection: string;
  spentSoFar: string;
  rollingAverage: string;
  explanation: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  saved: string;
  progress: number;
  deadline: string | null;
  linkedAccountId: string | null;
  createdAt: string;
  contributions: Array<{ id: string; amount: string; occurredAt: string; note: string | null }>;
}

export interface BankConnection {
  id: string;
  institutionName: string;
  status: 'ACTIVE' | 'REAUTH_REQUIRED' | 'REVOKED' | 'ERROR';
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}
