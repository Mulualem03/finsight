import { Injectable } from '@nestjs/common';
import { UserCategoryRule } from '@prisma/client';
import { ProviderTransaction } from '../open-banking/open-banking.types';
import { GLOBAL_RULES } from './rules/global-rules';

const UNCATEGORISED = 'uncategorised';

@Injectable()
export class CategorizationService {
  /**
   * Pure-function categoriser. Evaluation order:
   *   1. User personal rules (priority asc, then created order)
   *   2. Global rules (curated list)
   *   3. Provider classification mapped to our taxonomy
   *   4. Fallback: "uncategorised"
   */
  categorise(tx: ProviderTransaction, userRules: UserCategoryRule[]): string {
    const merchant = tx.merchantName ?? '';
    const description = tx.description ?? '';

    // 1. User rules
    const haystack = `${merchant} ${description}`;
    for (const rule of userRules) {
      try {
        if (new RegExp(rule.pattern, 'i').test(haystack)) return rule.categorySlug;
      } catch {
        // Invalid regex stored - ignore. Validation should catch this on write.
      }
    }

    // 2. Global rules
    for (const rule of GLOBAL_RULES) {
      if (rule.match({ merchant, description, mcc: tx.mcc })) return rule.category;
    }

    // 3. Provider hints
    const mapped = mapProviderClassification(tx.classification);
    if (mapped) return mapped;

    return UNCATEGORISED;
  }
}

function mapProviderClassification(classification: string[]): string | null {
  if (classification.length === 0) return null;
  const first = classification[0].toLowerCase();
  if (first.includes('groceries') || first.includes('supermarket')) return 'groceries';
  if (first.includes('transport')) return 'transport';
  if (first.includes('eating') || first.includes('restaurant')) return 'eating_out';
  if (first.includes('shopping')) return 'shopping';
  if (first.includes('bill') || first.includes('utilit')) return 'bills';
  if (first.includes('travel')) return 'travel';
  if (first.includes('health')) return 'health';
  if (first.includes('income') || first.includes('salary')) return 'income';
  return null;
}
