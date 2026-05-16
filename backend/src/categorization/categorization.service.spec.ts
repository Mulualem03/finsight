import { CategorizationService } from './categorization.service';
import { ProviderTransaction } from '../open-banking/open-banking.types';

const baseTx = (overrides: Partial<ProviderTransaction>): ProviderTransaction => ({
  providerTransactionId: 't1',
  providerAccountId: 'a1',
  bookedAt: new Date(),
  postedAt: null,
  amount: -500n,
  currency: 'GBP',
  description: '',
  merchantName: null,
  mcc: null,
  classification: [],
  raw: {},
  ...overrides,
});

describe('CategorizationService', () => {
  const service = new CategorizationService();

  describe('rule priority', () => {
    it('prefers user rules over global rules', () => {
      const result = service.categorise(
        baseTx({ description: 'TESCO STORES', merchantName: 'Tesco' }),
        [
          {
            id: 'r1',
            userId: 'u1',
            pattern: 'Tesco',
            categorySlug: 'shopping',
            priority: 1,
            createdAt: new Date(),
          },
        ],
      );
      // Without the user rule it would be 'groceries'
      expect(result).toBe('shopping');
    });

    it('falls through to global rules when no user rule matches', () => {
      expect(
        service.categorise(baseTx({ description: 'TFL TRAVEL CH', merchantName: 'TfL' }), []),
      ).toBe('transport');
    });

    it('uses provider classification when no rules match', () => {
      expect(
        service.categorise(
          baseTx({ description: 'OBSCURE THING', classification: ['Health and wellbeing'] }),
          [],
        ),
      ).toBe('health');
    });

    it('falls back to uncategorised', () => {
      expect(service.categorise(baseTx({ description: 'NO IDEA' }), [])).toBe('uncategorised');
    });
  });

  describe('safety', () => {
    it('survives an invalid user-supplied regex', () => {
      expect(() =>
        service.categorise(baseTx({ description: 'Anything' }), [
          {
            id: 'r1',
            userId: 'u1',
            pattern: '[invalid(regex',
            categorySlug: 'shopping',
            priority: 1,
            createdAt: new Date(),
          },
        ]),
      ).not.toThrow();
    });
  });
});
